# Subscription Program (Anchor)

**Solana smart contract for recurring USDC payments using token delegation**

This Anchor program powers the subscription billing system in Recipe 03. It enables automatic recurring charges without requiring user signatures after the initial subscription - similar to how traditional SaaS billing works.

---

## Program Overview

| Property | Value |
|----------|-------|
| **Program ID** | `3kZ9Fdzadk8NXwjHaSabKrXBsU1y226BgXJdHZ78Qx4v` |
| **Network** | Solana Devnet |
| **Framework** | Anchor 0.31.1 |
| **Token** | USDC (SPL Token) |
| **Model** | Prepaid (first payment on subscription) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION ACCOUNT (PDA)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Seeds: ["subscription", user_wallet, merchant_wallet]                  │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │    authority     │  │    recipient     │  │  token_accounts  │       │
│  │  (user wallet)   │  │   (merchant)     │  │  (user + merch)  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  amount_per_period | interval_seconds | last_charge_timestamp   │   │
│  │  created_at | expires_at | is_active | total_charged | bump     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Token Delegation: User's USDC account delegated to this PDA           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Account Structure

```rust
#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub authority: Pubkey,              // User/subscriber wallet
    pub recipient: Pubkey,              // Merchant wallet
    pub user_token_account: Pubkey,     // User's USDC token account
    pub recipient_token_account: Pubkey, // Merchant's USDC token account
    pub token_mint: Pubkey,             // USDC mint address
    pub amount_per_period: u64,         // Charge amount (in token base units)
    pub interval_seconds: i64,          // Seconds between charges
    pub last_charge_timestamp: i64,     // Unix timestamp of last charge
    pub created_at: i64,                // Subscription creation time
    pub expires_at: Option<i64>,        // Optional expiry timestamp
    pub is_active: bool,                // Whether subscription is active
    pub total_charged: u64,             // Cumulative amount charged
    pub bump: u8,                       // PDA bump seed
}
```

---

## Instructions

### 1. `initialize_subscription`

Creates a new subscription and charges the first payment immediately (prepaid model).

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `amount_per_period` | `u64` | Amount to charge each period (in token base units) |
| `interval_seconds` | `i64` | Seconds between charges (e.g., 2592000 for 30 days) |
| `expires_at` | `Option<i64>` | Optional Unix timestamp when subscription ends |

**Accounts:**
```rust
#[derive(Accounts)]
pub struct InitializeSubscription<'info> {
    #[account(init, payer = payer, space = 8 + Subscription::INIT_SPACE,
        seeds = [b"subscription", authority.key().as_ref(), recipient.key().as_ref()],
        bump)]
    pub subscription: Account<'info, Subscription>,
    pub authority: Signer<'info>,           // User signing the transaction
    pub recipient: UncheckedAccount<'info>, // Merchant wallet
    #[account(mut)]
    pub user_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
    pub token_mint: UncheckedAccount<'info>,
    pub token_program: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,               // Pays for PDA rent
    pub system_program: Program<'info, System>,
}
```

**What it does:**
1. **Delegates token account** - Approves subscription PDA as delegate for user's token account
2. **Charges first payment** - Transfers `amount_per_period` from user to merchant immediately
3. **Initializes state** - Stores subscription details in the PDA

```rust
// Step 1: Delegate token account
let delegate_ix = token_instruction::approve(
    &ctx.accounts.token_program.key(),
    &ctx.accounts.user_token_account.key(),
    &ctx.accounts.subscription.key(),  // PDA becomes delegate
    &ctx.accounts.authority.key(),
    &[],
    u64::MAX,  // Unlimited delegation
)?;

// Step 2: Charge first payment
let transfer_ix = token_instruction::transfer(
    &ctx.accounts.token_program.key(),
    &ctx.accounts.user_token_account.key(),
    &ctx.accounts.recipient_token_account.key(),
    &subscription_key,
    &[],
    amount_per_period,
)?;

invoke_signed(&transfer_ix, accounts, signer_seeds)?;

// Step 3: Initialize state
subscription.last_charge_timestamp = clock.unix_timestamp;
subscription.total_charged = amount_per_period;
subscription.is_active = true;
```

---

### 2. `charge_subscription`

Charges a recurring payment. Called by the backend service - no user signature required.

**Accounts:**
```rust
#[derive(Accounts)]
pub struct ChargeSubscription<'info> {
    #[account(mut,
        seeds = [b"subscription", subscription.authority.as_ref(), subscription.recipient.as_ref()],
        bump = subscription.bump)]
    pub subscription: Account<'info, Subscription>,
    #[account(mut, constraint = user_token_account.key() == subscription.user_token_account)]
    pub user_token_account: UncheckedAccount<'info>,
    #[account(mut, constraint = recipient_token_account.key() == subscription.recipient_token_account)]
    pub recipient_token_account: UncheckedAccount<'info>,
    pub token_program: UncheckedAccount<'info>,
}
```

**Validation checks:**
1. Subscription must be active (`is_active == true`)
2. If `expires_at` is set, current time must be before expiry
3. Enough time must have passed since last charge (`time_since_last >= interval_seconds`)
4. Token accounts must be valid SPL token accounts

```rust
pub fn charge_subscription(ctx: Context<ChargeSubscription>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;
    let clock = Clock::get()?;

    // Validations
    require!(subscription.is_active, ErrorCode::SubscriptionInactive);

    if let Some(expires_at) = subscription.expires_at {
        require!(clock.unix_timestamp < expires_at, ErrorCode::SubscriptionExpired);
    }

    let time_since_last_charge = clock.unix_timestamp - subscription.last_charge_timestamp;
    require!(time_since_last_charge >= subscription.interval_seconds, ErrorCode::IntervalNotMet);

    // Transfer tokens using PDA as delegate
    let transfer_ix = token_instruction::transfer(...)?;
    invoke_signed(&transfer_ix, accounts, signer_seeds)?;

    // Update state
    subscription.last_charge_timestamp = clock.unix_timestamp;
    subscription.total_charged += subscription.amount_per_period;

    Ok(())
}
```

---

### 3. `cancel_subscription`

Cancels a subscription, revokes token delegation, and refunds PDA rent to user.

**Accounts:**
```rust
#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(mut,
        seeds = [b"subscription", subscription.authority.as_ref(), subscription.recipient.as_ref()],
        bump = subscription.bump,
        has_one = authority,
        close = authority)]  // Refunds rent to authority
    pub subscription: Account<'info, Subscription>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, constraint = user_token_account.key() == subscription.user_token_account)]
    pub user_token_account: UncheckedAccount<'info>,
    pub token_program: UncheckedAccount<'info>,
}
```

**What it does:**
1. **Revokes delegation** - Removes PDA's ability to transfer user's tokens
2. **Marks inactive** - Sets `is_active = false`
3. **Closes account** - Returns ~0.002 SOL rent to user

```rust
pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
    require!(ctx.accounts.subscription.is_active, ErrorCode::SubscriptionAlreadyCancelled);

    // Revoke token delegation
    let revoke_ix = token_instruction::revoke(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.user_token_account.key(),
        &ctx.accounts.authority.key(),
        &[],
    )?;
    invoke(&revoke_ix, accounts)?;

    // Mark inactive (account closes automatically via `close = authority`)
    ctx.accounts.subscription.is_active = false;

    Ok(())
}
```

---

### 4. `update_subscription`

Updates subscription parameters. Only the authority (user) can call this.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `new_amount` | `Option<u64>` | New charge amount |
| `new_interval` | `Option<i64>` | New interval in seconds |
| `new_expires_at` | `Option<i64>` | New expiry timestamp |

---

### 5. `cleanup_cancelled_subscription`

Migration helper for cleaning up cancelled subscriptions. Used for legacy data cleanup.

---

## Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Subscription is not active")]
    SubscriptionInactive,

    #[msg("Subscription has expired")]
    SubscriptionExpired,

    #[msg("Not enough time has passed since last charge")]
    IntervalNotMet,

    #[msg("Subscription already cancelled")]
    SubscriptionAlreadyCancelled,

    #[msg("Invalid token account - must be owned by Token Program")]
    InvalidTokenAccount,

    #[msg("Cannot cleanup - subscription is still active")]
    SubscriptionStillActive,
}
```

---

## PDA Derivation

The subscription account address is deterministically derived:

```typescript
// TypeScript
const [subscriptionPDA, bump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('subscription'),
    userWallet.toBuffer(),
    merchantWallet.toBuffer(),
  ],
  SUBSCRIPTION_PROGRAM_ID
);
```

```rust
// Rust
seeds = [
    b"subscription",
    authority.key().as_ref(),
    recipient.key().as_ref(),
]
```

This means:
- Each user can have one subscription per merchant
- The address is predictable (no need to store it separately)
- Anyone can derive and verify the subscription address

---

## Token Delegation Flow

```
┌─────────────┐                    ┌─────────────┐
│   User's    │ ──── Delegate ────▶│ Subscription│
│  USDC ATA   │                    │    PDA      │
└─────────────┘                    └─────────────┘
                                          │
                                          │ Can transfer
                                          │ on behalf of user
                                          ▼
                                   ┌─────────────┐
                                   │ Merchant's  │
                                   │  USDC ATA   │
                                   └─────────────┘
```

1. **On Subscribe**: User's token account delegates to subscription PDA
2. **On Charge**: PDA signs transfer instruction (no user signature needed)
3. **On Cancel**: Delegation is revoked

---

## Building & Deploying

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Build

```bash
cd program/subscription-program
anchor build
```

### Test

```bash
anchor test
```

### Deploy

```bash
# Configure for devnet
solana config set --url devnet

# Deploy
anchor deploy
```

---

## Frontend Integration

Example of calling the program from TypeScript:

```typescript
import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import * as crypto from 'crypto';

// Generate Anchor instruction discriminator
function getDiscriminator(name: string): Buffer {
  return crypto.createHash('sha256')
    .update(`global:${name}`)
    .digest()
    .slice(0, 8);
}

// Build initialize instruction
function buildInitializeIx(params: {
  subscription: PublicKey;
  authority: PublicKey;
  recipient: PublicKey;
  userTokenAccount: PublicKey;
  recipientTokenAccount: PublicKey;
  tokenMint: PublicKey;
  amount: number;
  interval: number;
  expiresAt?: number;
}): TransactionInstruction {
  const discriminator = getDiscriminator('initialize_subscription');

  const amountBuf = new BN(params.amount).toArrayLike(Buffer, 'le', 8);
  const intervalBuf = new BN(params.interval).toArrayLike(Buffer, 'le', 8);

  let data: Buffer;
  if (params.expiresAt) {
    data = Buffer.concat([
      discriminator,
      amountBuf,
      intervalBuf,
      Buffer.from([1]),  // has_expiry = true
      new BN(params.expiresAt).toArrayLike(Buffer, 'le', 8)
    ]);
  } else {
    data = Buffer.concat([
      discriminator,
      amountBuf,
      intervalBuf,
      Buffer.from([0])  // has_expiry = false
    ]);
  }

  return new TransactionInstruction({
    keys: [
      { pubkey: params.subscription, isSigner: false, isWritable: true },
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: params.recipient, isSigner: false, isWritable: false },
      { pubkey: params.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: params.recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: params.tokenMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: params.authority, isSigner: true, isWritable: true },  // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: SUBSCRIPTION_PROGRAM_ID,
    data,
  });
}
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Unlimited delegation** | Users must explicitly subscribe; can cancel anytime |
| **Merchant key security** | Store in secure vault (AWS KMS, etc.) in production |
| **Double charging** | Program checks `interval_seconds` has elapsed |
| **Expired subscriptions** | Program checks `expires_at` before charging |
| **PDA security** | Only derived addresses can sign; deterministic |

---

## Program Logs

The program emits helpful logs:

```
Subscription initialized with PREPAID model!
First payment charged: 100000 tokens
Next charge in 2592000 seconds (30 days)
Token account delegated to subscription PDA
```

```
Subscription charged!
Amount: 100000 tokens
Total charged: 200000 tokens
```

```
Subscription cancelled by user
Token delegation revoked
Account closed - rent refunded to user
```

---

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/docs)
- [SPL Token Program](https://spl.solana.com/token)
- [Solana Cookbook - PDAs](https://solanacookbook.com/core-concepts/pdas.html)
- [Token Delegation](https://spl.solana.com/token#authority-delegation)

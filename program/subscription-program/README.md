# Subscription Program (Anchor)

**Solana smart contract for recurring USDC payments using token delegation**

This Anchor program powers the subscription billing system in Recipe 03. It enables automatic recurring charges without requiring user signatures after the initial subscription - similar to how traditional SaaS billing works.

---

## Why This Program?

This program demonstrates how **LazorKit can be integrated with complex on-chain programs** to build real-world applications. By combining LazorKit's passkey authentication and gasless transactions with custom Anchor programs, developers can create sophisticated blockchain applications while maintaining a seamless user experience.

The subscription service showcases:
- **Token delegation** for automatic recurring payments (no user signature needed after initial setup)
- **PDA-based state management** for secure subscription storage
- **Prepaid billing model** similar to traditional SaaS platforms
- **Complete lifecycle management** (create, charge, cancel, update)

> **⚠️ Important: Devnet Deployment**
>
> This program is currently deployed on **Solana Devnet** and should be considered a **proof-of-concept**. Before deploying to Mainnet:
>
> 1. **Security Audit Required**: The program should undergo a professional security audit to identify and fix any vulnerabilities
> 2. **Upgrade Authority**: After successful audit, the **upgrade authority can be revoked** to make the program fully trustless and immutable
> 3. **Production Hardening**: Additional security measures, monitoring, and error handling should be implemented

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

The `Subscription` account stores all state for a user's subscription:

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | User/subscriber wallet |
| `recipient` | `Pubkey` | Merchant wallet |
| `user_token_account` | `Pubkey` | User's USDC token account |
| `recipient_token_account` | `Pubkey` | Merchant's USDC token account |
| `token_mint` | `Pubkey` | USDC mint address |
| `amount_per_period` | `u64` | Charge amount (in token base units) |
| `interval_seconds` | `i64` | Seconds between charges |
| `last_charge_timestamp` | `i64` | Unix timestamp of last charge |
| `created_at` | `i64` | Subscription creation time |
| `expires_at` | `Option<i64>` | Optional expiry timestamp |
| `is_active` | `bool` | Whether subscription is active |
| `total_charged` | `u64` | Cumulative amount charged |
| `bump` | `u8` | PDA bump seed |

> **Source**: See the `Subscription` struct in [`lib.rs`](programs/subscription-program/src/lib.rs)

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

**What it does:**
1. **Delegates token account** - Approves subscription PDA as delegate for user's token account
2. **Charges first payment** - Transfers `amount_per_period` from user to merchant immediately
3. **Initializes state** - Stores subscription details in the PDA

**Core Logic** (token delegation and first charge):

```rust
// Delegate user's token account to subscription PDA
let delegate_ix = token_instruction::approve(
    &ctx.accounts.token_program.key(),
    &ctx.accounts.user_token_account.key(),
    &ctx.accounts.subscription.key(),  // PDA becomes delegate
    &ctx.accounts.authority.key(),
    &[],
    u64::MAX,  // Unlimited delegation
)?;

// Charge first payment using PDA as delegate
let transfer_ix = token_instruction::transfer(
    &ctx.accounts.token_program.key(),
    &ctx.accounts.user_token_account.key(),
    &ctx.accounts.recipient_token_account.key(),
    &subscription_key,
    &[],
    amount_per_period,
)?;
invoke_signed(&transfer_ix, accounts, signer_seeds)?;
```

> **Source**: See `initialize_subscription()` and `InitializeSubscription` accounts in [`lib.rs`](programs/subscription-program/src/lib.rs)

---

### 2. `charge_subscription`

Charges a recurring payment. Called by the backend service - **no user signature required** (uses token delegation).

**Validation checks:**
1. Subscription must be active (`is_active == true`)
2. If `expires_at` is set, current time must be before expiry
3. Enough time must have passed since last charge (`time_since_last >= interval_seconds`)
4. Token accounts must be valid SPL token accounts

**Core Logic:**

```rust
// Validations
require!(subscription.is_active, ErrorCode::SubscriptionInactive);

if let Some(expires_at) = subscription.expires_at {
    require!(clock.unix_timestamp < expires_at, ErrorCode::SubscriptionExpired);
}

let time_since_last_charge = clock.unix_timestamp - subscription.last_charge_timestamp;
require!(time_since_last_charge >= subscription.interval_seconds, ErrorCode::IntervalNotMet);

// Transfer tokens using PDA as delegate (no user signature needed!)
invoke_signed(&transfer_ix, accounts, signer_seeds)?;

// Update state
subscription.last_charge_timestamp = clock.unix_timestamp;
subscription.total_charged += subscription.amount_per_period;
```

> **Source**: See `charge_subscription()` in [`lib.rs`](programs/subscription-program/src/lib.rs)

---

### 3. `cancel_subscription`

Cancels a subscription, revokes token delegation, and refunds PDA rent to user.

**What it does:**
1. **Revokes delegation** - Removes PDA's ability to transfer user's tokens
2. **Marks inactive** - Sets `is_active = false`
3. **Closes account** - Returns ~0.002 SOL rent to user (via Anchor's `close` constraint)

**Core Logic:**

```rust
require!(subscription.is_active, ErrorCode::SubscriptionAlreadyCancelled);

// Revoke token delegation - user regains full control
let revoke_ix = token_instruction::revoke(
    &ctx.accounts.token_program.key(),
    &ctx.accounts.user_token_account.key(),
    &ctx.accounts.authority.key(),
    &[],
)?;
invoke(&revoke_ix, accounts)?;

// Mark inactive (account closes automatically via `close = authority`)
subscription.is_active = false;
```

> **Source**: See `cancel_subscription()` in [`lib.rs`](programs/subscription-program/src/lib.rs)

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

The cookbook includes a complete TypeScript helper library for interacting with this program.

**Key Functions:**

| Function | Description |
|----------|-------------|
| `getSubscriptionPDA()` | Derives the subscription account address |
| `buildInitializeSubscriptionIx()` | Builds the initialize instruction with all required accounts |
| `buildCancelSubscriptionIx()` | Builds the cancel instruction |
| `hasActiveSubscription()` | Checks if user has an active subscription |
| `getUSDCBalance()` | Fetches user's USDC balance |

**Example Usage:**

```typescript
import { buildInitializeSubscriptionIx } from '@/lib/program/subscription-service';

// Build subscription instructions
const instructions = await buildInitializeSubscriptionIx({
  userWallet,
  amountPerPeriod: 0.10,      // $0.10 USDC
  intervalSeconds: 2592000,    // 30 days
  expiresAt: undefined,        // No expiry
}, connection);

// Send via LazorKit (gasless!)
const signature = await signAndSendTransaction({ instructions });
```

> **Source**: See the full TypeScript helper library at [`subscription-service.ts`](../../app/lib/program/subscription-service.ts)

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

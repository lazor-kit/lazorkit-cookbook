# Recipe 03: Subscription Service

**Build blockchain-native recurring payments - like Netflix/Spotify, but on Solana**

This advanced recipe demonstrates how to create a complete subscription billing system on Solana. Users authorize automatic USDC payments, and your backend charges them periodically - all without requiring user interaction after the initial signup.

---

## What You'll Learn

- Implement token delegation for automatic charging
- Build a custom Anchor program for subscriptions
- Create subscription management UI (subscribe, view, cancel)
- Build a backend service for recurring charges
- Handle the complete subscription lifecycle

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐ │
│  │   User UI   │───▶│  LazorKit    │───▶│  Solana Program (Anchor)│ │
│  │  (Next.js)  │    │  (Gasless)   │    │  - Initialize Sub       │ │
│  └─────────────┘    └──────────────┘    │  - Cancel Sub           │ │
│                                          └─────────────────────────┘ │
│                                                      ▲                │
│                                                      │                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Backend Job (API Route)                    │    │
│  │  - Scans all subscriptions on-chain                          │    │
│  │  - Charges due subscriptions automatically                   │    │
│  │  - No user signature required (uses token delegation)        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### Token Delegation
When a user subscribes, they delegate their USDC token account to the subscription PDA (Program Derived Address). This allows the program to transfer tokens on their behalf without requiring a new signature each time.

```rust
// In the Anchor program
let delegate_ix = token_instruction::approve(
    &ctx.accounts.token_program.key(),
    &ctx.accounts.user_token_account.key(),
    &ctx.accounts.subscription.key(),  // PDA becomes delegate
    &ctx.accounts.authority.key(),
    &[],
    u64::MAX,  // Unlimited delegation
)?;
```

### Program Derived Addresses (PDAs)
Each subscription is stored in a unique PDA derived from:
- The word "subscription"
- User's wallet address
- Merchant's wallet address

```typescript
const [subscriptionPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('subscription'),
    userWallet.toBuffer(),
    merchantWallet.toBuffer(),
  ],
  SUBSCRIPTION_PROGRAM_ID
);
```

### Prepaid Model
Our subscription uses a **prepaid model**:
1. First payment is charged immediately on subscription
2. `last_charge_timestamp` is set to the current time
3. Next charge occurs after `interval_seconds` has passed

---

## Prerequisites

- Completed [Recipe 01](../01-passkey-wallet-basics/README.md) and [Recipe 02](../02-gasless-transfer/README.md)
- Understanding of Solana PDAs and SPL tokens
- (Optional) Anchor framework knowledge for program modifications

---

## Project Structure

```
03-subscription-service/
├── subscribe/
│   └── page.tsx          # Plan selection & subscription creation
├── dashboard/
│   └── page.tsx          # Subscription management UI
└── README.md             # This tutorial

# Related files in the app:
lib/
├── constants.ts          # Subscription plans configuration
└── program/
    └── subscription-service.ts  # On-chain program helpers

api/
└── charge-subscriptions/
    └── route.ts          # Backend charging job
```

---

## Step 1: Define Subscription Plans

Create a configuration file for your subscription plans:

```typescript
// lib/constants.ts
export interface PlanFeatures {
  id: string;
  name: string;
  displayName: string;
  price: number;           // in USDC
  priceDisplay: string;
  interval: number;        // in seconds
  intervalDisplay: string;
  popular?: boolean;
  features: string[];
}

export const PLANS: Record<string, PlanFeatures> = {
  test: {
    id: 'test',
    name: 'Test',
    displayName: 'Test Plan',
    price: 0.01,
    priceDisplay: '$0.01',
    interval: 60,           // 1 minute for testing
    intervalDisplay: 'minute',
    features: [
      'Prepaid - first payment charged now',
      'Automatic recurring billing',
      'Zero gas fees',
      'Cancel anytime (refund setup fee)',
    ]
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    displayName: 'Basic Plan',
    price: 0.1,
    priceDisplay: '$0.10',
    interval: 30 * 24 * 60 * 60,  // 30 days
    intervalDisplay: 'month',
    features: [/* ... */]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    displayName: 'Pro Plan',
    price: 0.2,
    priceDisplay: '$0.20',
    interval: 30 * 24 * 60 * 60,
    intervalDisplay: 'month',
    popular: true,
    features: [/* ... */]
  }
};

export const SUBSCRIPTION_CONSTANTS = {
  NETWORK: 'devnet' as const,
  RPC_URL: 'https://api.devnet.solana.com',
  COMPUTE_UNIT_LIMIT: 600_000,
  SETUP_FEE_SOL: 0.002,  // PDA rent cost
};
```

---

## Step 2: Build the Program Helpers

Create helper functions to interact with the Anchor program:

```typescript
// lib/program/subscription-service.ts
import { PublicKey, TransactionInstruction, Connection, SystemProgram } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import * as crypto from 'crypto';

export const SUBSCRIPTION_PROGRAM_ID = new PublicKey(
  '3kZ9Fdzadk8NXwjHaSabKrXBsU1y226BgXJdHZ78Qx4v'
);

export const USDC_MINT = new PublicKey(
  '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'  // Devnet USDC
);

export const MERCHANT_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_MERCHANT_WALLET || 'CRZUdacW3tzgDvPiEPeiXCsNzVtSBCgztuUwPwNz1JYv'
);

// Derive subscription PDA
export function getSubscriptionPDA(
  authority: PublicKey,
  recipient: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('subscription'),
      authority.toBuffer(),
      recipient.toBuffer(),
    ],
    SUBSCRIPTION_PROGRAM_ID
  );
}

// Generate Anchor instruction discriminator
function getInstructionDiscriminator(name: string): Buffer {
  const preimage = `global:${name}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return hash.slice(0, 8);
}

// Build initialize subscription instruction
export async function buildInitializeSubscriptionIx(
  params: {
    userWallet: PublicKey;
    amountPerPeriod: number;
    intervalSeconds: number;
    expiresAt?: number;
  },
  connection: Connection
): Promise<TransactionInstruction[]> {
  const { userWallet, amountPerPeriod, intervalSeconds, expiresAt } = params;
  const instructions: TransactionInstruction[] = [];

  // Derive token accounts
  const userTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, userWallet);
  const merchantTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, MERCHANT_WALLET);
  const [subscriptionPDA] = getSubscriptionPDA(userWallet, MERCHANT_WALLET);

  // Check if subscription already exists
  const subAccount = await connection.getAccountInfo(subscriptionPDA);
  if (subAccount) {
    throw new Error('Subscription already exists!');
  }

  // Encode instruction data
  const discriminator = getInstructionDiscriminator('initialize_subscription');
  const amountBuf = new BN(amountPerPeriod * 1_000_000).toArrayLike(Buffer, 'le', 8);
  const intervalBuf = new BN(intervalSeconds).toArrayLike(Buffer, 'le', 8);

  let data: Buffer;
  if (expiresAt) {
    const hasExpiryBuf = Buffer.from([1]);
    const expiryBuf = new BN(expiresAt).toArrayLike(Buffer, 'le', 8);
    data = Buffer.concat([discriminator, amountBuf, intervalBuf, hasExpiryBuf, expiryBuf]);
  } else {
    const hasExpiryBuf = Buffer.from([0]);
    data = Buffer.concat([discriminator, amountBuf, intervalBuf, hasExpiryBuf]);
  }

  // Build instruction
  const subscriptionIx = new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPDA, isSigner: false, isWritable: true },
      { pubkey: userWallet, isSigner: true, isWritable: false },
      { pubkey: MERCHANT_WALLET, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: SUBSCRIPTION_PROGRAM_ID,
    data,
  });

  instructions.push(subscriptionIx);
  return instructions;
}
```

---

## Step 3: Create the Subscribe Page

Build the plan selection and subscription UI:

```typescript
// subscribe/page.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import { PublicKey, Connection } from '@solana/web3.js';
import { buildInitializeSubscriptionIx } from '@/lib/program/subscription-service';
import { getAllPlans, SUBSCRIPTION_CONSTANTS, PlanFeatures } from '@/lib/constants';

export default function SubscribePage() {
  const { isConnected, wallet, signAndSendTransaction, connect } = useWallet();
  const router = useRouter();
  const [subscribing, setSubscribing] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState<number>(12);  // months

  const plans = getAllPlans();

  const handleSubscribe = async (plan: PlanFeatures) => {
    if (!wallet) return;

    setSubscribing(true);
    try {
      const userWallet = new PublicKey(wallet.smartWallet);
      const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);

      // Calculate expiry timestamp
      const expiresAt = selectedExpiry === 0
        ? undefined
        : Math.floor(Date.now() / 1000) + (selectedExpiry * 30 * 24 * 60 * 60);

      // Build subscription instructions
      const instructions = await buildInitializeSubscriptionIx({
        userWallet,
        amountPerPeriod: plan.price,
        intervalSeconds: plan.interval,
        expiresAt,
      }, connection);

      // Send gasless transaction
      const signature = await signAndSendTransaction({
        instructions,
        transactionOptions: {
          computeUnitLimit: SUBSCRIPTION_CONSTANTS.COMPUTE_UNIT_LIMIT
        }
      });

      console.log('Subscription created:', signature);

      alert(
        `${plan.displayName} subscription created!\n\n` +
        `First payment of ${plan.priceDisplay} USDC charged.`
      );

      // Redirect to dashboard
      router.push('/recipes/03-subscription-service/dashboard');

    } catch (err: any) {
      console.error('Subscription error:', err);
      alert(`Failed to create subscription:\n${err.message}`);
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div>
      <h1>Choose Your Plan</h1>

      {/* Expiry Selection */}
      <div>
        <h3>Subscription Duration</h3>
        {[
          { value: 3, label: '3 months' },
          { value: 6, label: '6 months' },
          { value: 12, label: '12 months' },
          { value: 0, label: 'No expiry' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedExpiry(option.value)}
            className={selectedExpiry === option.value ? 'selected' : ''}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className="plan-card">
            <h2>{plan.displayName}</h2>
            <p className="price">
              {plan.priceDisplay} / {plan.intervalDisplay}
            </p>

            <ul>
              {plan.features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan)}
              disabled={subscribing}
            >
              {subscribing ? 'Creating...' : `Subscribe to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 4: Create the Dashboard Page

Build the subscription management interface:

```typescript
// dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { PublicKey, Connection } from '@solana/web3.js';
import {
  getSubscriptionPDA,
  buildCancelSubscriptionIx,
  MERCHANT_WALLET
} from '@/lib/program/subscription-service';
import { SUBSCRIPTION_CONSTANTS, getPlanById } from '@/lib/constants';

interface SubscriptionData {
  amountPerPeriod: number;
  intervalSeconds: number;
  lastChargeTimestamp: number;
  createdAt: number;
  expiresAt: number | null;
  isActive: boolean;
  totalCharged: number;
}

export default function DashboardPage() {
  const { wallet, signAndSendTransaction } = useWallet();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (wallet) {
      loadSubscription();
    }
  }, [wallet]);

  const loadSubscription = async () => {
    if (!wallet) return;

    setLoading(true);
    try {
      const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);
      const userWallet = new PublicKey(wallet.smartWallet);
      const [subscriptionPDA] = getSubscriptionPDA(userWallet, MERCHANT_WALLET);

      const accountInfo = await connection.getAccountInfo(subscriptionPDA, 'confirmed');

      if (accountInfo) {
        // Parse subscription data from account buffer
        const data = parseSubscriptionData(accountInfo.data);
        if (data.isActive) {
          setSubscription(data);
        }
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!wallet) return;

    const confirmed = confirm(
      'Cancel subscription?\n\n' +
      `Setup fee (~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL) will be refunded.`
    );

    if (!confirmed) return;

    setCancelling(true);
    try {
      const userWallet = new PublicKey(wallet.smartWallet);
      const instruction = await buildCancelSubscriptionIx(userWallet);

      const signature = await signAndSendTransaction({
        instructions: [instruction],
        transactionOptions: {
          computeUnitLimit: SUBSCRIPTION_CONSTANTS.COMPUTE_UNIT_LIMIT
        }
      });

      alert('Subscription cancelled! Setup fee refunded.');
      setSubscription(null);

    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const getNextChargeDate = () => {
    if (!subscription) return '';
    const nextCharge = new Date(
      (subscription.lastChargeTimestamp + subscription.intervalSeconds) * 1000
    );
    return nextCharge <= new Date() ? 'Due Now' : nextCharge.toLocaleDateString();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!subscription) {
    return (
      <div>
        <h2>No Active Subscription</h2>
        <a href="/recipes/03-subscription-service/subscribe">View Plans</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Subscription Dashboard</h1>

      <div className="subscription-info">
        <h2>Current Plan</h2>
        <p>Price: {subscription.amountPerPeriod} USDC</p>
        <p>Status: Active</p>

        <h3>Payment Information</h3>
        <p>Last Charged: {new Date(subscription.lastChargeTimestamp * 1000).toLocaleDateString()}</p>
        <p>Next Charge: {getNextChargeDate()}</p>
        <p>Total Charged: {subscription.totalCharged} USDC</p>
        <p>Expires: {subscription.expiresAt
          ? new Date(subscription.expiresAt * 1000).toLocaleDateString()
          : 'Perpetual'}</p>
      </div>

      <button onClick={handleCancel} disabled={cancelling}>
        {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
      </button>
    </div>
  );
}
```

---

## Step 5: Build the Backend Charging Job

Create an API route to automatically charge subscriptions:

```typescript
// api/charge-subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
  PublicKey
} from '@solana/web3.js';
import * as crypto from 'crypto';

// Rate limiting (in-memory for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }

  record.count++;
  return { allowed: true };
}

function buildChargeInstruction(
  subscriptionPDA: PublicKey,
  userTokenAccount: PublicKey,
  recipientTokenAccount: PublicKey,
  programId: PublicKey
): TransactionInstruction {
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const discriminator = crypto.createHash('sha256')
    .update('global:charge_subscription')
    .digest()
    .slice(0, 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPDA, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId,
    data: discriminator,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    // Load configuration
    const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    const PROGRAM_ID = process.env.NEXT_PUBLIC_SUBSCRIPTION_PROGRAM_ID;
    const MERCHANT_KEYPAIR_SECRET = process.env.MERCHANT_KEYPAIR_SECRET;

    if (!RPC_URL || !PROGRAM_ID || !MERCHANT_KEYPAIR_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Load merchant keypair
    const decoded = Buffer.from(MERCHANT_KEYPAIR_SECRET, 'base64').toString('utf-8');
    const merchantKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(decoded))
    );

    const connection = new Connection(RPC_URL, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);

    // Get all subscription accounts
    const accounts = await connection.getProgramAccounts(programId);

    const results = {
      total: accounts.length,
      charged: [] as string[],
      skipped: [] as { address: string; reason: string }[],
      errors: [] as { address: string; error: string }[],
    };

    const now = Math.floor(Date.now() / 1000);

    for (const account of accounts) {
      try {
        const data = account.account.data;

        // Parse subscription data
        let offset = 8;  // Skip discriminator
        offset += 32 * 5;  // Skip pubkeys
        offset += 8;  // Skip amount

        const intervalSeconds = Number(data.readBigInt64LE(offset));
        offset += 8;

        const lastChargeTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8 + 8 + 1;  // Skip created_at and has_expiry flag

        // Handle optional expires_at
        const hasExpiry = data.readUInt8(offset - 1) === 1;
        if (hasExpiry) offset += 8;

        const isActive = data.readUInt8(offset) === 1;

        // Check if subscription should be charged
        if (!isActive) {
          results.skipped.push({ address: account.pubkey.toBase58(), reason: 'Inactive' });
          continue;
        }

        const timeSinceLastCharge = now - lastChargeTimestamp;
        if (timeSinceLastCharge < intervalSeconds) {
          results.skipped.push({
            address: account.pubkey.toBase58(),
            reason: `Not ready (${Math.ceil((intervalSeconds - timeSinceLastCharge) / 60)}m remaining)`
          });
          continue;
        }

        // Get token accounts from subscription data
        const userTokenAccount = new PublicKey(data.slice(8 + 64, 8 + 96));
        const recipientTokenAccount = new PublicKey(data.slice(8 + 96, 8 + 128));

        // Build and send charge transaction
        const instruction = buildChargeInstruction(
          account.pubkey,
          userTokenAccount,
          recipientTokenAccount,
          programId
        );

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = merchantKeypair.publicKey;

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [merchantKeypair],
          { commitment: 'confirmed' }
        );

        results.charged.push(signature);

      } catch (err: any) {
        results.errors.push({
          address: account.pubkey.toBase58(),
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Charged ${results.charged.length} subscription(s)`,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process subscriptions' },
      { status: 500 }
    );
  }
}
```

---

## Anchor Program Overview

The subscription is powered by a custom Anchor program. Key instructions:

### Initialize Subscription
Creates the subscription and charges the first payment immediately (prepaid model).

```rust
pub fn initialize_subscription(
    ctx: Context<InitializeSubscription>,
    amount_per_period: u64,
    interval_seconds: i64,
    expires_at: Option<i64>,
) -> Result<()> {
    // 1. Delegate token account to subscription PDA
    // 2. Charge first payment immediately
    // 3. Store subscription state
}
```

### Charge Subscription
Called by the backend to charge recurring payments.

```rust
pub fn charge_subscription(ctx: Context<ChargeSubscription>) -> Result<()> {
    // 1. Verify subscription is active
    // 2. Check interval has passed
    // 3. Transfer tokens using PDA as delegate
    // 4. Update last_charge_timestamp
}
```

### Cancel Subscription
Revokes delegation and refunds rent.

```rust
pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
    // 1. Revoke token delegation
    // 2. Mark subscription inactive
    // 3. Close account (refund rent)
}
```

See the full program at: [program/subscription-program/README.md](../../../../program/subscription-program/README.md)

---

## Testing the Flow

1. **Create a subscription** (Test Plan - $0.01/minute):
   - Go to `/recipes/03-subscription-service/subscribe`
   - Select "Test Plan"
   - Click Subscribe
   - First payment charged immediately

2. **View your subscription**:
   - Go to `/recipes/03-subscription-service/dashboard`
   - See plan details, last charge, next charge date

3. **Trigger recurring charge** (after 1 minute):
   - On the dashboard, click "Trigger Payment Processing"
   - The backend scans all subscriptions
   - Charges those that are due

4. **Cancel subscription**:
   - Click "Cancel Subscription"
   - Setup fee refunded (~0.002 SOL)
   - Token delegation revoked

---

## Production Considerations

This is a proof-of-concept. For production:

| Area | Recommendation |
|------|----------------|
| **Backend** | Use scheduled jobs (cron) instead of manual triggers |
| **Rate Limiting** | Use Redis or database instead of in-memory |
| **Security** | Store merchant keypair in secure vault (AWS KMS, etc.) |
| **Paymaster** | Work with LazorKit to cover PDA rent fees |
| **Monitoring** | Add logging, alerts for failed charges |
| **User Notifications** | Email/push before charges, on failures |

---

## Live Demo

Try this recipe live at: [https://lazorkit-cookbook.vercel.app/recipes/03-subscription-service](https://lazorkit-cookbook.vercel.app/recipes/03-subscription-service)

---

## Next Steps

- Explore the [Anchor Program Documentation](../../../../program/subscription-program/README.md)
- Learn about [LazorKit SDK](https://docs.lazorkit.com/)
- Build your own subscription-based dApp!

---

## Resources

- [Anchor Framework](https://www.anchor-lang.com/docs)
- [SPL Token Delegation](https://spl.solana.com/token#authority-delegation)
- [Solana PDAs Explained](https://solanacookbook.com/core-concepts/pdas.html)

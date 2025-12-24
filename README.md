# LazorKit Cookbook

**Production-ready recipes for building Solana dApps with LazorKit SDK**

A collection of practical examples demonstrating how LazorKit simplifies Solana development - from basic passkey authentication to advanced subscription billing systems with automated recurring payments.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://lazorkit-cookbook.vercel.app/)
[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-blueviolet)](https://explorer.solana.com/?cluster=devnet)
[![LazorKit](https://img.shields.io/badge/LazorKit-v2.0.1-blue)](https://docs.lazorkit.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is LazorKit?

LazorKit is an open-source Passkey wallet SDK for Solana that eliminates the biggest barriers to blockchain adoption:

| Traditional Solana UX | With LazorKit |
|----------------------|---------------|
| Seed phrases required | Face ID / Touch ID authentication |
| Browser extensions needed | Works directly in browser |
| Users must buy SOL for gas | Gasless transactions via paymaster |
| Complex wallet setup | One-click wallet creation |

**This cookbook demonstrates real-world integration patterns** to help developers build user-friendly Solana dApps.

---

## Recipes Overview

| Recipe | Description | Difficulty | Tutorial |
|--------|-------------|------------|----------|
| [01: Passkey Wallet Basics](app/app/recipes/01-passkey-wallet-basics) | Create wallets with Face ID, check balances | Beginner | [Read Tutorial](app/app/recipes/01-passkey-wallet-basics/README.md) |
| [02: Gasless USDC Transfer](app/app/recipes/02-gasless-transfer) | Send tokens without paying gas fees | Intermediate | [Read Tutorial](app/app/recipes/02-gasless-transfer/README.md) |
| [03: Subscription Service](app/app/recipes/03-subscription-service) | Automated recurring USDC payments on Solana | Advanced | [Read Tutorial](app/app/recipes/03-subscription-service/README.md) |

**Anchor Program**: Custom smart contract powering the subscription service. [Read Documentation](program/subscription-program/README.md)

---

## Quick Start

### Prerequisites

- **Node.js 22+** and npm/yarn/pnpm
- Basic understanding of React and Next.js
- (Optional) Solana CLI and Anchor for Recipe 03's smart contract

### Installation

```bash
# Clone the repository
git clone https://github.com/0xharp/lazorkit-cookbook.git
cd lazorkit-cookbook

# Navigate to the app directory
cd app

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
```

### Environment Configuration

Create `.env.local` in the `app/` directory:

```env
# Solana Network
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# LazorKit Configuration
NEXT_PUBLIC_LAZORKIT_PORTAL_URL=https://portal.lazor.sh
NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL=https://kora.devnet.lazorkit.com

# Token Configuration (Devnet USDC)
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Recipe 03: Subscription Service
NEXT_PUBLIC_SUBSCRIPTION_PROGRAM_ID=3kZ9Fdzadk8NXwjHaSabKrXBsU1y226BgXJdHZ78Qx4v
NEXT_PUBLIC_MERCHANT_WALLET=<your_merchant_wallet_address>
MERCHANT_KEYPAIR_SECRET=<base64_encoded_keypair_json>  # For backend charging
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the cookbook homepage.

---

## Project Structure

```
lazorkit-cookbook/
├── app/                                    # Next.js 15 Application
│   ├── app/
│   │   ├── recipes/
│   │   │   ├── 01-passkey-wallet-basics/   # Recipe 01: Wallet basics
│   │   │   │   └── page.tsx
│   │   │   ├── 02-gasless-transfer/        # Recipe 02: Gasless transfers
│   │   │   │   └── page.tsx
│   │   │   └── 03-subscription-service/    # Recipe 03: Subscriptions
│   │   │       ├── subscribe/page.tsx      # Plan selection & subscribe
│   │   │       └── dashboard/page.tsx      # Manage subscription
│   │   ├── api/
│   │   │   └── charge-subscriptions/       # Backend recurring charge job
│   │   │       └── route.ts
│   │   ├── page.tsx                        # Homepage with recipe cards
│   │   └── layout.tsx                      # Root layout with providers
│   ├── components/
│   │   ├── Header.tsx                      # Navigation with wallet info
│   │   ├── Footer.tsx                      # Links and attribution
│   │   └── WalletButton.tsx                # Wallet connection button
│   ├── lib/
│   │   ├── constants.ts                    # Subscription plans & config
│   │   └── program/
│   │       └── subscription-service.ts     # On-chain program helpers
│   ├── providers/
│   │   └── LazorkitProvider.tsx            # LazorKit SDK initialization
│   └── env.example                         # Environment template
│
├── program/                                # Solana Smart Contracts
│   └── subscription-program/
│       ├── programs/subscription-program/
│       │   └── src/lib.rs                  # Anchor program (Rust)
│       ├── Anchor.toml
│       └── README.md                       # Program documentation
│
└── README.md                               # This file
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **React** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Blockchain** | Solana (Devnet) |
| **Wallet SDK** | LazorKit @lazorkit/wallet 2.0.1 |
| **Smart Contracts** | Anchor 0.31.1 |
| **Token Standard** | SPL Token 0.4.14 |
| **Deployment** | Vercel (frontend), Solana Devnet (contracts) |

---

## Core LazorKit Features Demonstrated

### 1. Passkey Authentication (Recipe 01)
Create wallets using WebAuthn (Face ID/Touch ID) - no seed phrases, no browser extensions.

```typescript
import { useWallet } from '@lazorkit/wallet';

function WalletButton() {
  const { wallet, connect, disconnect, isConnected } = useWallet();

  return (
    <button onClick={connect}>
      {isConnected ? wallet?.smartWallet : 'Connect with Face ID'}
    </button>
  );
}
```

### 2. Gasless Transactions (Recipe 02)
Send tokens without users needing SOL for gas - LazorKit's paymaster covers the fees.

```typescript
const { signAndSendTransaction } = useWallet();

// Build your instruction
const transferIx = createTransferInstruction(
  senderTokenAccount,
  recipientTokenAccount,
  senderPubkey,
  amount * 1_000_000
);

// Send gasless - paymaster covers fees
const signature = await signAndSendTransaction({
  instructions: [transferIx]
});
```

### 3. Smart Wallet Integration (Recipe 03)
Integrate with custom Anchor programs for advanced use cases like recurring payments.

```typescript
const instructions = await buildInitializeSubscriptionIx({
  userWallet,
  amountPerPeriod: 0.10,  // $0.10 USDC
  intervalSeconds: 30 * 24 * 60 * 60,  // 30 days
  expiresAt: undefined  // Perpetual subscription
}, connection);

await signAndSendTransaction({ instructions });
```

---

## LazorKit Provider Setup

The cookbook uses a custom provider to configure LazorKit SDK:

```typescript
// providers/LazorkitProvider.tsx
'use client';

import { LazorkitProvider as LazorkitWalletProvider } from '@lazorkit/wallet';

export function LazorkitProvider({ children }) {
  return (
    <LazorkitWalletProvider
      rpcUrl="https://api.devnet.solana.com"
      portalUrl="https://portal.lazor.sh"
      paymasterConfig={{
        paymasterUrl: "https://kora.devnet.lazorkit.com"
      }}
    >
      {children}
    </LazorkitWalletProvider>
  );
}
```

---

## Learning Path

| If you are... | Start with... |
|---------------|---------------|
| New to Solana | Recipe 01 - Understand wallet basics |
| Familiar with Solana | Recipe 02 - See how LazorKit simplifies your code |
| Advanced developer | Recipe 03 - Build complex on-chain programs |

---

## Live Demo

Visit the deployed cookbook: **[https://lazorkit-cookbook.vercel.app/](https://lazorkit-cookbook.vercel.app/)**

**Testing on Devnet:**
1. Create a wallet using Face ID/Touch ID
2. Get devnet SOL from [Solana Faucet](https://faucet.solana.com)
3. Get devnet USDC from [Circle Faucet](https://faucet.circle.com)
4. Try the gasless transfer and subscription features

---

## Resources

- **LazorKit Documentation**: [docs.lazorkit.com](https://docs.lazorkit.com/)
- **LazorKit GitHub**: [github.com/lazor-kit/lazor-kit](https://github.com/lazor-kit/lazor-kit)
- **Solana Documentation**: [docs.solana.com](https://docs.solana.com/)
- **Anchor Documentation**: [anchor-lang.com/docs](https://www.anchor-lang.com/docs)

---

## Bounty Submission

This cookbook was created for the **Superteam x LazorKit Bounty** (December 2024 - January 2025).

**Deliverables:**
- Working example repository with 3 recipes
- Step-by-step tutorials for each recipe
- Live demo deployed on Solana Devnet
- Custom Anchor program for subscription billing

---

## Author

**0xharp**
- Twitter: [@0xharp](https://twitter.com/0xharp)
- GitHub: [@0xharp](https://github.com/0xharp)

---

## License

MIT License - feel free to use this cookbook as a starting point for your own projects.

---

Built with LazorKit SDK for the Solana ecosystem.

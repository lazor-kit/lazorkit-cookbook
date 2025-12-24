# Recipe 01: Passkey Wallet Basics

**Create Solana wallets using Face ID/Touch ID - no seed phrases, no browser extensions**

This recipe teaches you the fundamentals of LazorKit's passkey authentication and smart wallet system. By the end, you'll understand how to create wallets, check balances, and provide a seamless Web2-like onboarding experience.

---

## What You'll Learn

- Create a Solana wallet using WebAuthn (Face ID/Touch ID)
- Access wallet addresses and public keys
- Check SOL and USDC balances
- Request devnet airdrops for testing
- Disconnect and manage wallet sessions

---

## Prerequisites

Before starting this recipe, make sure you have:

1. LazorKit SDK installed:
```bash
npm install @lazorkit/wallet @solana/web3.js
```

2. LazorKit Provider configured in your app (see [Provider Setup](#provider-setup))

---

## Step 1: Set Up the LazorKit Provider

First, wrap your application with the LazorKit provider to enable wallet functionality:

```typescript
// providers/LazorkitProvider.tsx
'use client';

import { LazorkitProvider as LazorkitWalletProvider } from '@lazorkit/wallet';
import { ReactNode } from 'react';

export function LazorkitProvider({ children }: { children: ReactNode }) {
  return (
    <LazorkitWalletProvider
      rpcUrl={process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'}
      portalUrl={process.env.NEXT_PUBLIC_LAZORKIT_PORTAL_URL || 'https://portal.lazor.sh'}
      paymasterConfig={{
        paymasterUrl: process.env.NEXT_PUBLIC_LAZORKIT_PAYMASTER_URL || 'https://kora.devnet.lazorkit.com'
      }}
    >
      {children}
    </LazorkitWalletProvider>
  );
}
```

Add it to your root layout:

```typescript
// app/layout.tsx
import { LazorkitProvider } from '@/providers/LazorkitProvider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LazorkitProvider>
          {children}
        </LazorkitProvider>
      </body>
    </html>
  );
}
```

---

## Step 2: Import the useWallet Hook

The `useWallet` hook is your gateway to all wallet functionality:

```typescript
'use client';

import { useWallet } from '@lazorkit/wallet';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
```

---

## Step 3: Connect with Passkey Authentication

Use the `connect` function to create or access a wallet using Face ID/Touch ID:

```typescript
export default function WalletPage() {
  const { wallet, isConnected, connect, disconnect } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connect();
    } catch (err: any) {
      console.error('Connection error:', err);

      // Handle popup blocked error
      if (err.message?.includes('popup') || err.message?.includes('blocked')) {
        alert(
          'Popup Blocked!\n\n' +
          'Please allow popups for this site in your browser settings.'
        );
      } else {
        alert(`Failed to connect: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleConnect} disabled={loading}>
      {loading ? 'Creating Wallet...' : 'Create Wallet with Passkey'}
    </button>
  );
}
```

**What happens when `connect()` is called:**
1. LazorKit opens a portal window for passkey authentication
2. User authenticates with Face ID, Touch ID, or security key
3. A smart wallet address is generated and returned
4. The wallet object is populated with the user's address

---

## Step 4: Access Wallet Information

Once connected, access the wallet address via `wallet.smartWallet`:

```typescript
{isConnected && wallet && (
  <div>
    <h3>Connected!</h3>
    <p>Wallet Address: {wallet.smartWallet}</p>

    {/* Copy address to clipboard */}
    <button onClick={() => {
      navigator.clipboard.writeText(wallet.smartWallet);
      alert('Address copied!');
    }}>
      Copy Address
    </button>

    {/* View on Explorer */}
    <a
      href={`https://explorer.solana.com/address/${wallet.smartWallet}?cluster=devnet`}
      target="_blank"
    >
      View on Explorer
    </a>
  </div>
)}
```

---

## Step 5: Fetch Token Balances

To fetch SOL and USDC balances, use the Solana Web3.js library:

```typescript
const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
);

// Helper function to derive Associated Token Address
function getAssociatedTokenAddressSync(mint: PublicKey, owner: PublicKey): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
      mint.toBuffer()
    ],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  );
  return address;
}

const fetchBalances = async () => {
  if (!wallet) return;

  try {
    const connection = new Connection(RPC_URL);
    const publicKey = new PublicKey(wallet.smartWallet);

    // Fetch SOL balance
    const solBalanceLamports = await connection.getBalance(publicKey);
    const solBalance = solBalanceLamports / LAMPORTS_PER_SOL;
    console.log('SOL Balance:', solBalance);

    // Fetch USDC balance
    const userTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
    const accountInfo = await connection.getAccountInfo(userTokenAccount);

    if (!accountInfo) {
      console.log('No USDC token account - balance is 0');
      return;
    }

    // Parse token account data (offset 64 = amount as 8 bytes)
    const data = accountInfo.data;
    const amount = Number(data.readBigUInt64LE(64));
    const usdcBalance = amount / 1_000_000; // USDC has 6 decimals

    console.log('USDC Balance:', usdcBalance);
  } catch (err) {
    console.error('Error fetching balances:', err);
  }
};
```

---

## Step 6: Request Devnet Airdrops

For testing, you can request SOL from the devnet faucet:

```typescript
const handleAirdrop = async () => {
  if (!wallet) return;

  try {
    const connection = new Connection(RPC_URL);
    const publicKey = new PublicKey(wallet.smartWallet);

    // Request 1 SOL airdrop
    const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);

    alert('Airdrop successful! You received 1 SOL');

    // Refresh balances
    await fetchBalances();
  } catch (err: any) {
    console.error('Airdrop error:', err);
    alert(
      'Airdrop failed!\n\n' +
      'Devnet faucets have rate limits. Try:\n' +
      '- https://faucet.solana.com (SOL)\n' +
      '- https://faucet.circle.com (USDC)'
    );
  }
};
```

---

## Step 7: Disconnect Wallet

Allow users to disconnect their wallet:

```typescript
<button onClick={disconnect}>
  Disconnect Wallet
</button>
```

---

## Complete Example

The complete implementation includes wallet connection, balance fetching, and airdrop functionality.

**Core Functions:**

| Function | Description |
|----------|-------------|
| `handleConnect()` | Initiates passkey authentication via `connect()` |
| `fetchBalances()` | Fetches SOL and USDC balances using Solana Web3.js |
| `handleAirdrop()` | Requests devnet SOL airdrop for testing |
| `getAssociatedTokenAddressSync()` | Derives the user's USDC token account address |

**Key Pattern - Wallet Connection:**

```typescript
const { wallet, isConnected, connect, disconnect } = useWallet();

const handleConnect = async () => {
  try {
    await connect();  // Opens LazorKit portal for passkey auth
  } catch (err) {
    // Handle popup blocked or connection errors
  }
};

// After connection, access wallet address:
const walletAddress = wallet?.smartWallet;
```

> **Source**: See the full implementation at [`page.tsx`](page.tsx)

---

## Key Concepts

### WebAuthn Passkey Authentication
Instead of seed phrases, LazorKit uses WebAuthn (the same technology behind Face ID login on websites). Your private keys are stored securely in your device's secure enclave and never leave your device.

### Smart Wallet
When you create a wallet, LazorKit generates a smart wallet address on Solana. This is a regular Solana address that can:
- Receive SOL and SPL tokens
- Interact with any Solana program
- Sign transactions using your biometrics

### No Browser Extensions
Unlike traditional Solana wallets (Phantom, Solflare), LazorKit doesn't require any browser extensions. Everything works directly in your browser or mobile app through the LazorKit portal.

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Popup blocked | Allow popups for the site in browser settings |
| Connection fails | Ensure LazorKit portal URL is correct |
| Balance shows 0 | The token account may not exist yet (created on first transfer) |
| Airdrop fails | Devnet faucets have rate limits - wait or use external faucets |

---

## Next Steps

Now that you understand wallet basics, proceed to:

**[Recipe 02: Gasless USDC Transfer](../02-gasless-transfer/README.md)** - Learn how to send tokens without paying gas fees!

---

## Live Demo

Try this recipe live at: [https://lazorkit-cookbook.vercel.app/recipes/01-passkey-wallet-basics](https://lazorkit-cookbook.vercel.app/recipes/01-passkey-wallet-basics)

---

## Resources

- [LazorKit React SDK Docs](https://docs.lazorkit.com/react-sdk/getting-started)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [WebAuthn Specification](https://webauthn.guide/)

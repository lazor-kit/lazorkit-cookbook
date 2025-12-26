# Recipe 02: Gasless USDC Transfer

**Send USDC tokens without paying SOL gas fees - LazorKit's paymaster covers everything**

This recipe demonstrates one of LazorKit's most powerful features: gasless transactions. Your users can send USDC without ever needing to buy or hold SOL for gas fees. This dramatically reduces onboarding friction and provides a Web2-like experience.

---

## What You'll Learn

- Send USDC tokens without paying SOL for gas
- How LazorKit's paymaster service works
- Build SPL token transfer instructions
- Automatically create recipient token accounts if needed
- Handle transaction signing and confirmation

---

## The Problem with Traditional Solana UX

Traditional Solana apps require users to:

1. Buy SOL on an exchange (KYC, fees, complexity)
2. Transfer SOL to their wallet
3. Keep enough SOL for gas fees
4. Hope they don't run out mid-transaction

**This creates massive onboarding friction.** Many users drop off at step 1.

---

## The LazorKit Solution: Gasless Transactions

With LazorKit's paymaster, users only need the tokens they want to send. The paymaster:

1. Detects your transaction needs gas
2. Adds its signature to cover the fee
3. Submits the transaction atomically
4. User pays nothing in SOL

```typescript
// User only needs USDC, not SOL
const signature = await signAndSendTransaction({
  instructions: [transferIx],
});
// Transaction complete - user paid $0 in gas
```

---

## Prerequisites

Before starting, ensure you have:

1. Completed [Recipe 01](../01-passkey-wallet-basics/README.md) (understand wallet basics)
2. LazorKit SDK and SPL Token library installed:
```bash
npm install @lazorkit/wallet @solana/web3.js @solana/spl-token
```
3. Some devnet USDC in your wallet (get from [Circle Faucet](https://faucet.circle.com))

---

## Step 1: Import Required Dependencies

```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { useLazorkitWalletConnect } from '@/hooks/useLazorkitWalletConnect';
import { useBalances } from '@/hooks/useBalances';
import {
  getAssociatedTokenAddressSync,
  getConnection,
  USDC_MINT,
  formatTransactionError
} from '@/lib/solana-utils';
```

---

## Step 2: Set Up the Hooks

Use the centralized hooks for wallet connection and balance management:

```typescript
export default function Recipe02Page() {
  const { signAndSendTransaction } = useWallet();
  const { wallet, isConnected, connect, connecting } = useLazorkitWalletConnect();
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [lastTxSignature, setLastTxSignature] = useState('');

  const {
    usdcBalance,
    loading: refreshing,
    fetchBalances: fetchBalance,
  } = useBalances(isConnected ? wallet?.smartWallet : null);

  // ... rest of component
}
```

---

## Step 3: Token Utilities

The `solana-utils.ts` file provides utilities for working with SPL tokens:

```typescript
// Already available from @/lib/solana-utils
import { getAssociatedTokenAddressSync, USDC_MINT } from '@/lib/solana-utils';

// Derive sender and recipient token accounts
const senderTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, senderPubkey);
const recipientTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, recipientPubkey);
```

---

## Step 4: Build the Transfer Function

Here's the complete gasless transfer implementation using the centralized utilities:

```typescript
const handleSend = async () => {
  if (!wallet || !recipient || !amount) {
    alert('Please fill in all fields');
    return;
  }

  // Validate recipient address
  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(recipient);
  } catch (err) {
    alert('Invalid recipient address');
    return;
  }

  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    alert('Invalid amount');
    return;
  }

  setSending(true);
  try {
    const connection = getConnection();  // Use cached connection
    const senderPubkey = new PublicKey(wallet.smartWallet);

    // Derive token accounts using utility function
    const senderTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, senderPubkey);
    const recipientTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, recipientPubkey);

    // Check if recipient token account exists
    const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
    const instructions: TransactionInstruction[] = [];

    // If recipient doesn't have a token account, create one
    if (!recipientAccountInfo) {
      const createAccountIx = new TransactionInstruction({
        keys: [
          { pubkey: senderPubkey, isSigner: true, isWritable: true },
          { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
          { pubkey: recipientPubkey, isSigner: false, isWritable: false },
          { pubkey: USDC_MINT, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
        data: Buffer.from([]),
      });
      instructions.push(createAccountIx);
    }

    // Build transfer instruction
    const transferIx = createTransferInstruction(
      senderTokenAccount,
      recipientTokenAccount,
      senderPubkey,
      amountNum * 1_000_000, // USDC has 6 decimals
      [],
      TOKEN_PROGRAM_ID
    );
    instructions.push(transferIx);

    // Send gasless transaction
    const signature = await signAndSendTransaction({
      instructions,
      transactionOptions: { computeUnitLimit: 200_000 }
    });

    setLastTxSignature(signature);
    await connection.confirmTransaction(signature, 'confirmed');

    alert(
      `Transfer successful!\n\n` +
      `Sent: ${amountNum} USDC\n` +
      `To: ${recipient.slice(0, 8)}...${recipient.slice(-4)}\n\n` +
      `No gas fees paid!`
    );

    // Reset form and refresh balance
    setRecipient('');
    setAmount('');
    await fetchBalance();
  } catch (err: unknown) {
    console.error('Transfer error:', err);
    alert(formatTransactionError(err, 'Transfer'));  // User-friendly error message
  } finally {
    setSending(false);
  }
};
```

---

## Step 5: Build the UI

Create a simple form for the transfer:

```typescript
return (
  <div>
    {!isConnected ? (
      <button onClick={connect}>Connect Wallet</button>
    ) : (
      <div>
        {/* Balance Display */}
        <div>
          <p>Your USDC Balance: {usdcBalance?.toFixed(2) || '...'}</p>
        </div>

        {/* Transfer Form */}
        <div>
          <label>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana address..."
          />
        </div>

        <div>
          <label>Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        <button onClick={handleSend} disabled={sending}>
          {sending ? 'Sending...' : 'Send USDC (Gasless!)'}
        </button>

        {/* Transaction Link */}
        {lastTxSignature && (
          <a
            href={`https://explorer.solana.com/tx/${lastTxSignature}?cluster=devnet`}
            target="_blank"
          >
            View Transaction
          </a>
        )}
      </div>
    )}
  </div>
);
```

---

## How the Paymaster Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Your dApp     │────▶│  LazorKit SDK    │────▶│   Paymaster     │
│  (Instructions) │     │  (Sign Request)  │     │  (Pays Gas)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Solana Network │
                                                 │  (Transaction)  │
                                                 └─────────────────┘
```

1. **Your dApp** builds transaction instructions (transfer USDC)
2. **LazorKit SDK** packages the transaction and requests user signature
3. **Paymaster** adds gas payment and submits to network
4. **Solana Network** processes the transaction

**The user never sees or pays any SOL fees.**

---

## Complete Example

The complete implementation includes balance fetching, recipient validation, automatic token account creation, and gasless transfer.

**Core Functions:**

| Function | Description |
|----------|-------------|
| `handleSend()` | Validates inputs, builds instructions, sends gasless transaction |
| `fetchBalance()` | Fetches user's USDC balance |
| `getAssociatedTokenAddressSync()` | Derives token account addresses for sender and recipient |

**Key Pattern - Gasless Transfer:**

```typescript
const { signAndSendTransaction } = useWallet();

// Build transfer instruction
const transferIx = createTransferInstruction(
  senderTokenAccount,
  recipientTokenAccount,
  senderPubkey,
  amount * 1_000_000,  // USDC has 6 decimals
);

// Send gasless - paymaster covers fees automatically
const signature = await signAndSendTransaction({
  instructions: [transferIx],
  transactionOptions: { computeUnitLimit: 200_000 }
});
```

> **Source**: See the full implementation at [`page.tsx`](page.tsx)

---

## Key Concepts

### Associated Token Accounts (ATAs)
SPL tokens aren't stored in your main wallet address. Instead, each token type has a derived "Associated Token Account". The ATA address is deterministically derived from:
- Your wallet address (owner)
- The token mint address (e.g., USDC)
- The Token Program ID

### Automatic ATA Creation
If the recipient doesn't have a USDC token account, you need to create one. In the code above, we check if the account exists and add a creation instruction if needed.

### Compute Unit Limit
We set `computeUnitLimit: 200_000` to ensure enough compute budget for complex transactions. This doesn't affect the user - the paymaster handles it.

---

## Use Cases for Gasless Transfers

| Use Case | Description |
|----------|-------------|
| **Payments** | Users pay for goods/services in USDC without SOL |
| **Tipping** | Tip content creators without friction |
| **Remittances** | Send stablecoins to family without crypto complexity |
| **Commerce** | "Pay with Solana" checkout without gas fees |
| **Gaming** | In-game purchases without SOL requirements |

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Insufficient balance" | User needs more USDC - get from faucet |
| "Invalid recipient" | Ensure it's a valid Solana address (base58) |
| "Transaction failed" | Check RPC connection, try again |
| "Account creation failed" | Recipient may already have the token account |

---

## Next Steps

Ready for more advanced features? Proceed to:

- **[Recipe 03: Subscription Service](../03-subscription-service/README.md)** - Build automated recurring payments with token delegation!
- **[Recipe 04: Gasless Raydium Swap](../04-gasless-raydium-swap/README.md)** - Swap tokens on Raydium DEX without gas fees!

---

## Live Demo

Try this recipe live at: [https://lazorkit-cookbook.vercel.app/recipes/02-gasless-transfer](https://lazorkit-cookbook.vercel.app/recipes/02-gasless-transfer)

---

## Resources

- [LazorKit Paymaster Documentation](https://docs.lazorkit.com/react-sdk/gasless-transactions)
- [SPL Token Documentation](https://spl.solana.com/token)
- [Circle USDC Faucet (Devnet)](https://faucet.circle.com)

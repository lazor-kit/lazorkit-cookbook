'use client';

import { useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import Link from 'next/link';
import { useBalances } from '@/hooks/useBalances';
import { useLazorkitWalletConnect } from '@/hooks/useLazorkitWalletConnect';
import { getAssociatedTokenAddressSync, getConnection, USDC_MINT, formatTransactionError } from '@/lib/solana-utils';

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

  const handleSend = async () => {
    if (!wallet || !recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }

    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient);
    } catch (err) {
      alert('Invalid recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Invalid amount');
      return;
    }

    if (usdcBalance !== null && amountNum > usdcBalance) {
      alert(`Insufficient balance. You have ${usdcBalance.toFixed(2)} USDC`);
      return;
    }

    setSending(true);
    try {
      const connection = getConnection();
      const senderPubkey = new PublicKey(wallet.smartWallet);

      const senderTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, senderPubkey);
      const recipientTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, recipientPubkey);

      const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
      const instructions: TransactionInstruction[] = [];

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

      const transferIx = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        senderPubkey,
        amountNum * 1_000_000,
        [],
        TOKEN_PROGRAM_ID
      );
      instructions.push(transferIx);

      console.log('📤 Sending gasless transaction...');
      const signature = await signAndSendTransaction({
        instructions,
        transactionOptions: { computeUnitLimit: 200_000 }
      });

      console.log('✅ Transaction signature:', signature);
      setLastTxSignature(signature);

      await connection.confirmTransaction(signature, 'confirmed');

      alert(
        `✅ Transfer successful!\n\n` +
        `Sent: ${amountNum} USDC\n` +
        `To: ${recipient.slice(0, 8)}...${recipient.slice(-4)}\n\n` +
        `🎉 No gas fees paid!`
      );

      setRecipient('');
      setAmount('');
      await fetchBalance();
    } catch (err: unknown) {
      console.error('❌ Transfer error:', err);
      alert(formatTransactionError(err, 'Transfer'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Link 
            href="/"
            className="text-purple-400 hover:text-purple-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <div className="flex items-start gap-3 mb-2">
            <span className="text-4xl">⚡</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold text-white break-words">
                Recipe 02: Gasless USDC Transfer
              </h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm md:text-base">
            Send USDC without paying gas fees using LazorKit's paymaster
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Panel */}
          <div className="space-y-6 w-full min-w-0">
            {/* The Game Changer Section */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>🎯</span> The Game Changer: Gasless Transactions
              </h2>
              
              <div className="space-y-4 text-sm text-gray-300">
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="font-semibold text-red-300 mb-2">Traditional Solana apps require users to:</p>
                  <ol className="list-decimal list-inside space-y-1 text-red-200">
                    <li>Buy SOL on an exchange</li>
                    <li>Transfer SOL to their wallet</li>
                    <li>Keep enough SOL for gas fees</li>
                    <li>Hope they don't run out mid-transaction</li>
                  </ol>
                  <p className="mt-3 text-yellow-300 font-semibold">
                    ⚠️ This creates significant onboarding friction. Many users drop off here.
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="font-semibold text-green-300 mb-2">With LazorKit's Paymaster:</p>
                  <div className="bg-gray-900 rounded p-3 mb-3">
                    <code className="text-xs text-green-300">
                      {`// User only needs USDC
// LazorKit pays the gas
const signature = await signAndSendTransaction({
  instructions: [transferIx],
});
// ✨ Transaction complete - user paid $0 in gas`}
                    </code>
                  </div>
                  <ul className="space-y-2 text-green-200">
                    <li className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Users never touch SOL</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Can use stablecoins immediately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Perfect for payments, commerce, tipping</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Significantly reduced onboarding friction</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="font-semibold text-blue-300 mb-2">Under the Hood:</p>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    LazorKit's paymaster service detects your transaction needs gas, adds their signature to cover the fee, submits the transaction atomically, and the user only signs once while paying nothing. This level of abstraction simplifies the developer experience significantly.
                  </p>
                </div>
              </div>
            </div>

            {/* What You'll Learn */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">What You'll Learn</h2>
              <ul className="space-y-3 text-sm text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>Send USDC tokens without paying SOL for gas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>How LazorKit's paymaster covers transaction fees</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>Create token accounts automatically if needed</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>Build and sign SPL token transfer instructions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>True Web2-like UX - users never worry about gas</span>
                </li>
              </ul>
            </div>

            {/* Code Example */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 overflow-hidden">
              <h2 className="text-xl font-bold text-white mb-4">Code Example</h2>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-300">
                  <code>{`const { signAndSendTransaction } = useWallet();

// Build transfer instruction
const transferIx = createTransferInstruction(
  senderTokenAccount,
  recipientTokenAccount,
  senderPubkey,
  amount * 1_000_000, // USDC has 6 decimals
);

// Send gasless transaction
const signature = await signAndSendTransaction({
  instructions: [transferIx],
});

// No SOL needed! Paymaster covers the fee ✨`}</code>
                </pre>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                LazorKit handles all the complexity. Just build your instructions and send!
              </p>
            </div>
          </div>

          {/* Right Panel - Interactive Demo */}
          <div className="space-y-6 w-full min-w-0">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 lg:sticky lg:top-8">
              <h2 className="text-xl font-bold text-white mb-6">Try It Yourself</h2>

              {!isConnected ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-6">💸</div>
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Connect Your Wallet
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Connect with Face ID to start sending gasless USDC transfers
                  </p>
                  <button
                    onClick={connect}
                    disabled={connecting}
                    className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/50 disabled:opacity-50"
                  >
                    {connecting ? 'Connecting...' : '🔑 Connect Wallet'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Balance Display */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Your USDC Balance</span>
                      <button
                        onClick={fetchBalance}
                        disabled={refreshing}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50 flex items-center gap-1"
                      >
                        <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {usdcBalance !== null ? `${usdcBalance.toFixed(2)} USDC` : 'Loading...'}
                    </div>
                    {usdcBalance === 0 && (
                      <p className="text-xs text-yellow-400 mt-2">
                        ⚠️ No USDC? Get some from{' '}
                        <a href="https://faucet.circle.com/" target="_blank" className="underline">
                          Circle Faucet
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Transfer Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Enter Solana address..."
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Amount (USDC)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                      />
                      {usdcBalance !== null && usdcBalance > 0 && (
                        <button
                          onClick={() => setAmount(usdcBalance.toString())}
                          className="text-xs text-purple-400 hover:text-purple-300 mt-1"
                        >
                          Use Max ({usdcBalance.toFixed(2)})
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={sending || !recipient || !amount || usdcBalance === 0}
                      className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                    >
                      {sending ? '⏳ Sending...' : '⚡ Send USDC (Gasless!)'}
                    </button>
                  </div>

                  {/* Gasless Info */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="text-xl">✨</span>
                      <div>
                        <p className="text-sm text-yellow-200 font-semibold mb-1">
                          100% Gasless
                        </p>
                        <p className="text-xs text-yellow-200">
                          LazorKit's paymaster covers all transaction fees. You don't need any SOL!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Transaction */}
                  {lastTxSignature && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <p className="text-xs text-gray-400 mb-2">Last Transaction:</p>
                      
                      <a href={`https://explorer.solana.com/tx/${lastTxSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 break-all"
                      >
                        {lastTxSignature.slice(0, 20)}...{lastTxSignature.slice(-20)} ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Next Steps */}
            {isConnected && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-3">🎉 Awesome!</h3>
                <p className="text-sm text-gray-300 mb-4">
                  You've mastered gasless transactions! Ready for the advanced recipe?
                </p>
                <Link 
                  href="/recipes/03-subscription-service"
                  className="inline-block w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all text-center text-sm"
                >
                  Next: Recipe 03 - Subscription Service →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { buildInitializeSubscriptionIx } from '@/lib/program/subscription-service';
import { PLANS, PlanId } from '@/lib/constants';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') as PlanId;
  const router = useRouter();
  const { isConnected, wallet, signAndSendTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expiryMonths, setExpiryMonths] = useState(12);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const plan = PLANS[planId];

  useEffect(() => {
    if (!isConnected) {
      router.push('/subscribe');
    }
  }, [isConnected, router]);

  const handleConfirmSubscription = async () => {
    if (!wallet || !plan) return;

    setIsLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const userWallet = new PublicKey(wallet.smartWallet);
      
      setLoadingMessage('Connecting to Solana...');
      
      const rpcEndpoints = [
        'https://api.devnet.solana.com',
        'https://rpc.ankr.com/solana_devnet',
      ];
      
      let connection: Connection | null = null;
      
      for (const endpoint of rpcEndpoints) {
        try {
          console.log('Trying RPC:', endpoint);
          const testConnection = new Connection(endpoint, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
          });
          
          await testConnection.getLatestBlockhash();
          connection = testConnection;
          console.log('Connected to:', endpoint);
          break;
        } catch (err) {
          console.error('RPC failed:', endpoint, err);
          continue;
        }
      }
      
      if (!connection) {
        throw new Error('Could not connect to Solana network. Please check your internet connection and try again.');
      }
      
      const expiryTimestamp = expiryMonths === 0 
        ? undefined 
        : Math.floor(Date.now() / 1000) + (expiryMonths * 30 * 24 * 60 * 60);
      
      console.log('Building subscription transaction...');
      setLoadingMessage('Preparing transaction...');

      const instructions = await buildInitializeSubscriptionIx({
        userWallet,
        amountPerPeriod: plan.price,
        intervalSeconds: plan.interval,
        expiresAt: expiryTimestamp
      }, connection);

      console.log(`Built ${instructions.length} instruction(s)`);
      setLoadingMessage('Please approve with Face ID...');

      const signature = await signAndSendTransaction({
        instructions: instructions,
        transactionOptions: {
          computeUnitLimit: 400_000,
        }
      });

      console.log('✅ Transaction successful!', signature);
      setTxSignature(signature);
      
      setSuccess(true);
      setLoadingMessage('Success! Redirecting...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err: any) {
      console.error('❌ Subscription error:', err);
      
      let errorMsg = 'Failed to create subscription. ';
      
      if (err.message?.includes('already exists')) {
        errorMsg = 'You already have an active subscription. Go to dashboard to manage it.';
      } else if (err.message?.includes('User rejected') || err.message?.includes('rejected')) {
        errorMsg = 'Transaction was cancelled.';
      } else if (err.message?.includes('insufficient')) {
        errorMsg = 'Insufficient funds. You need some SOL for transaction fees and USDC for the subscription.';
      } else if (err.message?.includes('network') || err.message?.includes('connect') || err.message?.includes('fetch')) {
        errorMsg = 'Network connection error. Please check your internet and try again.';
      } else if (err.message?.includes('Load failed')) {
        errorMsg = 'Connection timeout. Please try again with better internet connection.';
      } else {
        errorMsg += err.message || 'Please try again.';
      }
      
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  if (!plan) {
    return (
      <div className="text-center text-white">
        <p>Invalid plan selected</p>
        <Link href="/subscribe" className="text-purple-400 hover:text-purple-300">
          Back to plans
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <nav className="border-b border-white/10 backdrop-blur-lg bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg"></div>
              <span className="text-xl font-bold text-white">LazorSub</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Confirm Subscription</h1>

          <div className="space-y-6 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Plan</span>
              <span className="text-white font-semibold">{plan.name}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Amount</span>
              <span className="text-white font-semibold">${plan.price} USDC</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Billing Cycle</span>
              <span className="text-white font-semibold">Every 30 days</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Subscription Duration</span>
              <select
                value={expiryMonths}
                onChange={(e) => setExpiryMonths(Number(e.target.value))}
                disabled={isLoading}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={0}>No expiry</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-300">Gas Fees</span>
              <span className="text-green-400 font-semibold">$0 (Covered by us)</span>
            </div>

            {wallet && (
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Your Wallet</span>
                <span className="text-white font-mono text-sm">
                  {wallet.smartWallet.slice(0, 6)}...{wallet.smartWallet.slice(-6)}
                </span>
              </div>
            )}
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How it works
            </h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• You'll authorize the subscription with Face ID once</li>
              <li>• We'll create a USDC token account if you don't have one</li>
              <li>• Your token account will delegate authority to the subscription program</li>
              <li>• The program will automatically charge ${plan.price} USDC every 30 days</li>
              <li>• First charge happens after 30 days, not immediately</li>
              <li>• Subscription will {expiryMonths === 0 ? 'continue until cancelled' : `expire after ${expiryMonths} months`}</li>
              <li>• You can cancel anytime to revoke the delegation</li>
            </ul>
          </div>

          {isLoading && loadingMessage && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8">
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-blue-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-blue-400 text-sm font-semibold">{loadingMessage}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-8">
              <p className="text-green-400 text-sm font-semibold mb-2">
                ✓ Subscription created successfully!
              </p>
              {txSignature && (
                
                <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-sm hover:underline"
                >
                  View on Solana Explorer →
                </a>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href="/subscribe"
              className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-center transition-all duration-200"
            >
              Cancel
            </Link>
            <button
              onClick={handleConfirmSubscription}
              disabled={isLoading || success}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
            >
              {isLoading ? (loadingMessage || 'Processing...') : success ? 'Success!' : 'Confirm & Subscribe'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}

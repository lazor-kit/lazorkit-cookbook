'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { PLANS, PlanId } from '@/lib/constants';
import { hasActiveSubscription } from '@/lib/program/subscription-service';

export default function SubscribePage() {
  const { isConnected, wallet } = useWallet();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [existingSubscription, setExistingSubscription] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!wallet) {
        setChecking(false);
        return;
      }

      try {
        const connection = new Connection('https://api.devnet.solana.com');
        const userWallet = new PublicKey(wallet.smartWallet);
        const hasSubscription = await hasActiveSubscription(userWallet, connection);
        setExistingSubscription(hasSubscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setChecking(false);
      }
    };

    checkSubscription();
  }, [wallet]);

  const handleSubscribe = async (planId: string) => {
    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (existingSubscription) {
      alert('You already have an active subscription. Please cancel it first from the dashboard.');
      router.push('/dashboard');
      return;
    }
    
    setSelectedPlan(planId);
    router.push(`/subscribe/confirm?plan=${planId}`);
  };

  const plansArray = Object.values(PLANS);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <nav className="border-b border-white/10 backdrop-blur-lg bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg"></div>
              <span className="text-xl font-bold text-white">LazorSub</span>
            </Link>
            <div className="flex items-center space-x-4">
              {isConnected && wallet && (
                <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300">
            Subscribe with Face ID. No gas fees. Cancel anytime.
          </p>
        </div>

        {existingSubscription && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-400 text-sm text-center">
              ⚠️ You already have an active subscription.{' '}
              <Link href="/dashboard" className="underline">
                Go to dashboard
              </Link>{' '}
              to manage it.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plansArray.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-8 rounded-2xl backdrop-blur-lg border transition-all duration-200 hover:scale-105 ${
                plan.popular
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/50 shadow-lg shadow-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400 ml-2">USDC</span>
                </div>
                <p className="text-gray-400 mt-2">per 30 days</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!isConnected || checking || existingSubscription}
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {checking ? 'Checking...' : !isConnected ? 'Connect Wallet First' : existingSubscription ? 'Already Subscribed' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>

        {!isConnected && (
          <div className="mt-12 p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20 max-w-2xl mx-auto">
            <div className="flex items-start">
              <svg
                className="w-6 h-6 text-yellow-400 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h4 className="text-yellow-400 font-semibold mb-1">Wallet Not Connected</h4>
                <p className="text-gray-300 text-sm">
                  Please connect your wallet using Face ID to subscribe to a plan.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

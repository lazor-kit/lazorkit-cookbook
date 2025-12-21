'use client';

import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@lazorkit/wallet';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const { isConnected, wallet } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (wallet?.smartWallet) {
      navigator.clipboard.writeText(wallet.smartWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-lg bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg"></div>
              <span className="text-xl font-bold text-white">LazorSub</span>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-300">Live on Solana Devnet</span>
          </div>

          {/* Heading */}
          <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
            Subscribe with
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Face ID
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            No seed phrases. No wallet apps. No gas fees.
            <br />
            Just biometric authentication and seamless recurring payments.
          </p>

          {/* Wallet Address Display (when connected) */}
          {isConnected && wallet && (
            <div className="max-w-md mx-auto">
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
                <p className="text-gray-400 text-sm mb-2">Your Wallet Address</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-white font-mono text-sm break-all">
                    {wallet.smartWallet}
                  </code>
                  <button
                    onClick={copyAddress}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 flex-shrink-0"
                  >
                    {copied ? (
                      <span className="text-green-400 text-sm">✓</span>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Copy this address to get devnet SOL & USDC
                </p>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            {isConnected ? (
              <Link
                href="/subscribe"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold text-white shadow-lg shadow-purple-500/50"
              >
                View Plans
              </Link>
            ) : (
              <WalletButton />
            )}
            <button className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-200 font-semibold text-white">
              Learn More
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 pt-20">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl mb-4 flex items-center justify-center text-2xl">
                🔐
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Passwordless</h3>
              <p className="text-gray-400">
                Use Face ID or Touch ID. Your device is your wallet. No private keys to manage.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl mb-4 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Gasless</h3>
              <p className="text-gray-400">
                All transaction fees covered by our paymaster. You never pay gas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl mb-4 flex items-center justify-center text-2xl">
                🔄
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Recurring</h3>
              <p className="text-gray-400">
                Authorize once, payments happen automatically. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500 text-sm">
            Built with Lazorkit SDK • Powered by Solana • Devnet Only
          </p>
        </div>
      </footer>
    </div>
  );
}

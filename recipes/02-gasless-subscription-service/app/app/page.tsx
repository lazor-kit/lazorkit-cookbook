'use client';

import { useWallet } from '@lazorkit/wallet';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function HomePage() {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-300">Live on Solana Devnet</span>
          </div>

          {/* Hero */}
          <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
            Subscribe with
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Face ID
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            No seed phrases. No wallet apps. No gas fees.
            <br />
            Just biometric authentication and seamless recurring payments.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            {isConnected ? (
              <Link 
                href="/subscribe"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold text-white shadow-lg shadow-purple-500/50"
              >
                View Plans
              </Link>
            ) : null}
            
            <button className="px-8 py-4 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-200 font-semibold text-white">
              Learn More
            </button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 pt-20">
            <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl mb-4 flex items-center justify-center text-2xl">
                🔐
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Passwordless</h3>
              <p className="text-gray-400">
                Use Face ID or Touch ID. Your device is your wallet. No private keys to manage.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl mb-4 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Gasless</h3>
              <p className="text-gray-400">
                All transaction fees covered by our paymaster. You never pay gas.
              </p>
            </div>

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

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import Link from 'next/link';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

function getAssociatedTokenAddressSync(
    mint: PublicKey,
    owner: PublicKey
): PublicKey {
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

export default function Recipe01Page() {
  const { wallet, isConnected, connect, disconnect } = useWallet();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isConnected && wallet) {
      fetchBalances();
    } else {
      setSolBalance(null);
      setUsdcBalance(null);
    }
  }, [isConnected, wallet]);

    const fetchBalances = async () => {
        if (!wallet) return;
        setRefreshing(true);
        try {
            const connection = new Connection(RPC_URL);
            const publicKey = new PublicKey(wallet.smartWallet);

            // Fetch SOL balance
            const solBalanceLamports = await connection.getBalance(publicKey);
            setSolBalance(solBalanceLamports / LAMPORTS_PER_SOL);

            // Fetch USDC balance using the working method
            try {
                const userTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
                const accountInfo = await connection.getAccountInfo(userTokenAccount);

                if (!accountInfo) {
                    setUsdcBalance(0);
                    return;
                }

                // Parse token account data (offset 64 = amount as 8 bytes)
                const data = accountInfo.data;
                const amount = Number(data.readBigUInt64LE(64));

                setUsdcBalance(amount / 1_000_000);
            } catch (err: any) {
                console.error('USDC fetch error:', err);
                setUsdcBalance(0);
            }
        } catch (err) {
            console.error('Error fetching balances:', err);
        } finally {
            setRefreshing(false);
        }
    };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connect();
    } catch (err: any) {
      console.error('Connection error:', err);
      
      if (err.message?.includes('popup') || err.message?.includes('blocked')) {
        alert(
          '🚫 Popup Blocked!\n\n' +
          'Please allow popups for this site in your browser settings.'
        );
      } else {
        alert(`Failed to connect: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAirdrop = async () => {
    if (!wallet) return;

    setAirdropping(true);
    try {
      const connection = new Connection(RPC_URL);
      const publicKey = new PublicKey(wallet.smartWallet);
      
      const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature);
      
      alert('✅ Airdrop successful! You received 1 SOL');
      await fetchBalances();
    } catch (err: any) {
      console.error('Airdrop error:', err);
      alert(
        '❌ Airdrop failed!\n\n' +
        'Devnet faucets have rate limits. If this continues to fail, try:\n\n' +
        '• https://faucet.solana.com (SOL)\n' +
        '• https://faucet.circle.com (USDC)\n\n' +
        `Error: ${err.message}`
      );
    } finally {
      setAirdropping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="text-purple-400 hover:text-purple-300 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <div className="flex items-start gap-3 mb-2">
            <span className="text-4xl">👛</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold text-white break-words">
                Recipe 01: Passkey Wallet Basics
              </h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm md:text-base">
            Learn how to create wallets with Face ID, check balances, and interact with Solana
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Panel - Explanation */}
          <div className="space-y-6 w-full min-w-0">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">What You'll Learn</h2>
              <ul className="space-y-3 text-sm md:text-base text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span className="break-words">Create a Solana wallet using passkey authentication (Face ID/Touch ID)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>Connect and disconnect from your wallet</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>Check your SOL and USDC balances</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span>Request devnet SOL airdrops for testing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1 flex-shrink-0">✓</span>
                  <span className="break-words">View your wallet address and explore on Solana Explorer</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">How It Works</h2>
              <div className="space-y-4 text-sm md:text-base text-gray-300">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2">1. Passkey Authentication</h3>
                  <p className="text-sm break-words">
                    Instead of seed phrases, LazorKit uses WebAuthn (Face ID/Touch ID) to secure your wallet. 
                    Your private keys are stored securely and never leave your device.
                  </p>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2">2. Smart Wallet</h3>
                  <p className="text-sm break-words">
                    When you create a wallet, LazorKit generates a smart wallet address on Solana. 
                    This is a regular Solana address that can receive tokens and interact with programs.
                  </p>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-white mb-2">3. No Extensions Needed</h3>
                  <p className="text-sm break-words">
                    Unlike traditional wallets, you don't need to install any browser extensions. 
                    Everything works directly in your browser or mobile app.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-blue-400 mb-2">💡 Pro Tip</h3>
              <p className="text-sm text-blue-200 break-words">
                This demo uses Solana Devnet (test network). Devnet SOL has no real value and is only for testing. 
                In production, you'd connect to Mainnet for real transactions.
              </p>
            </div>

            {/* Code Example */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6 overflow-hidden">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Code Example</h2>
              <div className="bg-gray-900 rounded-lg p-3 md:p-4 overflow-x-auto">
                <pre className="text-xs md:text-sm text-gray-300">
                  <code>{`import { useWallet } from '@lazorkit/wallet';

function MyComponent() {
  const { wallet, connect } = useWallet();
  
  return (
    <button onClick={connect}>
      {wallet ? wallet.smartWallet : 'Connect'}
    </button>
  );
}`}</code>
                </pre>
              </div>
              <p className="text-xs md:text-sm text-gray-400 mt-3 break-words">
                That's it! Just one hook to access the entire wallet functionality.
              </p>
            </div>
          </div>

          {/* Right Panel - Interactive Demo */}
          <div className="space-y-6 w-full min-w-0">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 md:p-8 lg:sticky lg:top-8">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Try It Yourself</h2>

              {!isConnected ? (
                <div className="text-center py-8 md:py-12">
                  <div className="text-5xl md:text-6xl mb-6">🔐</div>
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-4">
                    Create Your Wallet
                  </h3>
                  <p className="text-sm md:text-base text-gray-400 mb-6 break-words">
                    Click the button below to create a wallet using Face ID or Touch ID
                  </p>
                  <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/50 disabled:opacity-50 text-sm md:text-base"
                  >
                    {loading ? 'Creating Wallet...' : '🔑 Create Wallet with Passkey'}
                  </button>

                  <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-200 break-words">
                      If popup is blocked, you need to allow popups for LazorKit connection portal to come up.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Wallet Info */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0"></span>
                      <span className="text-green-400 font-semibold">Connected</span>
                    </div>
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-white bg-black/30 px-2 py-2 rounded flex-1 overflow-x-auto break-all">
                            {wallet?.smartWallet}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(wallet?.smartWallet || '');
                              alert('Address copied!');
                            }}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-sm flex-shrink-0"
                          >
                            📋
                          </button>
                        </div>
                      </div>

                      {/* Balances */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">SOL Balance</div>
                          <div className="text-xl md:text-2xl font-bold text-white">
                            {solBalance !== null ? `${solBalance.toFixed(4)}` : '...'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">USDC Balance</div>
                          <div className="text-xl md:text-2xl font-bold text-white">
                            {usdcBalance !== null ? `${usdcBalance.toFixed(2)}` : '...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={handleAirdrop}
                      disabled={airdropping}
                      className="w-full px-4 md:px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm md:text-base"
                    >
                      {airdropping ? '⏳ Requesting...' : '💧 Request 1 SOL Airdrop'}
                    </button>

                      <a href="https://faucet.circle.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 md:px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 rounded-lg font-semibold transition-all text-center text-sm md:text-base"
                      >
                      💵 Request USDC (Circle Faucet) ↗
                  </a>
                    {/* Faucet Links */}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <div className="text-xs text-gray-400 text-center">
                            Having issues? Try the faucets directly:
                            <a href="https://faucet.solana.com/" target="_blank" className="text-purple-400 hover:text-purple-300 ml-1">SOL</a>
                            {' / '}
                            <a href="https://faucet.circle.com/" target="_blank" className="text-purple-400 hover:text-purple-300">USDC</a>
                        </div>
                    </div>

                      <button
                          onClick={fetchBalances}
                          disabled={refreshing}
                          className="w-full px-4 md:px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 rounded-lg font-semibold transition-all text-sm md:text-base disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                          {refreshing ? 'Refreshing...' : 'Refresh Balances'}
                      </button>

                    
                    <a href={`https://explorer.solana.com/address/${wallet?.smartWallet}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 md:px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg font-semibold transition-all text-center text-sm md:text-base"
                    >
                      🔍 View on Explorer ↗
                    </a>

                    <button
                      onClick={disconnect}
                      className="w-full px-4 md:px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-lg font-semibold transition-all text-sm md:text-base"
                    >
                      🔌 Disconnect
                    </button>
                  </div>

                  {/* Info */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-xs md:text-sm text-yellow-200 break-words">
                      💡 Your wallet is secured by your device's biometrics. 
                      No seed phrase needed - just your Face ID or Touch ID!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Next Steps */}
            {isConnected && (
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold text-white mb-3">🎉 Great Job!</h3>
                <p className="text-sm md:text-base text-gray-300 mb-4 break-words">
                  You've successfully created a wallet with passkeys! Ready for the next step?
                </p>
                <Link 
                  href="/recipes/02-gasless-transfer"
                  className="inline-block w-full md:w-auto px-4 md:px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all text-center text-sm md:text-base"
                >
                  Next: Recipe 02 - Gasless Transfers →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

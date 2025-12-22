'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { getUSDCBalance } from '@/lib/program/subscription-service';

export default function Navigation() {
    const { isConnected, wallet, connect, disconnect } = useWallet();
    const router = useRouter();
    const [balances, setBalances] = useState({ sol: '0', usdc: '0' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isConnected && wallet) {
            fetchBalances();
            
            // Refresh balances every 10 seconds
            const interval = setInterval(fetchBalances, 10000);
            return () => clearInterval(interval);
        }
    }, [isConnected, wallet?.smartWallet]);

    const fetchBalances = async () => {
        if (!wallet) return;

        try {
            const connection = new Connection('https://api.devnet.solana.com');
            const userWallet = new PublicKey(wallet.smartWallet);

            // Get SOL balance
            const solBalance = await connection.getBalance(userWallet);
            
            // Get USDC balance
            const usdcBalance = await getUSDCBalance(userWallet, connection);

            setBalances({
                sol: (solBalance / 1e9).toFixed(4),
                usdc: usdcBalance.toFixed(2)
            });
        } catch (err) {
            console.error('Error fetching balances:', err);
        }
    };

    const handleConnect = async () => {
        setLoading(true);
        try {
            await connect();
        } catch (err) {
            console.error('Connection error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            disconnect();
            router.push('/');
        }
    };

    return (
        <nav className="border-b border-white/10 backdrop-blur-lg bg-black/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg"></div>
                        <span className="text-xl font-bold text-white">LazorSub</span>
                    </Link>

                    {/* Right side */}
                    <div className="flex items-center space-x-4">
                        {isConnected && wallet ? (
                            <>
                                {/* Dashboard Link */}
                                <Link
                                    href="/dashboard"
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all hidden md:block"
                                >
                                    Dashboard
                                </Link>

                                {/* Balances Card */}
                                <div className="flex items-center space-x-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-400 font-medium">SOL</span>
                                        <span className="text-sm font-bold text-white">{balances.sol}</span>
                                    </div>
                                    <div className="w-px h-4 bg-white/20"></div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-400 font-medium">USDC</span>
                                        <span className="text-sm font-bold text-white">{balances.usdc}</span>
                                    </div>
                                </div>

                                {/* Wallet Address */}
                                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                    <span className="text-sm text-gray-300 font-mono">
                                        {wallet.smartWallet.slice(0, 4)}...{wallet.smartWallet.slice(-4)}
                                    </span>
                                </div>

                                {/* Logout Button */}
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition-all"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleConnect}
                                disabled={loading}
                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold text-white shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Connecting...' : 'Connect with Face ID'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

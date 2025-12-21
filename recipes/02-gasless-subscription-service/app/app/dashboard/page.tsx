'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { getSubscriptionPDA, buildCancelSubscriptionIx, MERCHANT_WALLET } from '@/lib/program/subscription-service';

export default function DashboardPage() {
    const { isConnected, wallet, signAndSendTransaction } = useWallet();
    const router = useRouter();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [subscriptionAddress, setSubscriptionAddress] = useState<string>('');

    useEffect(() => {
        if (!isConnected) {
            router.push('/');
            return;
        }
        
        if (wallet) {
            checkSubscription();
        }
    }, [isConnected, wallet?.smartWallet]);

    const checkSubscription = async () => {
        if (!wallet) return;

        setLoading(true);
        try {
            const connection = new Connection('https://api.devnet.solana.com');
            const userWallet = new PublicKey(wallet.smartWallet);
            const [subscriptionPDA] = getSubscriptionPDA(userWallet, MERCHANT_WALLET);
            
            console.log('Checking subscription at:', subscriptionPDA.toBase58());
            
            const accountInfo = await connection.getAccountInfo(subscriptionPDA);
            const exists = accountInfo !== null;
            
            console.log('Subscription exists:', exists);
            
            setHasSubscription(exists);
            setSubscriptionAddress(subscriptionPDA.toBase58());
        } catch (err) {
            console.error('Error checking subscription:', err);
            setHasSubscription(false);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!wallet || !confirm('Are you sure you want to cancel your subscription?')) return;

        setCancelling(true);
        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const instruction = await buildCancelSubscriptionIx(userWallet);

            console.log('Sending cancel transaction...');
            const signature = await signAndSendTransaction({
                instructions: [instruction],
                transactionOptions: { computeUnitLimit: 200_000 }
            });

            console.log('✅ Subscription cancelled:', signature);
            alert('Subscription cancelled successfully!');
            
            // Immediately update UI
            setHasSubscription(false);
            
            // Also refresh from chain to be sure
            setTimeout(() => {
                checkSubscription();
            }, 2000);
            
        } catch (err: any) {
            console.error('❌ Cancel error:', err);
            
            if (err.message?.includes('already') || err.message?.includes('cancelled')) {
                alert('Subscription is already cancelled.');
                setHasSubscription(false);
            } else {
                alert(`Failed to cancel: ${err.message}`);
            }
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
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
                        {wallet && (
                            <span className="text-sm text-gray-300 font-mono">
                                {wallet.smartWallet.slice(0, 6)}...{wallet.smartWallet.slice(-6)}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

                {!hasSubscription ? (
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-2xl font-semibold text-white mb-4">No Active Subscriptions</h3>
                        <Link href="/subscribe" className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                            Browse Plans
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Active Subscription</h3>
                                <p className="text-gray-400">$0.1 USDC / month</p>
                            </div>
                            <div className="flex flex-col items-end space-y-3">
                                <span className="px-4 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-sm font-semibold">
                                    Active
                                </span>
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold text-sm disabled:opacity-50 transition-all"
                                >
                                    {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Billing:</span>
                                <span className="text-white">Every 30 days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Next charge:</span>
                                <span className="text-white">In 30 days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Subscription Address:</span>
                                <a 
                                    href={`https://explorer.solana.com/address/${subscriptionAddress}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline text-sm font-mono"
                                >
                                    {subscriptionAddress.slice(0, 8)}...
                                </a>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-blue-400 text-sm">
                                ℹ️ You were charged $0.1 USDC upfront. Next charge in 30 days.
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { getSubscriptionPDA, buildCancelSubscriptionIx, buildCleanupCancelledSubscriptionIx, MERCHANT_WALLET } from '@/lib/program/subscription-service';
import Navigation from '@/components/Navigation';

export default function DashboardPage() {
    const { isConnected, wallet, signAndSendTransaction } = useWallet();
    const router = useRouter();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [subscriptionAddress, setSubscriptionAddress] = useState<string>('');
    const [subscriptionData, setSubscriptionData] = useState<any>(null);

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

            console.log('🔍 Checking subscription at:', subscriptionPDA.toBase58());

            const accountInfo = await connection.getAccountInfo(subscriptionPDA, 'confirmed');

            console.log('📊 Account exists:', accountInfo !== null);

            if (accountInfo) {
                // Parse the is_active flag (it's after all the pubkeys and numbers)
                // Offset: 8 (discriminator) + 32*5 (pubkeys) + 8*3 (u64s) + 8*2 (i64s) + 1 (option tag) + 8 (option value if present)
                const data = accountInfo.data;
                let offset = 8 + 32 * 5 + 8 + 8 + 8 + 8;

                // Check for expires_at option
                const hasExpiresAt = data[offset] === 1;
                offset += 1;
                if (hasExpiresAt) {
                    offset += 8;
                }

                const isActive = data[offset] === 1;

                console.log('📊 Is Active:', isActive);

                setHasSubscription(isActive);
                setSubscriptionData({ isActive, accountExists: true });
            } else {
                setHasSubscription(false);
                setSubscriptionData(null);
            }

            setSubscriptionAddress(subscriptionPDA.toBase58());
        } catch (err) {
            console.error('❌ Error checking subscription:', err);
            setHasSubscription(false);
            setSubscriptionData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!wallet || !confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) return;

        setCancelling(true);
        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const instruction = await buildCancelSubscriptionIx(userWallet);

            console.log('📤 Sending cancel transaction...');
            const signature = await signAndSendTransaction({
                instructions: [instruction],
                transactionOptions: { computeUnitLimit: 200_000 }
            });

            console.log('✅ Transaction signature:', signature);

            const connection = new Connection('https://api.devnet.solana.com');
            console.log('⏳ Waiting for confirmation...');

            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            console.log('✅ Confirmation:', confirmation);

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            alert(`Subscription cancelled successfully!\n\nView on explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);

            setHasSubscription(false);

            setTimeout(async () => {
                console.log('🔄 Double-checking subscription status...');
                await checkSubscription();
            }, 3000);

        } catch (err: any) {
            console.error('❌ Cancel error:', err);
            alert(`Failed to cancel subscription:\n${err.message || err}`);
        } finally {
            setCancelling(false);
        }
    };

    const handleCleanup = async () => {
        if (!wallet || !confirm('This will cleanup your old cancelled subscription and refund the rent. Continue?')) return;

        setCleaning(true);
        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const instruction = await buildCleanupCancelledSubscriptionIx(userWallet);

            console.log('📤 Sending cleanup transaction...');
            const signature = await signAndSendTransaction({
                instructions: [instruction],
                transactionOptions: { computeUnitLimit: 200_000 }
            });

            console.log('✅ Cleanup transaction signature:', signature);

            const connection = new Connection('https://api.devnet.solana.com');
            console.log('⏳ Waiting for confirmation...');

            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            console.log('✅ Confirmation:', confirmation);

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            alert(`Old subscription cleaned up successfully!\n\nRent refunded to your wallet.\n\nView on explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);

            setTimeout(async () => {
                console.log('🔄 Refreshing...');
                await checkSubscription();
            }, 2000);

        } catch (err: any) {
            console.error('❌ Cleanup error:', err);
            alert(`Failed to cleanup subscription:\n${err.message || err}`);
        } finally {
            setCleaning(false);
        }
    };

    const handleProcessPayment = async () => {
        setProcessing(true);
        try {
            alert('Manual payment processing coming soon!\n\nThis will trigger the backend cron job to charge all active subscriptions.');
        } catch (err: any) {
            alert(`Failed: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
                <Navigation />
                <div className="flex items-center justify-center py-20">
                    <div className="text-white text-lg">Loading your dashboard...</div>
                </div>
            </div>
        );
    }

    // Show cleanup option if account exists but is not active
    const showCleanup = subscriptionData?.accountExists && !subscriptionData?.isActive;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Dashboard</h1>
                    <button
                        onClick={checkSubscription}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all"
                    >
                        🔄 Refresh
                    </button>
                </div>

                {/* Cleanup Banner - Show if old cancelled subscription exists */}
                {showCleanup && (
                    <div className="mb-8">
                        <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-6 backdrop-blur-lg">
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">🧹</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-orange-400 mb-2">
                                        Old Cancelled Subscription Found
                                    </h3>
                                    <p className="text-orange-200 mb-4">
                                        You have an old cancelled subscription account that can be cleaned up to recover rent (~0.002 SOL).
                                    </p>
                                    <button
                                        onClick={handleCleanup}
                                        disabled={cleaning}
                                        className="px-6 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {cleaning ? 'Cleaning Up...' : '🧹 Cleanup & Recover Rent'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!hasSubscription && !showCleanup ? (
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-12 text-center">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-2xl font-semibold text-white mb-4">No Active Subscriptions</h3>
                        <p className="text-gray-400 mb-6">Subscribe to get started with gasless recurring payments</p>
                        <Link href="/subscribe" className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all shadow-lg shadow-purple-500/50">
                            Browse Plans →
                        </Link>
                    </div>
                ) : hasSubscription ? (
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">Active Subscription</h3>
                                    <p className="text-xl text-gray-400">$0.10 USDC <span className="text-sm">/ month</span></p>
                                </div>
                                <div className="flex flex-col items-end space-y-3">
                                    <span className="px-4 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-sm font-semibold flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        Active
                                    </span>
                                    <button
                                        onClick={handleCancel}
                                        disabled={cancelling}
                                        className="px-5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 bg-white/5 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Billing Cycle:</span>
                                    <span className="text-white font-medium">Every 30 days</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Next Charge:</span>
                                    <span className="text-white font-medium">In 30 days</span>
                                </div>
                                <div className="border-t border-white/10 pt-3 mt-3"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Contract Address:</span>
                                    <a
                                        href={`https://explorer.solana.com/address/${subscriptionAddress}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-sm font-mono transition-colors"
                                    >
                                        {subscriptionAddress.slice(0, 8)}...{subscriptionAddress.slice(-4)} ↗
                                    </a>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-blue-400 text-sm flex items-start gap-2">
                                    <span className="text-lg">ℹ️</span>
                                    <span>First charge occurs 30 days after subscription creation.</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                            <div className="flex items-start gap-3 mb-4">
                                <span className="text-2xl">⚙️</span>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Admin Controls</h3>
                                    <p className="text-gray-400 text-sm mt-1">Testing and backend operations</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={handleProcessPayment}
                                    disabled={processing}
                                    className="w-full px-6 py-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? '⏳ Processing...' : '⚡ Trigger Payment Processing'}
                                </button>

                                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <p className="text-yellow-400 text-xs flex items-start gap-2">
                                        <span>⚠️</span>
                                        <span>Simulates backend cron job for testing</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
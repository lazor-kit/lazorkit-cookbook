'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { buildInitializeSubscriptionIx, hasActiveSubscription } from '@/lib/program/subscription-service';
import Navigation from '@/components/Navigation';

export default function SubscribePage() {
    const { isConnected, wallet, signAndSendTransaction } = useWallet();
    const router = useRouter();
    const [subscribing, setSubscribing] = useState(false);
    const [checking, setChecking] = useState(true);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [showFeeInfo, setShowFeeInfo] = useState(false);

    useEffect(() => {
        if (!isConnected) {
            router.push('/');
            return;
        }

        if (wallet) {
            checkExistingSubscription();
        }
    }, [isConnected, wallet]);

    const checkExistingSubscription = async () => {
        if (!wallet) return;

        setChecking(true);
        try {
            const connection = new Connection('https://api.devnet.solana.com');
            const userWallet = new PublicKey(wallet.smartWallet);
            const hasActive = await hasActiveSubscription(userWallet, connection);
            setHasSubscription(hasActive);
        } catch (err) {
            console.error('Error checking subscription:', err);
            setHasSubscription(false);
        } finally {
            setChecking(false);
        }
    };

    const handleSubscribe = async () => {
        if (!wallet) return;

        if (hasSubscription) {
            alert('You already have an active subscription!\n\nPlease cancel your existing subscription first.');
            return;
        }

        setSubscribing(true);
        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const connection = new Connection('https://api.devnet.solana.com');

            console.log('🚀 Creating subscription...');

            const instructions = await buildInitializeSubscriptionIx(
                {
                    userWallet,
                    amountPerPeriod: 0.1,
                    intervalSeconds: 30 * 24 * 60 * 60,
                },
                connection
            );

            const signature = await signAndSendTransaction({
                instructions,
                transactionOptions: { computeUnitLimit: 400_000 }
            });

            console.log('✅ Subscription created:', signature);
            alert(`Subscription created successfully!\n\nView transaction:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);

            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (err: any) {
            console.error('❌ Subscription error:', err);

            let errorMessage = err.message || err;

            if (errorMessage.includes('already exists')) {
                errorMessage = 'You already have an active subscription!\n\nPlease cancel your existing subscription first.';
                setHasSubscription(true);
            }

            alert(`Failed to create subscription:\n${errorMessage}`);
        } finally {
            setSubscribing(false);
        }
    };

    if (!isConnected || checking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
                <Navigation />
                <div className="flex items-center justify-center py-20">
                    <div className="text-white text-lg">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4">Choose Your Plan</h1>
                    <p className="text-xl text-gray-300">Simple, transparent pricing. Cancel anytime.</p>
                </div>

                {/* Fee Information Banner */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 backdrop-blur-lg">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">ℹ️</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-blue-300 mb-2">
                                    How Payments Work
                                </h3>
                                <div className="space-y-2 text-blue-200 text-sm">
                                    <p>
                                        <strong>One-time setup:</strong> ~$0.0005 (0.002 SOL) to create your subscription account
                                    </p>
                                    <p>
                                        <strong>Transaction fees:</strong> $0 - paid by our paymaster (gasless for you!)
                                    </p>
                                    <p>
                                        <strong>On cancellation:</strong> Full refund of setup fee
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowFeeInfo(!showFeeInfo)}
                                    className="mt-3 text-blue-400 hover:text-blue-300 text-xs underline"
                                >
                                    {showFeeInfo ? 'Hide' : 'Learn more'} about fees
                                </button>

                                {showFeeInfo && (
                                    <div className="mt-4 pt-4 border-t border-blue-500/20 text-xs text-blue-300 space-y-2">
                                        <p><strong>Why the setup fee?</strong></p>
                                        <p>
                                            Solana requires rent (~0.002 SOL) for creating accounts.
                                            This prevents spam and you get it back when you cancel!
                                        </p>
                                        <p className="pt-2"><strong>Cost breakdown:</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-2">
                                            <li>Setup: ~$0.0005 (refundable)</li>
                                            <li>All gas fees: $0 (paid by paymaster)</li>
                                            <li>Net lifetime cost: <strong>$0</strong></li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Existing Subscription Banner */}
                {hasSubscription && (
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl p-6 backdrop-blur-lg">
                            <div className="flex items-start gap-4">
                                <div className="text-3xl">⚠️</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-yellow-400 mb-2">
                                        You Already Have an Active Subscription
                                    </h3>
                                    <p className="text-yellow-200 mb-4">
                                        Please cancel your existing subscription before creating a new one.
                                    </p>
                                    <Link
                                        href="/dashboard"
                                        className="inline-block px-6 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 font-semibold transition-all"
                                    >
                                        Go to Dashboard →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Plan Card */}
                <div className="max-w-lg mx-auto">
                    <div className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 transition-all ${hasSubscription ? 'opacity-50 pointer-events-none' : 'hover:border-purple-500/50'}`}>
                        <div className="text-center mb-6">
                            <div className="inline-block px-4 py-1 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-300 text-sm font-semibold mb-4">
                                POPULAR
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Premium Plan</h2>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-5xl font-bold text-white">$0.10</span>
                                <span className="text-gray-400">USDC / month</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <span className="text-green-400 text-xs">✓</span>
                                </div>
                                <span className="text-gray-300">Automatic recurring billing</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <span className="text-green-400 text-xs">✓</span>
                                </div>
                                <span className="text-gray-300">Zero gas fees</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <span className="text-green-400 text-xs">✓</span>
                                </div>
                                <span className="text-gray-300">Cancel anytime</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <span className="text-green-400 text-xs">✓</span>
                                </div>
                                <span className="text-gray-300">Face ID authentication</span>
                            </div>
                        </div>

                        <button
                            onClick={handleSubscribe}
                            disabled={subscribing || hasSubscription}
                            className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold text-white shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {subscribing ? 'Creating Subscription...' : hasSubscription ? 'Already Subscribed' : 'Subscribe Now'}
                        </button>

                        <p className="text-center text-gray-500 text-sm mt-4">
                            First charge in 30 days • Devnet only
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
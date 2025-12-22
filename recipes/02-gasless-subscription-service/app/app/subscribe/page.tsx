'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import { buildInitializeSubscriptionIx, hasActiveSubscription } from '@/lib/program/subscription-service';
import Navigation from '@/components/Navigation';
import {
    getAllPlans,
    SUBSCRIPTION_CONSTANTS,
    PlanFeatures,
    getBadgeColorClasses,
    getGradientClasses
} from '@/lib/constants';

export default function SubscribePage() {
    const { isConnected, wallet, signAndSendTransaction } = useWallet();
    const router = useRouter();
    const [subscribing, setSubscribing] = useState(false);
    const [checking, setChecking] = useState(true);
    const [hasSubscription, setHasSubscription] = useState(false);
    const [showFeeInfo, setShowFeeInfo] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    const plans = getAllPlans();

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
            const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);
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

    const handleSubscribe = async (plan: PlanFeatures) => {
        if (!wallet) return;

        if (hasSubscription) {
            alert('You already have an active subscription!\n\nPlease cancel your existing subscription first.');
            return;
        }

        setSubscribing(true);
        setSelectedPlanId(plan.id);

        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);

            console.log(`🚀 Creating ${plan.name} subscription with prepaid first payment...`);

            const instructions = await buildInitializeSubscriptionIx(
                {
                    userWallet,
                    amountPerPeriod: plan.price,
                    intervalSeconds: plan.interval,
                },
                connection
            );

            console.log(`📦 Built ${instructions.length} instruction(s)`);

            const signature = await signAndSendTransaction({
                instructions,
                transactionOptions: {
                    computeUnitLimit: SUBSCRIPTION_CONSTANTS.COMPUTE_UNIT_LIMIT
                }
            });

            console.log('✅ Subscription created:', signature);
            alert(
                `${plan.displayName} subscription created successfully!\n\n` +
                `💰 First payment of ${plan.priceDisplay} USDC charged immediately!\n\n` +
                `View transaction:\nhttps://explorer.solana.com/tx/${signature}?cluster=${SUBSCRIPTION_CONSTANTS.NETWORK}`
            );

            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (err: any) {
            console.error('❌ Subscription error:', err);

            let errorMessage = err.message || String(err);

            if (errorMessage.includes('already exists')) {
                errorMessage = 'You already have an active subscription!\n\nPlease cancel your existing subscription first.';
                setHasSubscription(true);
            } else if (errorMessage.includes('Load failed')) {
                errorMessage = 'Transaction failed to complete. This might be a temporary issue.\n\nPlease try again in a few seconds.';
            } else if (errorMessage.includes('insufficient funds')) {
                errorMessage = `Insufficient USDC balance.\n\nPlease make sure you have at least ${plan.priceDisplay} USDC in your wallet.`;
            }

            alert(`Failed to create subscription:\n${errorMessage}`);
        } finally {
            setSubscribing(false);
            setSelectedPlanId(null);
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
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 backdrop-blur-lg">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">ℹ️</div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-blue-300 mb-2">
                                    How Payments Work
                                </h3>
                                <div className="space-y-2 text-blue-200 text-sm">
                                    <p>
                                        <strong>One-time setup:</strong> ~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_USD.toFixed(4)} ({SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL) to create your subscription account
                                    </p>
                                    <p>
                                        <strong>First payment:</strong> Charged immediately when you subscribe (prepaid)
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
                                            Solana requires rent (~{SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL) for creating accounts.
                                            This prevents spam and you get it back when you cancel!
                                        </p>
                                        <p className="pt-2"><strong>Cost breakdown:</strong></p>
                                        <ul className="list-disc list-inside space-y-1 pl-2">
                                            <li>Setup: ~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_USD.toFixed(4)} (refundable on cancel)</li>
                                            <li>First payment: Plan price (charged immediately)</li>
                                            <li>All gas fees: $0 (paid by paymaster)</li>
                                            <li>Net lifetime cost: Just the subscription fees</li>
                                        </ul>
                                        <p className="pt-2 text-blue-400">
                                            <strong>Prepaid model:</strong> We charge your first month upfront, then automatically every 30 days.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Existing Subscription Banner */}
                {hasSubscription && (
                    <div className="max-w-4xl mx-auto mb-8">
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

                {/* Plan Cards Grid */}
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 transition-all ${
                                hasSubscription
                                    ? 'opacity-50 pointer-events-none'
                                    : plan.popular
                                        ? 'border-purple-500/50 scale-105'
                                        : 'hover:border-white/30'
                            }`}
                        >
                            <div className="text-center mb-6">
                                {plan.badge && (
                                    <div className={`inline-block px-4 py-1 rounded-full ${getBadgeColorClasses(plan.badgeColor)} text-sm font-semibold mb-4`}>
                                        {plan.badge}
                                    </div>
                                )}
                                <h2 className="text-3xl font-bold text-white mb-2">{plan.displayName}</h2>
                                {plan.description && (
                                    <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                                )}
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-5xl font-bold text-white">{plan.priceDisplay}</span>
                                    <span className="text-gray-400">USDC / {plan.intervalDisplay}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                {plan.features.map((feature, index) => (
                                    <div key={index} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-green-400 text-xs">✓</span>
                                        </div>
                                        <span className="text-gray-300 text-sm">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleSubscribe(plan)}
                                disabled={subscribing || hasSubscription}
                                className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${getGradientClasses(plan.popular)}`}
                            >
                                {subscribing && selectedPlanId === plan.id
                                    ? 'Creating...'
                                    : hasSubscription
                                        ? 'Already Subscribed'
                                        : `Subscribe to ${plan.name}`}
                            </button>

                            <p className="text-center text-gray-500 text-xs mt-4">
                                Charged immediately, then every 30 days
                            </p>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <p className="text-gray-400 text-sm">
                        {SUBSCRIPTION_CONSTANTS.NETWORK === 'devnet' ? '🧪 Running on Devnet' : ''}
                    </p>
                </div>
            </main>
        </div>
    );
}
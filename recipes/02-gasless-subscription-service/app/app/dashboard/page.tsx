'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@lazorkit/wallet';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicKey, Connection } from '@solana/web3.js';
import {
    getSubscriptionPDA, buildCancelSubscriptionIx, buildCleanupCancelledSubscriptionIx, MERCHANT_WALLET,
    SUBSCRIPTION_PROGRAM_ID
} from '@/lib/program/subscription-service';
import Navigation from '@/components/Navigation';
import {
    SUBSCRIPTION_CONSTANTS,
    formatPrice,
    getPlanById,
    formatInterval
} from '@/lib/constants';

interface SubscriptionData {
    authority: string;
    recipient: string;
    userTokenAccount: string;
    recipientTokenAccount: string;
    tokenMint: string;
    amountPerPeriod: number;
    intervalSeconds: number;
    lastChargeTimestamp: number;
    createdAt: number;
    expiresAt: number | null;
    isActive: boolean;
    totalCharged: number;
    bump: number;
}

export default function DashboardPage() {
    const { isConnected, wallet, signAndSendTransaction } = useWallet();
    const router = useRouter();
    const [hasSubscription, setHasSubscription] = useState(false);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [cleaning, setCleaning] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [subscriptionAddress, setSubscriptionAddress] = useState<string>('');
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
    const [lastTriggerTime, setLastTriggerTime] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);


    useEffect(() => {
        if (!isConnected) {
            router.push('/');
            return;
        }

        if (wallet) {
            // CRITICAL FIX: Force reset state before checking to prevent showing stale data
            setHasSubscription(false);
            setSubscriptionData(null);
            setLoading(true);

            checkSubscription();
        }
    }, [isConnected, wallet?.smartWallet]);

    useEffect(() => {
        if (cooldownRemaining <= 0) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, 60 - Math.floor((Date.now() - lastTriggerTime) / 1000));
            setCooldownRemaining(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [lastTriggerTime, cooldownRemaining]);

    const parseSubscriptionData = (data: Buffer): SubscriptionData => {
        let offset = 8;

        const authority = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;

        const recipient = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;

        const userTokenAccount = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;

        const recipientTokenAccount = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;

        const tokenMint = new PublicKey(data.slice(offset, offset + 32)).toBase58();
        offset += 32;

        const amountPerPeriod = Number(data.readBigUInt64LE(offset)) / 1_000_000;
        offset += 8;

        const intervalSeconds = Number(data.readBigInt64LE(offset));
        offset += 8;

        const lastChargeTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8;

        const createdAt = Number(data.readBigInt64LE(offset));
        offset += 8;

        const hasExpiry = data.readUInt8(offset) === 1;
        offset += 1;

        let expiresAt: number | null = null;
            if (hasExpiry) {
                expiresAt = Number(data.readBigInt64LE(offset));
            offset += 8;
        }

        const isActive = data.readUInt8(offset) === 1;
        offset += 1;

        const totalCharged = Number(data.readBigUInt64LE(offset)) / 1_000_000;
        offset += 8;

        const bump = data.readUInt8(offset);

        return {
            authority,
            recipient,
            userTokenAccount,
            recipientTokenAccount,
            tokenMint,
            amountPerPeriod,
            intervalSeconds,
            lastChargeTimestamp,
            createdAt,
            expiresAt,
            isActive,
            totalCharged,
            bump,
        };
    };

    const checkSubscription = async () => {
        if (!wallet) return;

        setLoading(true);
        try {
            const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);
            const userWallet = new PublicKey(wallet.smartWallet);
            const [subscriptionPDA] = getSubscriptionPDA(userWallet, MERCHANT_WALLET);

            console.log('🔍 Checking subscription at:', subscriptionPDA.toBase58());

            const accountInfo = await connection.getAccountInfo(subscriptionPDA, 'confirmed');

            console.log('📊 Account exists:', accountInfo !== null);

            if (accountInfo) {
                const parsedData = parseSubscriptionData(accountInfo.data);

                console.log('📊 Parsed subscription data:', parsedData);
                console.log('📊 Is Active:', parsedData.isActive);
                console.log('📊 Amount:', parsedData.amountPerPeriod, 'USDC');
                console.log('📊 Total Charged:', parsedData.totalCharged, 'USDC');

                setHasSubscription(parsedData.isActive);
                setSubscriptionData(parsedData);
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
        if (!wallet || !subscriptionData) return;

        const confirmed = confirm(
            `Are you sure you want to cancel your subscription?\n\n` +
            `Plan: ${formatPrice(subscriptionData.amountPerPeriod)} USDC/${formatInterval(subscriptionData.intervalSeconds)}\n` +
            `Total charged: ${formatPrice(subscriptionData.totalCharged)} USDC\n\n` +
            `You'll receive a refund of ~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL (setup fee).`
        );

        if (!confirmed) return;

        setCancelling(true);
        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const instruction = await buildCancelSubscriptionIx(userWallet);

            console.log('📤 Sending cancel transaction...');
            const signature = await signAndSendTransaction({
                instructions: [instruction],
                transactionOptions: { computeUnitLimit: SUBSCRIPTION_CONSTANTS.COMPUTE_UNIT_LIMIT }
            });

            console.log('✅ Transaction signature:', signature);

            const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);
            console.log('⏳ Waiting for confirmation...');

            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            console.log('✅ Confirmation:', confirmation);

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            alert(
                `Subscription cancelled successfully!\n\n` +
                `Setup fee refunded: ~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL\n\n` +
                `View on explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=${SUBSCRIPTION_CONSTANTS.NETWORK}`
            );

            // Force reset state
            setHasSubscription(false);
            setSubscriptionData(null);

            setTimeout(async () => {
                console.log('🔄 Double-checking subscription status...');
                setLoading(true);
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
        if (!wallet) return;

        const confirmed = confirm(
            `This will cleanup your old cancelled subscription and refund the rent.\n\n` +
            `Refund amount: ~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL\n\n` +
            `Continue?`
        );

        if (!confirmed) return;

        setCleaning(true);
        try {
            const userWallet = new PublicKey(wallet.smartWallet);
            const instruction = await buildCleanupCancelledSubscriptionIx(userWallet);

            console.log('📤 Sending cleanup transaction...');
            const signature = await signAndSendTransaction({
                instructions: [instruction],
                transactionOptions: { computeUnitLimit: SUBSCRIPTION_CONSTANTS.COMPUTE_UNIT_LIMIT }
            });

            console.log('✅ Cleanup transaction signature:', signature);

            const connection = new Connection(SUBSCRIPTION_CONSTANTS.RPC_URL);
            console.log('⏳ Waiting for confirmation...');

            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            console.log('✅ Confirmation:', confirmation);

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            alert(
                `Old subscription cleaned up successfully!\n\n` +
                `Rent refunded to your wallet: ~${SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL\n\n` +
                `View on explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=${SUBSCRIPTION_CONSTANTS.NETWORK}`
            );

            // Force reset state before refreshing
            setHasSubscription(false);
            setSubscriptionData(null);
            setLoading(true);

            setTimeout(async () => {
                await checkSubscription();
            }, 2000);

        } catch (err: any) {
            console.error('❌ Cleanup error:', err);
            alert(`Failed to cleanup:\n${err.message || err}`);
        } finally {
            setCleaning(false);
        }
    };

    const handleProcessPayment = async () => {
        // Check cooldown (60 seconds client-side)
        const now = Date.now();
        const timeSinceLastTrigger = Math.floor((now - lastTriggerTime) / 1000);

        if (timeSinceLastTrigger < 60) {
            const remaining = 60 - timeSinceLastTrigger;
            alert(
                `⏰ Please wait!\n\n` +
                `You can trigger payment processing again in ${remaining} seconds.\n\n` +
                `This cooldown prevents abuse of the demo feature.`
            );
            return;
        }

        const confirmed = confirm(
            `🤖 Trigger Automatic Payment Processing?\n\n` +
            `This will scan ALL active subscriptions and charge those where the billing interval has passed.\n\n` +
            `In production, this would run automatically via a cron job every hour/day.\n\n` +
            `Note: You can only do this once per minute.`
        );

        if (!confirmed) return;

        setProcessing(true);
        try {
            console.log('📤 Triggering backend payment processor...');

            const response = await fetch('/api/charge-subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limited
                    alert(
                        `⏰ Rate Limit Exceeded!\n\n` +
                        `Please wait ${data.retryAfter || 60} seconds before trying again.\n\n` +
                        `This prevents abuse of the demo feature.`
                    );
                    return;
                }
                throw new Error(data.error || 'Failed to process payments');
            }

            // Update cooldown
            setLastTriggerTime(Date.now());
            setCooldownRemaining(60);

            // Show results
            const { results } = data;

            let message = `✅ Payment Processing Complete!\n\n`;
            message += `📊 Results:\n`;
            message += `  ✅ Charged: ${results.charged.length}\n`;
            message += `  ⏭️  Skipped: ${results.skipped.length}\n`;
            message += `  ❌ Errors: ${results.errors.length}\n`;
            message += `  📋 Total: ${results.total}\n\n`;

            if (results.charged.length > 0) {
                message += `💰 Charged Transactions:\n`;
                results.charged.forEach((sig: string, i: number) => {
                    message += `  ${i + 1}. ${sig.slice(0, 8)}...${sig.slice(-4)}\n`;
                });
                message += `\n🔗 View on Explorer (devnet)\n`;
            }

            if (results.skipped.length > 0 && results.skipped.length <= 3) {
                message += `\n⏭️  Skipped:\n`;
                results.skipped.forEach((item: any) => {
                    message += `  • ${item.address.slice(0, 8)}... - ${item.reason}\n`;
                });
            }

            alert(message);

            // Refresh subscription data
            if (results.charged.length > 0) {
                setTimeout(() => {
                    setHasSubscription(false);
                    setSubscriptionData(null);
                    setLoading(true);
                    checkSubscription();
                }, 2000);
            }

        } catch (err: any) {
            console.error('❌ Payment processing error:', err);
            alert(`❌ Failed to process payments:\n\n${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const getNextChargeDate = (): string => {
        if (!subscriptionData) return 'Unknown';

        const nextCharge = subscriptionData.lastChargeTimestamp + subscriptionData.intervalSeconds;
        const now = Math.floor(Date.now() / 1000);
        const daysUntil = Math.ceil((nextCharge - now) / (24 * 60 * 60));

        if (daysUntil < 0) return 'Overdue';
        if (daysUntil === 0) return 'Today';
        if (daysUntil === 1) return 'Tomorrow';
        return `In ${daysUntil} days`;
    };

    const getPlanName = (): string => {
        if (!subscriptionData) return 'Unknown Plan';

        const plan = getPlanById('basic')?.price === subscriptionData.amountPerPeriod ? 'Basic' :
            getPlanById('pro')?.price === subscriptionData.amountPerPeriod ? 'Pro' :
                getPlanById('enterprise')?.price === subscriptionData.amountPerPeriod ? 'Enterprise' :
                    'Custom';

        return `${plan} Plan`;
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

    // ✅ FIX: Only show cleanup if account exists AND is not active
    // EXTRA SAFETY: Triple-check that subscription is definitely not active
    const showCleanup = subscriptionData !== null &&
        subscriptionData.isActive === false &&
        hasSubscription === false;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Dashboard</h1>
                    <button
                        onClick={() => {
                            // Force clear state before refresh
                            setHasSubscription(false);
                            setSubscriptionData(null);
                            setLoading(true);
                            checkSubscription();
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm transition-all"
                    >
                        🔄 Refresh
                    </button>
                </div>

                {/* ONLY show cleanup if: (1) data exists, (2) isActive is false, (3) hasSubscription is false */}
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
                                        You have an old cancelled subscription account that can be cleaned up to recover rent (~{SUBSCRIPTION_CONSTANTS.SETUP_FEE_SOL} SOL).
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
                ) : hasSubscription && subscriptionData ? (
                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{getPlanName()}</h3>
                                    <p className="text-xl text-gray-400">
                                        {formatPrice(subscriptionData.amountPerPeriod)} USDC
                                        <span className="text-sm"> / {formatInterval(subscriptionData.intervalSeconds)}</span>
                                    </p>
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
                                    <span className="text-white font-medium">Every {Math.floor(subscriptionData.intervalSeconds / (24 * 60 * 60))} days</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Next Charge:</span>
                                    <span className="text-white font-medium">{getNextChargeDate()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Total Charged:</span>
                                    <span className="text-white font-medium">{formatPrice(subscriptionData.totalCharged)} USDC</span>
                                </div>
                                <div className="border-t border-white/10 pt-3 mt-3"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Contract Address:</span>
                                    <a
                                        href={`https://explorer.solana.com/address/${subscriptionAddress}?cluster=${SUBSCRIPTION_CONSTANTS.NETWORK}`}
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
                                    <span>Prepaid model: First payment already charged. Next charge {getNextChargeDate().toLowerCase()}.</span>
                                </p>
                            </div>
                        </div>

                        {SUBSCRIPTION_CONSTANTS.NETWORK === 'devnet' && (
                            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
                                <div className="flex items-start gap-3 mb-4">
                                    <span className="text-2xl">⚙️</span>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Payment Processing Demo</h3>
                                        <p className="text-gray-400 text-sm mt-1">
                                            Simulate automatic backend cron job (Devnet only)
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Cooldown indicator */}
                                    {cooldownRemaining > 0 && (
                                        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-12 h-12">
                                                    <svg className="w-12 h-12 transform -rotate-90">
                                                        <circle
                                                            cx="24"
                                                            cy="24"
                                                            r="20"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                            fill="none"
                                                            className="text-yellow-500/20"
                                                        />
                                                        <circle
                                                            cx="24"
                                                            cy="24"
                                                            r="20"
                                                            stroke="currentColor"
                                                            strokeWidth="4"
                                                            fill="none"
                                                            strokeDasharray={`${2 * Math.PI * 20}`}
                                                            strokeDashoffset={`${2 * Math.PI * 20 * (cooldownRemaining / 60)}`}
                                                            className="text-yellow-400 transition-all duration-1000"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-yellow-400 text-xs font-bold">
                                    {cooldownRemaining}s
                                </span>
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-yellow-400 font-semibold text-sm">
                                                        ⏰ Cooldown Active
                                                    </div>
                                                    <div className="text-yellow-300 text-xs mt-1">
                                                        Wait {cooldownRemaining} seconds before triggering again
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Trigger button */}
                                    <button
                                        onClick={handleProcessPayment}
                                        disabled={processing || cooldownRemaining > 0}
                                        className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                                            processing || cooldownRemaining > 0
                                                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                                : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300'
                                        }`}
                                    >
                                        {processing ? (
                                            <>
                                                <span className="animate-spin">⏳</span>
                                                Processing Payments...
                                            </>
                                        ) : cooldownRemaining > 0 ? (
                                            <>
                                                <span>🔒</span>
                                                Cooldown ({cooldownRemaining}s)
                                            </>
                                        ) : (
                                            <>
                                                <span>⚡</span>
                                                Trigger Payment Processing
                                            </>
                                        )}
                                    </button>

                                    {/* Info boxes */}
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <div className="flex gap-2">
                                                <span className="text-lg">💡</span>
                                                <div className="flex-1">
                                                    <div className="text-blue-400 font-semibold text-xs mb-1">
                                                        How It Works
                                                    </div>
                                                    <div className="text-blue-300 text-xs">
                                                        This button simulates the backend cron job that would run automatically
                                                        every hour/day in production. It scans all subscriptions and charges
                                                        those where the billing interval has passed.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                            <div className="flex gap-2">
                                                <span className="text-lg">🤖</span>
                                                <div className="flex-1">
                                                    <div className="text-purple-400 font-semibold text-xs mb-1">
                                                        No User Signature Required
                                                    </div>
                                                    <div className="text-purple-300 text-xs">
                                                        When charging subscriptions, users don't need to sign anything!
                                                        The merchant's backend uses the token delegation to charge automatically.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                            <div className="flex gap-2">
                                                <span className="text-lg">⚠️</span>
                                                <div className="flex-1">
                                                    <div className="text-yellow-400 font-semibold text-xs mb-1">
                                                        Rate Limited (Demo Protection)
                                                    </div>
                                                    <div className="text-yellow-300 text-xs">
                                                        You can only trigger this once per minute to prevent abuse.
                                                        In production, the cron job would run on a schedule (e.g., daily).
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </main>
        </div>
    );
}
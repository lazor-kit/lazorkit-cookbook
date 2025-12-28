import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-20">
                <div className="text-center mb-16">
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
                        🧪 LazorKit Cookbook
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 mb-4">
                        Real-world examples showing how LazorKit makes Solana development simpler
                    </p>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        No more wallet adapters, no gas fee headaches, no blockchain complexity.<br/>
                        Just connect with Face ID and build.
                    </p>
                </div>

                {/* Recipe Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
                    {/* Recipe 01 */}
                    <Link href="/recipes/01-passkey-wallet-basics">
                        <div
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="text-5xl mb-4">👛</div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-white">Recipe 01</span>
                                <span
                                    className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                  ⭐ Beginner
                </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3">
                                Passkey Wallet Basics
                            </h3>
                            <p className="text-gray-400 mb-4">
                                Create wallets with Face ID, check balances, and request airdrops. Perfect for getting
                                started!
                            </p>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Passkey authentication
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Balance checking
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Devnet airdrops
                                </li>
                            </ul>
                            <div className="mt-6 text-purple-400 group-hover:text-purple-300 font-semibold">
                                Start learning →
                            </div>
                        </div>
                    </Link>

                    {/* Recipe 02 */}
                    <Link href="/recipes/02-gasless-transfer">
                        <div
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="text-5xl mb-4">⚡</div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-white">Recipe 02</span>
                                <span
                                    className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                  ⭐⭐ Intermediate
                </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3">
                                Gasless USDC Transfer
                            </h3>
                            <p className="text-gray-400 mb-4">
                                Send USDC without paying gas fees. Learn how LazorKit's paymaster enables true gasless
                                transactions.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Zero gas fees for users
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    SPL token transfers
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Paymaster integration
                                </li>
                            </ul>
                            <div className="mt-6 text-purple-400 group-hover:text-purple-300 font-semibold">
                                Start learning →
                            </div>
                        </div>
                    </Link>

                    {/* Recipe 03 */}
                    <Link href="/recipes/03-subscription-service">
                        <div
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="text-5xl mb-4">💰</div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-white">Recipe 03</span>
                                <span
                                    className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                  ⭐⭐⭐⭐ Advanced
                </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3">
                                Subscription Service
                            </h3>
                            <p className="text-gray-400 mb-4">
                                Practical subscription billing with automatic recurring charges. Full-stack example!
                            </p>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Automatic billing
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Token delegation
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Backend automation
                                </li>
                            </ul>
                            <div className="mt-6 text-purple-400 group-hover:text-purple-300 font-semibold">
                                Start learning →
                            </div>
                        </div>
                    </Link>
                    {/* Recipe 04 */}
                    <Link href="/recipes/04-gasless-raydium-swap">
                        <div
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="text-5xl mb-4">🔄</div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-white">Recipe 04</span>
                                <span
                                    className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                                    ⭐⭐⭐ Advanced
                                  </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3">
                                Gasless Raydium Token Swaps
                            </h3>
                            <p className="text-gray-400 mb-4">
                                Integrate with Raydium DEX for gasless token swaps. Learn to work with existing Solana
                                protocols!
                            </p>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Raydium SDK/API integration
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Gasless DEX swaps
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Protocol integration pattern
                                </li>
                            </ul>
                            <div className="mt-6 text-purple-400 group-hover:text-purple-300 font-semibold">
                                Start learning →
                            </div>
                        </div>
                    </Link>

                    {/* Recipe 05 */}
                    <Link href="/recipes/05-wallet-adapter-integration">
                        <div
                            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="text-5xl mb-4">🔌</div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-white">Recipe 05</span>
                                <span
                                    className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                                    ⭐⭐⭐ Advanced
                                  </span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-3">
                                Wallet Adapter Integration
                            </h3>
                            <p className="text-gray-400 mb-4">
                                Use LazorKit alongside other wallets with popular Solana wallet adapters with an example for transferring USDC!
                            </p>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Anza Wallet Adapter
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    Wallet UI
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    New Solana ConnectorKit
                                </li>
                            </ul>
                            <div className="mt-6 text-purple-400 group-hover:text-purple-300 font-semibold">
                                Start learning →
                            </div>
                        </div>
                    </Link>
                </div>
                {/* Why LazorKit Section */}
                <section className="container mx-auto px-4 py-16 max-w-7xl">
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 md:p-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
                            Why LazorKit Changes Everything
                        </h2>

                        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                            {/* Traditional */}
                            <div>
                                <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
                                    <span>❌</span> Traditional Solana Development
                                </h3>
                                <ul className="space-y-3 text-gray-300">
                                    <li className="flex items-start gap-3">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>Complex wallet adapter setup</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>Users need SOL for gas fees</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>Managing transaction signing</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>Handling token accounts</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-red-400 mt-1">•</span>
                                        <span>Building authentication flows</span>
                                    </li>
                                </ul>
                            </div>

                            {/* With LazorKit */}
                            <div>
                                <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
                                    <span>✅</span> With LazorKit
                                </h3>
                                <ul className="space-y-3 text-gray-300">
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 mt-1">•</span>
                                        <span>One hook: <code className="text-purple-400">useWallet()</code></span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 mt-1">•</span>
                                        <span>Gasless transactions via paymaster</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 mt-1">•</span>
                                        <span>Smart wallets with Face ID</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 mt-1">•</span>
                                        <span>Auto token account creation</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="text-green-400 mt-1">•</span>
                                        <span>Simplified transaction flow</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-xl text-purple-300 font-semibold">
                                → Focus on your product, not blockchain complexity
                            </p>
                        </div>
                    </div>
                </section>
                {/* Features Section */}
                <div className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold text-white text-center mb-8">
                        Why Use This Cookbook?
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                            <div className="text-3xl mb-3">📚</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Progressive Learning
                            </h3>
                            <p className="text-gray-400">
                                Start with basic wallet creation and progress to advanced patterns like token delegation
                                and backend automation.
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                            <div className="text-3xl mb-3">🎯</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Real-World Examples
                            </h3>
                            <p className="text-gray-400">
                                Not just toy demos. Each recipe solves actual problems and includes detailed code you
                                can copy and adapt.
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                            <div className="text-3xl mb-3">⚡</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                Developer-Friendly
                            </h3>
                            <p className="text-gray-400">
                                Clear setup guides, inline comments, and step-by-step tutorials. Works with both React
                                and React Native.
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
                            <div className="text-3xl mb-3">🚀</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No Seed Phrases
                            </h3>
                            <p className="text-gray-400">
                                Eliminate the biggest UX barrier in crypto. Users authenticate with Face ID/Touch ID -
                                simple and secure.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center">
                    <div
                        className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-8 max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-gray-300 mb-6">
                            Jump into Recipe 01 and create your first passkey wallet in 5 minutes!
                        </p>
                        <div className="flex gap-4 justify-center flex-wrap">
                            <Link
                                href="/recipes/01-passkey-wallet-basics"
                                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/50"
                            >
                                Start with Recipe 01 →
                            </Link>
                            <a
                                href="https://docs.lazorkit.com/" target="_blank"
                                className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-all"
                            >
                                View LazorKit Docs
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

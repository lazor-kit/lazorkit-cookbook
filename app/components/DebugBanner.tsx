'use client';

import { useState, useEffect } from 'react';
import { getDebugInfo, clearDebugInfo, formatDebugInfo, type DebugInfo } from '@/lib/debug-helper';

export default function DebugBanner() {
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Check for debug info on mount
        const info = getDebugInfo();
        setDebugInfo(info);
    }, []);

    if (!debugInfo) return null;

    const handleClear = () => {
        clearDebugInfo();
        setDebugInfo(null);
        setShowModal(false);
    };

    return (
        <>
            {/* Sticky debug banner */}
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-bold shadow-lg animate-pulse"
                >
                    🐛 Debug Info
                </button>
            </div>

            {/* Debug modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border-2 border-yellow-500 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b-2 border-yellow-500 bg-yellow-500/10">
                            <h3 className="text-lg font-bold text-yellow-400">🐛 Debug Information</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
                                {formatDebugInfo(debugInfo)}
                            </pre>

                            {/* Visual comparison */}
                            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <div className="text-red-400 font-bold mb-2">⚠️ Check if PDAs match:</div>
                                <div className="text-xs space-y-1">
                                    <div className="text-gray-400">Created at:</div>
                                    <div className="text-white font-mono break-all">{debugInfo.subscriptionPDA}</div>
                                    <div className="text-gray-400 mt-2">Reading from:</div>
                                    <div className="text-white font-mono break-all">(Check on dashboard)</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-gray-700 space-y-2">
                            <button
                                onClick={() => {
                                    const text = formatDebugInfo(debugInfo);
                                    navigator.clipboard?.writeText(text);
                                    alert('Debug info copied to clipboard!');
                                }}
                                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
                            >
                                📋 Copy to Clipboard
                            </button>

                            <button
                                onClick={() => {
                                    const explorerUrl = `https://explorer.solana.com/address/${debugInfo.subscriptionPDA}?cluster=devnet`;
                                    window.open(explorerUrl, '_blank');
                                }}
                                className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold"
                            >
                                🔍 View PDA on Explorer
                            </button>

                            {debugInfo.transactionSignature && (
                                <button
                                    onClick={() => {
                                        const explorerUrl = `https://explorer.solana.com/tx/${debugInfo.transactionSignature}?cluster=devnet`;
                                        window.open(explorerUrl, '_blank');
                                    }}
                                    className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold"
                                >
                                    📜 View Transaction
                                </button>
                            )}

                            <button
                                onClick={handleClear}
                                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
                            >
                                🗑️ Clear Debug Info
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
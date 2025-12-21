'use client';

import { useWallet } from '@lazorkit/wallet';
import { shortenAddress } from '@/lib/utils';

export function WalletButton() {
  const { connect, disconnect, isConnected, isConnecting, wallet } = useWallet();

  if (isConnected && wallet) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20 transition-all duration-200 font-medium"
      >
        {shortenAddress(wallet.smartWallet)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ feeMode: 'paymaster' })}
      disabled={isConnecting}
      className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold text-white shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? 'Connecting...' : 'Connect with Face ID'}
    </button>
  );
}

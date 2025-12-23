// Helper to store and retrieve debug info for mobile debugging
// Use localStorage to persist between page navigations

export interface DebugInfo {
    timestamp: number;
    action: string;
    userWallet: string;
    subscriptionPDA: string;
    transactionSignature?: string;
    merchant: string;
    programId: string;
    additionalInfo?: Record<string, any>;
}

const DEBUG_KEY = 'lazorsub_debug_info';

export function saveDebugInfo(info: Omit<DebugInfo, 'timestamp'>) {
    const debugInfo: DebugInfo = {
        ...info,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem(DEBUG_KEY, JSON.stringify(debugInfo));
        console.log('Debug info saved:', debugInfo);
    } catch (err) {
        console.error('Failed to save debug info:', err);
    }
}

export function getDebugInfo(): DebugInfo | null {
    try {
        const stored = localStorage.getItem(DEBUG_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (err) {
        console.error('Failed to get debug info:', err);
        return null;
    }
}

export function clearDebugInfo() {
    try {
        localStorage.removeItem(DEBUG_KEY);
    } catch (err) {
        console.error('Failed to clear debug info:', err);
    }
}

export function formatDebugInfo(info: DebugInfo): string {
    const date = new Date(info.timestamp).toLocaleTimeString();

    return `
🔍 DEBUG INFO
━━━━━━━━━━━━━━━━━━━━━━━━

⏰ Time: ${date}
🎬 Action: ${info.action}

👤 User Wallet:
${info.userWallet.slice(0, 8)}...${info.userWallet.slice(-8)}

📍 Subscription PDA:
${info.subscriptionPDA.slice(0, 8)}...${info.subscriptionPDA.slice(-8)}

🏪 Merchant:
${info.merchant.slice(0, 8)}...${info.merchant.slice(-8)}

🔧 Program ID:
${info.programId.slice(0, 8)}...${info.programId.slice(-8)}

${info.transactionSignature ? `✅ Tx Signature:
${info.transactionSignature.slice(0, 8)}...${info.transactionSignature.slice(-8)}` : ''}

${info.additionalInfo ? `
ℹ️ Additional Info:
${JSON.stringify(info.additionalInfo, null, 2)}
` : ''}
    `.trim();
}
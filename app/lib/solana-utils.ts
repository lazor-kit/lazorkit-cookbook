import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const USDC_MINT = new PublicKey(
    process.env.NEXT_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
);

// Cached connection instance
let _connection: Connection | null = null;

/**
 * Get a shared Solana connection instance (cached)
 */
export function getConnection(rpcUrl: string = RPC_URL): Connection {
    if (!_connection || _connection.rpcEndpoint !== rpcUrl) {
        _connection = new Connection(rpcUrl, 'confirmed');
    }
    return _connection;
}

/**
 * Create a new Solana connection (not cached)
 */
export function createConnection(rpcUrl: string = RPC_URL): Connection {
    return new Connection(rpcUrl, 'confirmed');
}

/**
 * Derive the associated token account address for a given mint and owner
 */
export function getAssociatedTokenAddressSync(
    mint: PublicKey,
    owner: PublicKey,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
    const [address] = PublicKey.findProgramAddressSync(
        [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
        associatedTokenProgramId
    );
    return address;
}

/**
 * Fetch SOL balance for a wallet
 */
export async function getSolBalance(
    connection: Connection,
    publicKey: PublicKey
): Promise<number> {
    const lamports = await connection.getBalance(publicKey);
    return lamports / LAMPORTS_PER_SOL;
}

/**
 * Fetch USDC balance for a wallet
 */
export async function getUsdcBalance(
    connection: Connection,
    publicKey: PublicKey,
    usdcMint: PublicKey = USDC_MINT
): Promise<number> {
    try {
        const tokenAccount = getAssociatedTokenAddressSync(usdcMint, publicKey);
        const accountInfo = await connection.getAccountInfo(tokenAccount);

        if (!accountInfo) {
            return 0;
        }

        // Token account layout: mint (32) + owner (32) + amount (8)
        const amount = Number(accountInfo.data.readBigUInt64LE(64));
        // USDC has 6 decimals
        return amount / 1_000_000;
    } catch {
        return 0;
    }
}

/**
 * Fetch both SOL and USDC balances
 */
export async function getBalances(
    connection: Connection,
    publicKey: PublicKey
): Promise<{ sol: number; usdc: number }> {
    const [sol, usdc] = await Promise.all([
        getSolBalance(connection, publicKey),
        getUsdcBalance(connection, publicKey),
    ]);
    return { sol, usdc };
}

/**
 * Shorten a wallet address for display
 */
export function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Common Solana/transaction error patterns and their user-friendly messages
const ERROR_PATTERNS: Array<{ pattern: RegExp | string; message: string }> = [
    { pattern: '0x1', message: 'Insufficient SOL for rent. Get SOL from a Solana Devnet faucet.' },
    { pattern: 'slippage', message: 'Slippage exceeded. Try again or increase slippage tolerance.' },
    { pattern: 'No liquidity', message: 'No liquidity pool found for this pair.' },
    { pattern: /transaction too large/i, message: 'Transaction too large. Try a simpler operation.' },
    { pattern: 'insufficient funds', message: 'Insufficient funds for this transaction.' },
    { pattern: 'blockhash not found', message: 'Transaction expired. Please try again.' },
    { pattern: 'already in use', message: 'Account already exists or is in use.' },
    { pattern: 'custom program error', message: 'Smart contract returned an error.' },
];

/**
 * Parse a transaction error and return a user-friendly message
 */
export function parseTransactionError(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);

    for (const { pattern, message } of ERROR_PATTERNS) {
        if (typeof pattern === 'string') {
            if (errorMessage.includes(pattern)) {
                return message;
            }
        } else if (pattern.test(errorMessage)) {
            return message;
        }
    }

    return errorMessage || 'Unknown error occurred';
}

/**
 * Format a transaction error for display to user
 */
export function formatTransactionError(error: unknown, operation = 'Transaction'): string {
    const userMessage = parseTransactionError(error);
    return `${operation} failed: ${userMessage}`;
}

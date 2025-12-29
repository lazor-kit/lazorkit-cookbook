import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    createMetadataAccountV3,
    createMasterEditionV3,
    mplTokenMetadata,
    findMetadataPda,
    findMasterEditionPda,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    publicKey as umiPublicKey,
    signerIdentity,
    Signer,
} from '@metaplex-foundation/umi';
import { toWeb3JsInstruction } from '@metaplex-foundation/umi-web3js-adapters';
import { RPC_URL } from './solana-utils';

// ============================================================================
// Constants
// ============================================================================

export const NFT_NAME_MAX_LENGTH = 32;
export const NFT_DESCRIPTION_MAX_LENGTH = 200;

// Regular NFT constants
export const REGULAR_NFT_SYMBOL = 'LKCB';
export const REGULAR_NFT_IMAGE_PATH = '/LKCB_R_NFT.png';

// ============================================================================
// Types
// ============================================================================

export interface NftMetadata {
    name: string;
    description: string;
}

export interface MintedRegularNft {
    mintAddress: string;
    name: string;
    description: string;
    signature: string;
}

// ============================================================================
// Umi Helpers
// ============================================================================

/**
 * Create a dummy signer for building Umi instructions
 * LazorKit handles the actual signing via passkey
 */
export function createDummySigner(walletAddress: string): Signer {
    return {
        publicKey: umiPublicKey(walletAddress),
        signMessage: async () => new Uint8Array(64),
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
    };
}

/**
 * Add smart wallet to instructions for LazorKit validation
 * LazorKit requires the smart wallet to be in the accounts list
 */
export function addSmartWalletToInstructions(
    instructions: TransactionInstruction[],
    smartWalletAddress: string
): void {
    const walletPubkey = new PublicKey(smartWalletAddress);

    instructions.forEach((ix) => {
        const hasSmartWallet = ix.keys.some(k => k.pubkey.toBase58() === smartWalletAddress);
        if (!hasSmartWallet) {
            ix.keys.push({ pubkey: walletPubkey, isSigner: false, isWritable: false });
        }
    });
}

// ============================================================================
// Metadata API
// ============================================================================

/**
 * Store NFT metadata on the API and get the metadata URI
 */
export async function storeNftMetadata(
    mintId: string,
    metadata: NftMetadata
): Promise<string> {
    const response = await fetch(`/api/nft-metadata/${mintId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: metadata.name.trim(),
            description: metadata.description.trim(),
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to store metadata');
    }

    const { metadataUri } = await response.json();
    return metadataUri;
}

/**
 * Generate a unique mint ID for metadata storage
 */
export function generateMintId(prefix: string = 'nft'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// Regular NFT (Metaplex Token Metadata)
// ============================================================================

/**
 * Build Metaplex metadata and master edition instructions for a regular NFT
 */
export async function buildMetaplexInstructions(
    walletAddress: string,
    mintAddress: string,
    nftName: string,
    metadataUri: string,
    symbol: string = REGULAR_NFT_SYMBOL
): Promise<TransactionInstruction[]> {
    const umi = createUmi(RPC_URL).use(mplTokenMetadata());

    const mintPublicKey = umiPublicKey(mintAddress);
    const walletPublicKey = umiPublicKey(walletAddress);
    const dummySigner = createDummySigner(walletAddress);

    umi.use(signerIdentity(dummySigner));

    const instructions: TransactionInstruction[] = [];

    // Derive PDAs
    const metadata = findMetadataPda(umi, { mint: mintPublicKey });
    const masterEdition = findMasterEditionPda(umi, { mint: mintPublicKey });

    // Build CreateMetadataAccountV3 instruction
    const createMetadataBuilder = createMetadataAccountV3(umi, {
        metadata,
        mint: mintPublicKey,
        mintAuthority: dummySigner,
        payer: dummySigner,
        updateAuthority: walletPublicKey,
        data: {
            name: nftName,
            symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: [
                {
                    address: walletPublicKey,
                    verified: false,
                    share: 100,
                },
            ],
            collection: null,
            uses: null,
        },
        isMutable: true,
        collectionDetails: null,
    });

    const metadataIxs = createMetadataBuilder.getInstructions();
    for (const ix of metadataIxs) {
        instructions.push(toWeb3JsInstruction(ix));
    }

    // Build CreateMasterEditionV3 instruction
    const createMasterEditionBuilder = createMasterEditionV3(umi, {
        edition: masterEdition,
        mint: mintPublicKey,
        updateAuthority: dummySigner,
        mintAuthority: dummySigner,
        payer: dummySigner,
        metadata,
        maxSupply: 0, // 0 means no prints allowed (true 1/1)
    });

    const masterEditionIxs = createMasterEditionBuilder.getInstructions();
    for (const ix of masterEditionIxs) {
        instructions.push(toWeb3JsInstruction(ix));
    }

    return instructions;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate NFT metadata fields
 */
export function validateNftMetadata(
    name: string,
    description: string
): { valid: boolean; error?: string } {
    if (!name.trim() || !description.trim()) {
        return { valid: false, error: 'Please fill in all fields' };
    }

    if (name.length > NFT_NAME_MAX_LENGTH) {
        return { valid: false, error: `Name must be ${NFT_NAME_MAX_LENGTH} characters or less` };
    }

    if (description.length > NFT_DESCRIPTION_MAX_LENGTH) {
        return { valid: false, error: `Description must be ${NFT_DESCRIPTION_MAX_LENGTH} characters or less` };
    }

    return { valid: true };
}

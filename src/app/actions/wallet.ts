'use server';

import { PublicKey } from '@solana/web3.js';
import { rpcCall } from '@/lib/helius';
import type { WalletValidation } from '@/types';

/**
 * Resolve .sol domain to wallet address using Bonfida SNS API
 */
async function resolveSolDomain(domain: string): Promise<string | null> {
  try {
    // Remove .sol suffix for the API call
    const name = domain.replace('.sol', '');

    // Use Bonfida's public SNS resolver
    const response = await fetch(`https://sns-sdk-proxy.bonfida.workers.dev/resolve/${name}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // The API returns { result: "pubkey" } or { error: "..." }
    if (data.result && typeof data.result === 'string') {
      return data.result;
    }

    return null;
  } catch (error) {
    console.error('SNS resolution error:', error);
    return null;
  }
}

/**
 * Validate if a string is a valid Solana public key
 */
function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an account exists on-chain
 */
async function accountExists(address: string): Promise<boolean> {
  try {
    const result = await rpcCall<{ value: unknown } | null>('getAccountInfo', [
      address,
      { encoding: 'base58' },
    ]);
    return result?.value !== null;
  } catch {
    return false;
  }
}

/**
 * Resolve and validate a wallet address or domain
 */
export async function resolveWallet(input: string): Promise<WalletValidation> {
  const trimmed = input.trim();

  // Check if it's a .sol domain (case-insensitive)
  if (trimmed.toLowerCase().endsWith('.sol')) {
    const resolved = await resolveSolDomain(trimmed.toLowerCase());
    if (resolved) {
      return {
        valid: true,
        address: resolved,
        type: 'domain',
      };
    }
    return {
      valid: false,
      error: `Could not resolve domain: ${trimmed.toLowerCase()}`,
    };
  }

  // Check if it's a valid public key format
  if (!isValidPublicKey(trimmed)) {
    return {
      valid: false,
      error: 'Invalid Solana address format',
    };
  }

  // Verify the account exists (optional - could skip for speed)
  const exists = await accountExists(trimmed);
  if (!exists) {
    // Still valid format, just no on-chain data yet
    return {
      valid: true,
      address: trimmed,
      type: 'pubkey',
    };
  }

  return {
    valid: true,
    address: trimmed,
    type: 'pubkey',
  };
}

/**
 * Validate multiple wallet addresses in parallel
 */
export async function resolveWallets(inputs: string[]): Promise<WalletValidation[]> {
  return Promise.all(inputs.map(resolveWallet));
}

/**
 * Ensure an address is a valid pubkey (resolve if .sol domain)
 * Use this before making Helius API calls
 */
export async function ensurePubkey(address: string): Promise<string> {
  const trimmed = address.trim();

  // If it's a .sol domain, resolve it
  if (trimmed.toLowerCase().endsWith('.sol')) {
    const resolved = await resolveSolDomain(trimmed.toLowerCase());
    if (resolved) {
      return resolved;
    }
    throw new Error(`Could not resolve domain: ${trimmed}`);
  }

  // Validate it's a valid pubkey format
  if (!isValidPublicKey(trimmed)) {
    throw new Error(`Invalid Solana address: ${trimmed}`);
  }

  return trimmed;
}

/**
 * Get basic account info
 */
export async function getAccountInfo(address: string) {
  try {
    const result = await rpcCall<{
      value: {
        lamports: number;
        owner: string;
        executable: boolean;
        rentEpoch: number;
      } | null;
    }>('getAccountInfo', [address, { encoding: 'base58' }]);

    if (!result?.value) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        lamports: result.value.lamports,
        owner: result.value.owner,
        solBalance: result.value.lamports / 1e9,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch account info',
    };
  }
}

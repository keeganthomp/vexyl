import { createHelius } from 'helius-sdk';

if (!process.env.HELIUS_API_KEY) {
  throw new Error('HELIUS_API_KEY is not defined in environment variables');
}

// Initialize Helius SDK
export const helius = createHelius({ apiKey: process.env.HELIUS_API_KEY });

// RPC URL for direct fetch calls (for methods not in SDK)
export const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

// Enhanced Transactions API URL
export const HELIUS_ENHANCED_URL = `https://api.helius.xyz/v0`;

// Helper for making RPC calls
export async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `vexyl-${Date.now()}`,
      method,
      params,
    }),
  });

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || 'RPC call failed');
  }

  return json.result;
}

// DAS API URL
export const HELIUS_DAS_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

// Helper for DAS API calls
export async function dasCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch(HELIUS_DAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `vexyl-das-${Date.now()}`,
      method,
      params,
    }),
  });

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || 'DAS call failed');
  }

  return json.result;
}

// Fetch parsed transactions using Helius Enhanced Transactions API
export async function fetchParsedTransactions(
  address: string,
  options: {
    before?: string;
    limit?: number;
  } = {}
): Promise<unknown[]> {
  const { before, limit = 100 } = options;

  const url = new URL(`${HELIUS_ENHANCED_URL}/addresses/${address}/transactions`);
  url.searchParams.set('api-key', process.env.HELIUS_API_KEY!);
  if (before) url.searchParams.set('before', before);
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  return response.json();
}

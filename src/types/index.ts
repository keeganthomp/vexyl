// Transaction types from Helius Enhanced API
export type TransactionType =
  | 'TRANSFER'
  | 'SWAP'
  | 'NFT_MINT'
  | 'NFT_SALE'
  | 'NFT_LISTING'
  | 'NFT_BID'
  | 'NFT_CANCEL_LISTING'
  | 'BURN'
  | 'STAKE'
  | 'UNSTAKE'
  | 'COMPRESSED_NFT_MINT'
  | 'UNKNOWN';

export type TransactionSource =
  | 'JUPITER'
  | 'RAYDIUM'
  | 'ORCA'
  | 'TENSOR'
  | 'MAGIC_EDEN'
  | 'PHANTOM'
  | 'MARINADE'
  | 'UNKNOWN';

export interface TokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
  symbol?: string;
  decimals?: number;
  imageUri?: string;
}

export interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // in lamports
}

export interface NFTEvent {
  description: string;
  type: string;
  source: string;
  amount: number;
  fee: number;
  feePayer: string;
  signature: string;
  slot: number;
  timestamp: number;
  saleType: string;
  buyer: string;
  seller: string;
  nfts: Array<{
    mint: string;
    tokenStandard: string;
  }>;
}

export interface SwapEvent {
  nativeInput?: {
    account: string;
    amount: string;
  };
  nativeOutput?: {
    account: string;
    amount: string;
  };
  tokenInputs: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
  }>;
  tokenOutputs: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
  }>;
  tokenFees: Array<{
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
  }>;
  nativeFees: Array<{
    account: string;
    amount: string;
  }>;
  innerSwaps: Array<{
    tokenInputs: Array<{
      fromUserAccount: string;
      toUserAccount: string;
      fromTokenAccount: string;
      toTokenAccount: string;
      tokenAmount: number;
      mint: string;
    }>;
    tokenOutputs: Array<{
      fromUserAccount: string;
      toUserAccount: string;
      fromTokenAccount: string;
      toTokenAccount: string;
      tokenAmount: number;
      mint: string;
    }>;
    programInfo: {
      source: string;
      account: string;
      programName: string;
      instructionName: string;
    };
  }>;
}

export interface ParsedTransaction {
  signature: string;
  type: TransactionType;
  source: TransactionSource;
  description: string;
  fee: number;
  feePayer: string;
  slot: number;
  timestamp: number;
  blockTime: number;
  nativeTransfers: NativeTransfer[];
  tokenTransfers: TokenTransfer[];
  events: {
    nft?: NFTEvent;
    swap?: SwapEvent;
  };
  // VEXYL-specific fields
  isSelfTransfer?: boolean;
  walletLabel?: string;
  walletColor?: string;
}

export interface Wallet {
  address: string;
  label: string;
  color: string;
}

export interface WalletCluster {
  wallets: Wallet[];
  primaryWallet: string;
}

// DAS Asset Types
export interface DASAsset {
  id: string;
  interface: string;
  content: {
    json_uri: string;
    files: Array<{
      uri: string;
      mime: string;
    }>;
    metadata: {
      name: string;
      symbol: string;
      description?: string;
    };
    links?: {
      image?: string;
      external_url?: string;
    };
  };
  authorities: Array<{
    address: string;
    scopes: string[];
  }>;
  compression?: {
    eligible: boolean;
    compressed: boolean;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
  royalty?: {
    royalty_model: string;
    target: string | null;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators?: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate: string | null;
    ownership_model: string;
    owner: string;
  };
  token_info?: {
    balance: number;
    supply: number;
    decimals: number;
    token_program: string;
    price_info?: {
      price_per_token: number;
      total_price: number;
      currency: string;
    };
  };
}

export interface PortfolioAssets {
  nativeBalance: {
    lamports: number;
    price_per_sol?: number;
    total_price?: number;
  };
  tokens: DASAsset[];
  nfts: DASAsset[];
}

// API Response types
export interface TimelineResponse {
  success: boolean;
  data?: ParsedTransaction[];
  nextCursor?: string;
  error?: string;
}

export interface AssetsResponse {
  success: boolean;
  data?: PortfolioAssets;
  error?: string;
}

export interface WalletValidation {
  valid: boolean;
  address?: string;
  type?: 'pubkey' | 'domain';
  error?: string;
}

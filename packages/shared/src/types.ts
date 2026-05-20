export interface MerchantIntent {
  serviceDescriptionThai: string;
  serviceDescriptionEnglish: string;
  priceUsdt: number;
  priceThbReference?: number;
  category: 'food' | 'transport' | 'guide' | 'service' | 'other';
  hours?: string;
  location?: string;
  languages?: string[];
}

export interface KhunAgent {
  agentId: string;           // 8004 Metaplex Core asset address
  ownerLineUserId: string;
  walletAddress: string;     // Solana mainnet address
  endpointUrl: string;       // public x402 URL on Lambda
  bitkubDepositAddress?: string;
  intent: MerchantIntent;
  registeredAt: string;      // ISO timestamp
  registryTxSignature: string;
}

export interface BookingRequest {
  agentId: string;
  buyerNote?: string;
  scheduledAt?: string;
}

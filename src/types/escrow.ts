import { PublicKey } from '@solana/web3.js';

export enum EscrowState {
  Created = 'Created',
  Funded = 'Funded',
  Delivered = 'Delivered',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Disputed = 'Disputed',
  Resolved = 'Resolved',
}

export interface Escrow {
  id: string;
  escrowId: number;
  buyer: PublicKey;
  seller: PublicKey;
  arbiter: PublicKey | null;
  amount: number;
  state: EscrowState;
  createdAt: Date;
  deadline: Date;
  hasArbiter: boolean;
  feeBps: number;
  feeRecipient: PublicKey;
  publicKey: PublicKey;
}

export interface PlatformConfig {
  admin: PublicKey;
  feeBps: number;
  feeRecipient: PublicKey;
  totalEscrows: number;
  totalVolume: number;
  paused: boolean;
}

export interface CreateEscrowParams {
  seller: string;
  amount: number;
  deadline: Date;
  arbiter?: string;
}

export interface EscrowAction {
  type: 'fund' | 'deliver' | 'release' | 'cancel' | 'dispute' | 'resolve';
  escrowId: string;
  params?: {
    releaseToSeller?: boolean;
    sellerPercentage?: number;
  };
}

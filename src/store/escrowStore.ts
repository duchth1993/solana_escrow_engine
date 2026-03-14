import { create } from 'zustand';
import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Escrow, EscrowState, PlatformConfig, CreateEscrowParams } from '../types/escrow';

// Mock data for demonstration
const generateMockEscrows = (): Escrow[] => {
  const states = Object.values(EscrowState);
  const mockEscrows: Escrow[] = [];
  
  for (let i = 1; i <= 8; i++) {
    const state = states[i % states.length];
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const deadline = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    mockEscrows.push({
      id: `escrow-${i}`,
      escrowId: i,
      buyer: new PublicKey('11111111111111111111111111111111'),
      seller: new PublicKey('22222222222222222222222222222222'),
      arbiter: i % 3 === 0 ? new PublicKey('33333333333333333333333333333333') : null,
      amount: (Math.random() * 10 + 0.5) * LAMPORTS_PER_SOL,
      state,
      createdAt,
      deadline,
      hasArbiter: i % 3 === 0,
      feeBps: 250,
      feeRecipient: new PublicKey('44444444444444444444444444444444'),
      publicKey: new PublicKey('55555555555555555555555555555555'),
    });
  }
  
  return mockEscrows;
};

interface EscrowStore {
  // State
  escrows: Escrow[];
  selectedEscrow: Escrow | null;
  platformConfig: PlatformConfig | null;
  isLoading: boolean;
  error: string | null;
  connection: Connection | null;
  
  // Actions
  setConnection: (connection: Connection) => void;
  fetchEscrows: (walletAddress: PublicKey) => Promise<void>;
  fetchPlatformConfig: () => Promise<void>;
  createEscrow: (params: CreateEscrowParams) => Promise<string>;
  fundEscrow: (escrowId: string) => Promise<string>;
  markDelivered: (escrowId: string) => Promise<string>;
  releaseFunds: (escrowId: string) => Promise<string>;
  cancelEscrow: (escrowId: string) => Promise<string>;
  raiseDispute: (escrowId: string) => Promise<string>;
  resolveDispute: (escrowId: string, releaseToSeller: boolean, sellerPercentage: number) => Promise<string>;
  selectEscrow: (escrow: Escrow | null) => void;
  clearError: () => void;
}

export const useEscrowStore = create<EscrowStore>((set, get) => ({
  escrows: [],
  selectedEscrow: null,
  platformConfig: null,
  isLoading: false,
  error: null,
  connection: null,
  
  setConnection: (connection) => set({ connection }),
  
  fetchEscrows: async (walletAddress) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, this would fetch from Solana
      const mockEscrows = generateMockEscrows();
      set({ escrows: mockEscrows, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch escrows', isLoading: false });
    }
  },
  
  fetchPlatformConfig: async () => {
    try {
      // Mock platform config
      const config: PlatformConfig = {
        admin: new PublicKey('11111111111111111111111111111111'),
        feeBps: 250,
        feeRecipient: new PublicKey('44444444444444444444444444444444'),
        totalEscrows: 1247,
        totalVolume: 45678.9 * LAMPORTS_PER_SOL,
        paused: false,
      };
      set({ platformConfig: config });
    } catch (error) {
      set({ error: 'Failed to fetch platform config' });
    }
  },
  
  createEscrow: async (params) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newEscrow: Escrow = {
        id: `escrow-${Date.now()}`,
        escrowId: Date.now(),
        buyer: new PublicKey('11111111111111111111111111111111'),
        seller: new PublicKey(params.seller),
        arbiter: params.arbiter ? new PublicKey(params.arbiter) : null,
        amount: params.amount * LAMPORTS_PER_SOL,
        state: EscrowState.Created,
        createdAt: new Date(),
        deadline: params.deadline,
        hasArbiter: !!params.arbiter,
        feeBps: 250,
        feeRecipient: new PublicKey('44444444444444444444444444444444'),
        publicKey: new PublicKey('55555555555555555555555555555555'),
      };
      
      set(state => ({
        escrows: [newEscrow, ...state.escrows],
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to create escrow', isLoading: false });
      throw error;
    }
  },
  
  fundEscrow: async (escrowId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set(state => ({
        escrows: state.escrows.map(e =>
          e.id === escrowId ? { ...e, state: EscrowState.Funded } : e
        ),
        selectedEscrow: state.selectedEscrow?.id === escrowId
          ? { ...state.selectedEscrow, state: EscrowState.Funded }
          : state.selectedEscrow,
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to fund escrow', isLoading: false });
      throw error;
    }
  },
  
  markDelivered: async (escrowId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set(state => ({
        escrows: state.escrows.map(e =>
          e.id === escrowId ? { ...e, state: EscrowState.Delivered } : e
        ),
        selectedEscrow: state.selectedEscrow?.id === escrowId
          ? { ...state.selectedEscrow, state: EscrowState.Delivered }
          : state.selectedEscrow,
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to mark as delivered', isLoading: false });
      throw error;
    }
  },
  
  releaseFunds: async (escrowId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set(state => ({
        escrows: state.escrows.map(e =>
          e.id === escrowId ? { ...e, state: EscrowState.Completed } : e
        ),
        selectedEscrow: state.selectedEscrow?.id === escrowId
          ? { ...state.selectedEscrow, state: EscrowState.Completed }
          : state.selectedEscrow,
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to release funds', isLoading: false });
      throw error;
    }
  },
  
  cancelEscrow: async (escrowId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set(state => ({
        escrows: state.escrows.map(e =>
          e.id === escrowId ? { ...e, state: EscrowState.Cancelled } : e
        ),
        selectedEscrow: state.selectedEscrow?.id === escrowId
          ? { ...state.selectedEscrow, state: EscrowState.Cancelled }
          : state.selectedEscrow,
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to cancel escrow', isLoading: false });
      throw error;
    }
  },
  
  raiseDispute: async (escrowId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set(state => ({
        escrows: state.escrows.map(e =>
          e.id === escrowId ? { ...e, state: EscrowState.Disputed } : e
        ),
        selectedEscrow: state.selectedEscrow?.id === escrowId
          ? { ...state.selectedEscrow, state: EscrowState.Disputed }
          : state.selectedEscrow,
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to raise dispute', isLoading: false });
      throw error;
    }
  },
  
  resolveDispute: async (escrowId, releaseToSeller, sellerPercentage) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      set(state => ({
        escrows: state.escrows.map(e =>
          e.id === escrowId ? { ...e, state: EscrowState.Resolved } : e
        ),
        selectedEscrow: state.selectedEscrow?.id === escrowId
          ? { ...state.selectedEscrow, state: EscrowState.Resolved }
          : state.selectedEscrow,
        isLoading: false,
      }));
      
      return 'mock-signature-' + Date.now();
    } catch (error) {
      set({ error: 'Failed to resolve dispute', isLoading: false });
      throw error;
    }
  },
  
  selectEscrow: (escrow) => set({ selectedEscrow: escrow }),
  
  clearError: () => set({ error: null }),
}));

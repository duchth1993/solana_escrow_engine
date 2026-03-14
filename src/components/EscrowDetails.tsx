import React, { useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  X,
  User,
  Shield,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Package,
  Gavel,
  ExternalLink,
  Copy,
  Check,
  Banknote,
  Send,
  Ban,
  Scale,
} from 'lucide-react';
import { Escrow, EscrowState } from '../types/escrow';
import { useEscrowStore } from '../store/escrowStore';

interface EscrowDetailsProps {
  escrow: Escrow;
  onClose: () => void;
  walletConnected: boolean;
}

const stateConfig: Record<EscrowState, {
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}> = {
  [EscrowState.Created]: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
    icon: <Clock className="w-5 h-5" />,
    label: 'Awaiting Funds',
    description: 'Escrow created. Waiting for buyer to deposit funds.',
  },
  [EscrowState.Funded]: {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    label: 'In Progress',
    description: 'Funds deposited. Waiting for seller to deliver.',
  },
  [EscrowState.Delivered]: {
    color: 'text-secondary',
    bgColor: 'bg-secondary/10 border-secondary/30',
    icon: <Package className="w-5 h-5" />,
    label: 'Delivered',
    description: 'Delivery confirmed. Buyer can now release funds.',
  },
  [EscrowState.Completed]: {
    color: 'text-success',
    bgColor: 'bg-success/10 border-success/30',
    icon: <CheckCircle className="w-5 h-5" />,
    label: 'Completed',
    description: 'Transaction complete. Funds released to seller.',
  },
  [EscrowState.Cancelled]: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
    icon: <XCircle className="w-5 h-5" />,
    label: 'Cancelled',
    description: 'Escrow cancelled. Funds returned to buyer.',
  },
  [EscrowState.Disputed]: {
    color: 'text-warning',
    bgColor: 'bg-warning/10 border-warning/30',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'Disputed',
    description: 'Dispute raised. Awaiting arbiter resolution.',
  },
  [EscrowState.Resolved]: {
    color: 'text-accent',
    bgColor: 'bg-accent/10 border-accent/30',
    icon: <Gavel className="w-5 h-5" />,
    label: 'Resolved',
    description: 'Dispute resolved by arbiter.',
  },
};

export const EscrowDetails: React.FC<EscrowDetailsProps> = ({
  escrow,
  onClose,
  walletConnected,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [sellerPercentage, setSellerPercentage] = useState(50);
  
  const {
    fundEscrow,
    markDelivered,
    releaseFunds,
    cancelEscrow,
    raiseDispute,
    resolveDispute,
    isLoading,
  } = useEscrowStore();

  const config = stateConfig[escrow.state];
  const amountInSol = escrow.amount / LAMPORTS_PER_SOL;
  const feeAmount = (amountInSol * escrow.feeBps) / 10000;
  const sellerReceives = amountInSol - feeAmount;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-8)}`;

  const handleAction = async (action: () => Promise<string>) => {
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const getAvailableActions = () => {
    const actions: React.ReactNode[] = [];

    switch (escrow.state) {
      case EscrowState.Created:
        actions.push(
          <button
            key="fund"
            onClick={() => handleAction(() => fundEscrow(escrow.id))}
            disabled={isLoading || !walletConnected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
            Fund Escrow
          </button>
        );
        actions.push(
          <button
            key="cancel"
            onClick={() => handleAction(() => cancelEscrow(escrow.id))}
            disabled={isLoading || !walletConnected}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error/30 text-error hover:bg-error/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ban className="w-5 h-5" />}
            Cancel
          </button>
        );
        break;

      case EscrowState.Funded:
        actions.push(
          <button
            key="deliver"
            onClick={() => handleAction(() => markDelivered(escrow.id))}
            disabled={isLoading || !walletConnected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-secondary to-primary text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
            Confirm Delivery
          </button>
        );
        if (escrow.hasArbiter) {
          actions.push(
            <button
              key="dispute"
              onClick={() => handleAction(() => raiseDispute(escrow.id))}
              disabled={isLoading || !walletConnected}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-warning/30 text-warning hover:bg-warning/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              Dispute
            </button>
          );
        }
        break;

      case EscrowState.Delivered:
        actions.push(
          <button
            key="release"
            onClick={() => handleAction(() => releaseFunds(escrow.id))}
            disabled={isLoading || !walletConnected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-success to-emerald-400 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Release Funds
          </button>
        );
        break;

      case EscrowState.Disputed:
        actions.push(
          <button
            key="resolve"
            onClick={() => setShowResolveModal(true)}
            disabled={isLoading || !walletConnected}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-pink-400 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scale className="w-5 h-5" />}
            Resolve Dispute (Arbiter)
          </button>
        );
        break;
    }

    return actions;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl glass border border-border shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border glass">
            <div>
              <div className="text-sm text-gray-500 font-mono mb-1">
                Escrow #{escrow.escrowId.toString().padStart(6, '0')}
              </div>
              <h2 className="text-2xl font-bold text-white">Escrow Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* State Banner */}
            <div className={`flex items-center gap-4 p-4 rounded-2xl border ${config.bgColor}`}>
              <div className={`p-3 rounded-xl ${config.bgColor} ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <div className={`font-semibold ${config.color}`}>{config.label}</div>
                <div className="text-sm text-gray-400">{config.description}</div>
              </div>
            </div>

            {/* Amount */}
            <div className="p-5 rounded-2xl glass-elevated border border-border">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Escrow Amount</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {amountInSol.toFixed(4)} <span className="text-primary">SOL</span>
              </div>
              <div className="text-gray-400">≈ ${(amountInSol * 150).toFixed(2)} USD</div>
              
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Platform Fee ({escrow.feeBps / 100}%)</span>
                  <span className="text-gray-300">-{feeAmount.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-300">Seller Receives</span>
                  <span className="text-success">{sellerReceives.toFixed(4)} SOL</span>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Parties</h3>
              
              {/* Buyer */}
              <div className="p-4 rounded-xl glass-elevated border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Buyer</div>
                      <div className="font-mono text-white">{truncateAddress(escrow.buyer.toString())}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(escrow.buyer.toString(), 'buyer')}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {copied === 'buyer' ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <a
                      href={`https://explorer.solana.com/address/${escrow.buyer.toString()}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Seller */}
              <div className="p-4 rounded-xl glass-elevated border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <User className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Seller</div>
                      <div className="font-mono text-white">{truncateAddress(escrow.seller.toString())}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(escrow.seller.toString(), 'seller')}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {copied === 'seller' ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <a
                      href={`https://explorer.solana.com/address/${escrow.seller.toString()}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Arbiter */}
              {escrow.hasArbiter && escrow.arbiter && (
                <div className="p-4 rounded-xl glass-elevated border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Shield className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Arbiter</div>
                        <div className="font-mono text-white">{truncateAddress(escrow.arbiter.toString())}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(escrow.arbiter!.toString(), 'arbiter')}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {copied === 'arbiter' ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      <a
                        href={`https://explorer.solana.com/address/${escrow.arbiter.toString()}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Timeline</h3>
              <div className="p-4 rounded-xl glass-elevated border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Created</span>
                  </div>
                  <span className="text-white">{escrow.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Deadline</span>
                  </div>
                  <span className={escrow.deadline < new Date() ? 'text-error' : 'text-white'}>
                    {escrow.deadline.toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* State Flow Diagram */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">State Flow</h3>
              <div className="p-4 rounded-xl glass-elevated border border-border">
                <div className="flex items-center justify-between overflow-x-auto pb-2">
                  {[
                    { state: EscrowState.Created, label: 'Created' },
                    { state: EscrowState.Funded, label: 'Funded' },
                    { state: EscrowState.Delivered, label: 'Delivered' },
                    { state: EscrowState.Completed, label: 'Completed' },
                  ].map((step, index, arr) => {
                    const isActive = step.state === escrow.state;
                    const isPast = Object.values(EscrowState).indexOf(escrow.state) > Object.values(EscrowState).indexOf(step.state);
                    
                    return (
                      <React.Fragment key={step.state}>
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                            ${isActive ? 'bg-primary text-white' : isPast ? 'bg-success text-white' : 'bg-gray-700 text-gray-400'}
                          `}>
                            {isPast ? <Check className="w-4 h-4" /> : index + 1}
                          </div>
                          <span className={`text-xs mt-2 ${isActive ? 'text-primary' : isPast ? 'text-success' : 'text-gray-500'}`}>
                            {step.label}
                          </span>
                        </div>
                        {index < arr.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 ${isPast ? 'bg-success' : 'bg-gray-700'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            {getAvailableActions().length > 0 && (
              <div className="flex gap-3">
                {getAvailableActions()}
              </div>
            )}

            {!walletConnected && (
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 text-center">
                <AlertTriangle className="w-6 h-6 text-warning mx-auto mb-2" />
                <p className="text-warning text-sm">Connect your wallet to perform actions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Dispute Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl glass border border-border p-6">
            <h3 className="text-xl font-bold text-white mb-4">Resolve Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Seller Percentage: {sellerPercentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sellerPercentage}
                  onChange={(e) => setSellerPercentage(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Buyer: {100 - sellerPercentage}%</span>
                  <span>Seller: {sellerPercentage}%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-elevated border border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Buyer receives:</span>
                  <span className="text-white">{((amountInSol * (100 - sellerPercentage)) / 100).toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Seller receives:</span>
                  <span className="text-white">{((amountInSol * sellerPercentage) / 100).toFixed(4)} SOL</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleAction(() => resolveDispute(escrow.id, sellerPercentage === 100, sellerPercentage));
                    setShowResolveModal(false);
                  }}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-pink-400 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

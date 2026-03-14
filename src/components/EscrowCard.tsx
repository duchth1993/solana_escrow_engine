import React from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  Clock, 
  User, 
  Shield, 
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Package,
  Gavel
} from 'lucide-react';
import { Escrow, EscrowState } from '../types/escrow';

interface EscrowCardProps {
  escrow: Escrow;
  onClick: () => void;
  isSelected?: boolean;
}

const stateConfig: Record<EscrowState, { 
  color: string; 
  bgColor: string; 
  icon: React.ReactNode;
  label: string;
}> = {
  [EscrowState.Created]: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
    icon: <Clock className="w-3.5 h-3.5" />,
    label: 'Awaiting Funds',
  },
  [EscrowState.Funded]: {
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    label: 'In Progress',
  },
  [EscrowState.Delivered]: {
    color: 'text-secondary',
    bgColor: 'bg-secondary/10 border-secondary/30',
    icon: <Package className="w-3.5 h-3.5" />,
    label: 'Delivered',
  },
  [EscrowState.Completed]: {
    color: 'text-success',
    bgColor: 'bg-success/10 border-success/30',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: 'Completed',
  },
  [EscrowState.Cancelled]: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: 'Cancelled',
  },
  [EscrowState.Disputed]: {
    color: 'text-warning',
    bgColor: 'bg-warning/10 border-warning/30',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'Disputed',
  },
  [EscrowState.Resolved]: {
    color: 'text-accent',
    bgColor: 'bg-accent/10 border-accent/30',
    icon: <Gavel className="w-3.5 h-3.5" />,
    label: 'Resolved',
  },
};

export const EscrowCard: React.FC<EscrowCardProps> = ({ escrow, onClick, isSelected }) => {
  const config = stateConfig[escrow.state];
  const amountInSol = escrow.amount / LAMPORTS_PER_SOL;
  const timeRemaining = escrow.deadline.getTime() - Date.now();
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
  
  const truncateAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <div
      onClick={onClick}
      className={`
        relative p-5 rounded-2xl cursor-pointer transition-all duration-300
        glass-elevated border
        ${isSelected 
          ? 'border-primary/50 glow-primary scale-[1.02]' 
          : 'border-border hover:border-primary/30 hover:scale-[1.01]'
        }
        group
      `}
    >
      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 blur-xl" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 font-mono mb-1">
              #{escrow.escrowId.toString().padStart(6, '0')}
            </div>
            <div className="text-2xl font-bold text-white">
              {amountInSol.toFixed(4)} <span className="text-primary text-lg">SOL</span>
            </div>
            <div className="text-sm text-gray-400">
              ≈ ${(amountInSol * 150).toFixed(2)} USD
            </div>
          </div>
          
          {/* State badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.color}`}>
            {config.icon}
            <span className="text-xs font-medium">{config.label}</span>
          </div>
        </div>

        {/* Parties */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Buyer:</span>
            <span className="font-mono text-white">{truncateAddress(escrow.buyer.toString())}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Seller:</span>
            <span className="font-mono text-white">{truncateAddress(escrow.seller.toString())}</span>
          </div>
          {escrow.hasArbiter && escrow.arbiter && (
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-gray-400">Arbiter:</span>
              <span className="font-mono text-primary">{truncateAddress(escrow.arbiter.toString())}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            {daysRemaining > 0 ? (
              <span className="text-gray-400">
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </span>
            ) : (
              <span className="text-error">Deadline passed</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-sm font-medium">View Details</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

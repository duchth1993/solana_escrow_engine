import React, { useState } from 'react';
import { X, User, DollarSign, Calendar, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useEscrowStore } from '../store/escrowStore';

interface CreateEscrowModalProps {
  onClose: () => void;
  walletConnected: boolean;
}

export const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({
  onClose,
  walletConnected,
}) => {
  const [seller, setSeller] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [arbiter, setArbiter] = useState('');
  const [hasArbiter, setHasArbiter] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { createEscrow, isLoading } = useEscrowStore();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!seller || seller.length < 32) {
      newErrors.seller = 'Please enter a valid Solana address';
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!deadline) {
      newErrors.deadline = 'Please select a deadline';
    } else if (new Date(deadline) <= new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    if (hasArbiter && (!arbiter || arbiter.length < 32)) {
      newErrors.arbiter = 'Please enter a valid arbiter address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createEscrow({
        seller,
        amount: parseFloat(amount),
        deadline: new Date(deadline),
        arbiter: hasArbiter ? arbiter : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create escrow:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl glass border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Escrow</h2>
            <p className="text-sm text-gray-400 mt-1">Set up a new trustless escrow</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Seller Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <User className="w-4 h-4 text-primary" />
              Seller Address
            </label>
            <input
              type="text"
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              placeholder="Enter seller's Solana address"
              className={`w-full px-4 py-3 rounded-xl bg-surface-elevated border ${
                errors.seller ? 'border-error' : 'border-border'
              } text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors font-mono text-sm`}
            />
            {errors.seller && (
              <p className="flex items-center gap-1 text-error text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.seller}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Amount (SOL)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 rounded-xl bg-surface-elevated border ${
                  errors.amount ? 'border-error' : 'border-border'
                } text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors text-lg font-semibold`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-semibold">
                SOL
              </div>
            </div>
            {errors.amount && (
              <p className="flex items-center gap-1 text-error text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.amount}
              </p>
            )}
            {amount && parseFloat(amount) > 0 && (
              <p className="text-gray-400 text-xs mt-1">
                ≈ ${(parseFloat(amount) * 150).toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full px-4 py-3 rounded-xl bg-surface-elevated border ${
                errors.deadline ? 'border-error' : 'border-border'
              } text-white focus:outline-none focus:border-primary transition-colors`}
            />
            {errors.deadline && (
              <p className="flex items-center gap-1 text-error text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.deadline}
              </p>
            )}
          </div>

          {/* Arbiter Toggle */}
          <div className="p-4 rounded-xl bg-surface-elevated border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-gray-300">Add Arbiter</span>
              </div>
              <button
                type="button"
                onClick={() => setHasArbiter(!hasArbiter)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  hasArbiter ? 'bg-primary' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    hasArbiter ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              An arbiter can resolve disputes if buyer and seller disagree.
            </p>

            {hasArbiter && (
              <div className="mt-3">
                <input
                  type="text"
                  value={arbiter}
                  onChange={(e) => setArbiter(e.target.value)}
                  placeholder="Enter arbiter's Solana address"
                  className={`w-full px-4 py-3 rounded-xl bg-surface border ${
                    errors.arbiter ? 'border-error' : 'border-border'
                  } text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors font-mono text-sm`}
                />
                {errors.arbiter && (
                  <p className="flex items-center gap-1 text-error text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.arbiter}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fee Info */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Platform Fee</span>
              <span className="text-primary font-semibold">2.5%</span>
            </div>
            {amount && parseFloat(amount) > 0 && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-400">Seller will receive</span>
                <span className="text-success font-semibold">
                  {(parseFloat(amount) * 0.975).toFixed(4)} SOL
                </span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !walletConnected}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-primary via-secondary to-accent text-white font-semibold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Escrow...
              </>
            ) : (
              'Create Escrow'
            )}
          </button>

          {!walletConnected && (
            <p className="text-center text-warning text-sm">
              Please connect your wallet to create an escrow
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

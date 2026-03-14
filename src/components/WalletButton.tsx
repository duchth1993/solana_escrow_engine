import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check, AlertTriangle } from 'lucide-react';

interface WalletButtonProps {
  connected: boolean;
  connecting: boolean;
  address?: string;
  balance?: number;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({
  connected,
  connecting,
  address,
  balance,
  onConnect,
  onDisconnect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDemoNotice, setShowDemoNotice] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleConnect = () => {
    setShowDemoNotice(true);
    setTimeout(() => setShowDemoNotice(false), 3000);
    onConnect();
  };

  if (!connected) {
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="relative group px-6 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-100 group-hover:opacity-90 transition-opacity" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
          
          {/* Content */}
          <div className="relative flex items-center gap-2">
            {connecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </>
            )}
          </div>
        </button>

        {/* Demo mode notice */}
        {showDemoNotice && (
          <div className="absolute top-full mt-2 right-0 w-64 p-3 rounded-xl bg-surface-elevated border border-primary/30 shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-primary">Demo Mode:</span> Using simulated wallet for preview. Real wallet integration works in production.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass-elevated border border-border hover:border-primary/50 transition-all duration-300 group"
      >
        {/* Wallet icon with glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
        </div>
        
        {/* Address and balance */}
        <div className="text-left">
          <div className="font-mono text-sm text-white">
            {address && truncateAddress(address)}
          </div>
          <div className="text-xs text-gray-400">
            {balance?.toFixed(4)} SOL
          </div>
        </div>
        
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl glass-elevated border border-border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Demo badge */}
          <div className="px-4 py-2 bg-primary/10 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-primary">
              <AlertTriangle className="w-3 h-3" />
              <span>Demo Mode - Simulated Wallet</span>
            </div>
          </div>

          {/* Balance section */}
          <div className="p-4 border-b border-border">
            <div className="text-xs text-gray-400 mb-1">Balance</div>
            <div className="text-2xl font-bold text-white">
              {balance?.toFixed(4)} <span className="text-primary">SOL</span>
            </div>
            <div className="text-sm text-gray-400">
              ≈ ${((balance || 0) * 150).toFixed(2)} USD
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
            >
              {copied ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              )}
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                {copied ? 'Copied!' : 'Copy Address'}
              </span>
            </button>

            <a
              href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                View on Explorer
              </span>
            </a>

            <div className="my-2 border-t border-border" />

            <button
              onClick={() => {
                onDisconnect();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-error/10 transition-colors group"
            >
              <LogOut className="w-4 h-4 text-gray-400 group-hover:text-error transition-colors" />
              <span className="text-sm text-gray-300 group-hover:text-error transition-colors">
                Disconnect
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

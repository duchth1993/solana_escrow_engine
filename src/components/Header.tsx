import React from 'react';
import { Shield, Github, BookOpen, Menu, X } from 'lucide-react';
import { WalletButton } from './WalletButton';

interface HeaderProps {
  walletConnected: boolean;
  walletConnecting: boolean;
  walletAddress?: string;
  walletBalance?: number;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  walletConnected,
  walletConnecting,
  walletAddress,
  walletBalance,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg" />
              <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary to-secondary">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Escrow Engine</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Solana • Devnet</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              My Escrows
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="#"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Docs
            </a>
          </nav>

          {/* Wallet Button */}
          <div className="flex items-center gap-4">
            <WalletButton
              connected={walletConnected}
              connecting={walletConnecting}
              address={walletAddress}
              balance={walletBalance}
              onConnect={onConnectWallet}
              onDisconnect={onDisconnectWallet}
            />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-400" />
              ) : (
                <Menu className="w-6 h-6 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-2">
              <a
                href="#"
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Dashboard
              </a>
              <a
                href="#"
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                My Escrows
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Docs
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

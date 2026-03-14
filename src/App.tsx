import React, { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Filter,
  Search,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  Inbox,
  Sparkles,
  Info,
} from 'lucide-react';
import { Header } from './components/Header';
import { EscrowCard } from './components/EscrowCard';
import { EscrowDetails } from './components/EscrowDetails';
import { CreateEscrowModal } from './components/CreateEscrowModal';
import { StatsCard } from './components/StatsCard';
import { FloatingParticles } from './components/FloatingParticles';
import { useEscrowStore } from './store/escrowStore';
import { EscrowState } from './types/escrow';

function App() {
  // Wallet state (mock for demo - works in preview without real wallet extension)
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const [walletBalance, setWalletBalance] = useState<number | undefined>();

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<EscrowState | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [showDemoBanner, setShowDemoBanner] = useState(true);

  // Store
  const {
    escrows,
    selectedEscrow,
    isLoading,
    fetchEscrows,
    fetchPlatformConfig,
    selectEscrow,
  } = useEscrowStore();

  // Mock wallet connection - simulates real wallet behavior for demo
  const handleConnectWallet = async () => {
    setWalletConnecting(true);
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setWalletConnected(true);
    // Use a realistic-looking Solana address
    setWalletAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    setWalletBalance(12.5);
    setWalletConnecting(false);
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(undefined);
    setWalletBalance(undefined);
  };

  // Fetch data on mount
  useEffect(() => {
    fetchPlatformConfig();
    if (walletConnected && walletAddress) {
      fetchEscrows(new PublicKey(walletAddress));
    }
  }, [walletConnected, walletAddress, fetchEscrows, fetchPlatformConfig]);

  // Filter and sort escrows
  const filteredEscrows = escrows
    .filter((escrow) => {
      if (stateFilter !== 'all' && escrow.state !== stateFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          escrow.id.toLowerCase().includes(query) ||
          escrow.buyer.toString().toLowerCase().includes(query) ||
          escrow.seller.toString().toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      return b.amount - a.amount;
    });

  // Calculate stats
  const totalVolume = escrows.reduce((sum, e) => sum + e.amount, 0) / LAMPORTS_PER_SOL;
  const activeEscrows = escrows.filter(
    (e) => e.state === EscrowState.Funded || e.state === EscrowState.Delivered
  ).length;
  const completedEscrows = escrows.filter((e) => e.state === EscrowState.Completed).length;

  return (
    <div className="min-h-screen gradient-bg hex-pattern circuit-pattern">
      <FloatingParticles />

      {/* Demo Mode Banner */}
      {showDemoBanner && (
        <div className="relative z-50 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border-b border-primary/30">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-gray-300">
                <span className="font-semibold text-primary">Demo Mode:</span> This preview uses simulated wallet connections. Real Phantom/Solflare integration works in production.
              </span>
            </div>
            <button
              onClick={() => setShowDemoBanner(false)}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <Header
        walletConnected={walletConnected}
        walletConnecting={walletConnecting}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative mb-12 p-8 rounded-3xl glass border border-border overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/20 via-primary/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">Web2 → Web3 Pattern</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Trustless Escrow
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {' '}
                Engine
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mb-6">
              Experience how traditional backend escrow patterns translate to Solana's on-chain
              distributed state machine. Secure, transparent, and permissionless.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!walletConnected}
                className="group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                <div className="relative flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Escrow
                </div>
              </button>

              <a
                href="#escrows"
                className="px-6 py-3 rounded-xl font-semibold text-white border border-border hover:border-primary/50 hover:bg-white/5 transition-all"
              >
                View All Escrows
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={DollarSign}
            label="Total Volume"
            value={`${totalVolume.toFixed(2)}`}
            subValue="SOL"
            trend={{ value: 12.5, isPositive: true }}
            color="primary"
          />
          <StatsCard
            icon={Activity}
            label="Active Escrows"
            value={activeEscrows}
            subValue="In progress"
            color="secondary"
          />
          <StatsCard
            icon={TrendingUp}
            label="Completed"
            value={completedEscrows}
            subValue="Successfully closed"
            color="success"
          />
          <StatsCard
            icon={Users}
            label="Platform Fee"
            value="2.5%"
            subValue="Per transaction"
            color="accent"
          />
        </div>

        {/* Escrows Section */}
        <section id="escrows" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h3 className="text-2xl font-bold text-white">Your Escrows</h3>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search escrows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* State Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value as EscrowState | 'all')}
                  className="pl-10 pr-8 py-2.5 rounded-xl bg-surface-elevated border border-border text-white appearance-none cursor-pointer focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="all">All States</option>
                  {Object.values(EscrowState).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <button
                onClick={() => setSortBy(sortBy === 'date' ? 'amount' : 'date')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated border border-border text-gray-300 hover:border-primary/50 transition-colors"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortBy === 'date' ? 'Date' : 'Amount'}
              </button>

              {/* Refresh */}
              <button
                onClick={() => walletAddress && fetchEscrows(new PublicKey(walletAddress))}
                disabled={isLoading || !walletConnected}
                className="p-2.5 rounded-xl bg-surface-elevated border border-border text-gray-300 hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Escrow Grid */}
          {!walletConnected ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-6 rounded-full bg-primary/10 mb-6">
                <Inbox className="w-12 h-12 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h4>
              <p className="text-gray-400 max-w-md mb-6">
                Connect your Solana wallet to view and manage your escrows
              </p>
              <button
                onClick={handleConnectWallet}
                disabled={walletConnecting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {walletConnecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            </div>
          ) : isLoading && escrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-gray-400">Loading escrows...</p>
            </div>
          ) : filteredEscrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-6 rounded-full bg-surface-elevated mb-6">
                <Inbox className="w-12 h-12 text-gray-500" />
              </div>
              <h4 className="text-xl font-semibold text-white mb-2">No Escrows Found</h4>
              <p className="text-gray-400 max-w-md mb-6">
                {searchQuery || stateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first escrow to get started'}
              </p>
              {!searchQuery && stateFilter === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Escrow
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEscrows.map((escrow) => (
                <EscrowCard
                  key={escrow.id}
                  escrow={escrow}
                  onClick={() => selectEscrow(escrow)}
                  isSelected={selectedEscrow?.id === escrow.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Architecture Comparison Section */}
        <section className="mt-16 space-y-8">
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              Web2 vs Web3 Architecture
            </h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              See how traditional backend patterns translate to Solana's on-chain state machine
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Web2 Card */}
            <div className="p-6 rounded-2xl glass-elevated border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <span className="text-2xl">🖥️</span>
                </div>
                <h4 className="text-xl font-bold text-white">Traditional Web2</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                  <div>
                    <span className="text-gray-300">Database:</span>
                    <span className="text-gray-500 ml-2">PostgreSQL/MySQL tables</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                  <div>
                    <span className="text-gray-300">API:</span>
                    <span className="text-gray-500 ml-2">REST endpoints with JWT auth</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                  <div>
                    <span className="text-gray-300">Payments:</span>
                    <span className="text-gray-500 ml-2">Stripe/PayPal integration</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-500 mt-1.5" />
                  <div>
                    <span className="text-gray-300">Trust:</span>
                    <span className="text-gray-500 ml-2">Platform operator</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Web3 Card */}
            <div className="p-6 rounded-2xl glass-elevated border border-primary/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <span className="text-2xl">⛓️</span>
                  </div>
                  <h4 className="text-xl font-bold text-white">Solana Web3</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <span className="text-gray-300">Storage:</span>
                      <span className="text-primary ml-2">PDAs (Program Derived Addresses)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <span className="text-gray-300">API:</span>
                      <span className="text-primary ml-2">Program instructions via RPC</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <span className="text-gray-300">Payments:</span>
                      <span className="text-primary ml-2">Native SOL transfers</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    <div>
                      <span className="text-gray-300">Trust:</span>
                      <span className="text-primary ml-2">Trustless (code is law)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Comparison */}
          <div className="p-6 rounded-2xl glass-elevated border border-border">
            <h4 className="text-lg font-bold text-white mb-4">State Machine Comparison</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-2">Web2 (SQL)</div>
                <pre className="p-4 rounded-xl bg-surface text-xs font-mono text-gray-300 overflow-x-auto">
{`CREATE TABLE escrows (
  id UUID PRIMARY KEY,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount DECIMAL(18,8),
  state VARCHAR(20),
  created_at TIMESTAMP
);`}
                </pre>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-2">Web3 (Rust/Solana)</div>
                <pre className="p-4 rounded-xl bg-surface text-xs font-mono text-primary overflow-x-auto">
{`pub struct Escrow {
  pub buyer: Pubkey,
  pub seller: Pubkey,
  pub amount: u64,
  pub state: EscrowState,
  pub created_at: i64,
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Built for Solana Devnet • Demonstrating Web2 → Web3 patterns
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Documentation
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showCreateModal && (
        <CreateEscrowModal
          onClose={() => setShowCreateModal(false)}
          walletConnected={walletConnected}
        />
      )}

      {selectedEscrow && (
        <EscrowDetails
          escrow={selectedEscrow}
          onClose={() => selectEscrow(null)}
          walletConnected={walletConnected}
        />
      )}
    </div>
  );
}

export default App;

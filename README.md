# Solana Escrow Engine

## 🎯 Overview

This project demonstrates how traditional Web2 backend patterns translate to Solana's on-chain distributed state machine. We've implemented a **trustless escrow system** - a pattern commonly found in marketplaces, freelance platforms, and P2P trading applications.

## 📊 Web2 vs Web3 Architecture Comparison

### Traditional Web2 Escrow Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB2 ESCROW ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │  Client  │────▶│  API Server  │────▶│  PostgreSQL DB   │    │
│  │  (React) │     │  (Node.js)   │     │                  │    │
│  └──────────┘     └──────────────┘     │  ┌────────────┐  │    │
│                          │              │  │  escrows   │  │    │
│                          ▼              │  │  table     │  │    │
│                   ┌──────────────┐      │  └────────────┘  │    │
│                   │   Stripe/    │      │  ┌────────────┐  │    │
│                   │   PayPal     │      │  │  users     │  │    │
│                   └──────────────┘      │  │  table     │  │    │
│                          │              │  └────────────┘  │    │
│                          ▼              └──────────────────┘    │
│                   ┌──────────────┐                              │
│                   │  Custodial   │                              │
│                   │  Bank Acct   │                              │
│                   └──────────────┘                              │
│                                                                  │
│  Trust Model: Users trust the platform operator                 │
│  Single Point of Failure: Database, API Server, Bank            │
│  Censorship: Platform can freeze/seize funds                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Web2 Database Schema

```sql
CREATE TABLE escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    arbiter_id UUID REFERENCES users(id),
    amount DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    state VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deadline TIMESTAMP,
    dispute_reason TEXT,
    resolution_notes TEXT,
    
    CONSTRAINT valid_state CHECK (state IN (
        'CREATED', 'FUNDED', 'DELIVERED', 
        'COMPLETED', 'CANCELLED', 'DISPUTED', 'RESOLVED'
    ))
);

CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id UUID NOT NULL REFERENCES escrows(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    stripe_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_escrows_buyer ON escrows(buyer_id);
CREATE INDEX idx_escrows_seller ON escrows(seller_id);
CREATE INDEX idx_escrows_state ON escrows(state);
```

#### Web2 API Endpoints

```javascript
// Express.js API Routes
app.post('/api/escrows', authenticate, createEscrow);
app.get('/api/escrows/:id', authenticate, getEscrow);
app.post('/api/escrows/:id/fund', authenticate, fundEscrow);
app.post('/api/escrows/:id/deliver', authenticate, markDelivered);
app.post('/api/escrows/:id/release', authenticate, releaseFunds);
app.post('/api/escrows/:id/cancel', authenticate, cancelEscrow);
app.post('/api/escrows/:id/dispute', authenticate, raiseDispute);
app.post('/api/escrows/:id/resolve', authenticate, adminOnly, resolveDispute);
```

---

### Solana Web3 Escrow Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB3 ESCROW ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │  Client  │────▶│   Solana     │────▶│  Program (PDA)   │    │
│  │  (React) │     │   RPC Node   │     │                  │    │
│  └──────────┘     └──────────────┘     │  ┌────────────┐  │    │
│       │                  │              │  │  Escrow    │  │    │
│       │                  │              │  │  Account   │  │    │
│       ▼                  │              │  └────────────┘  │    │
│  ┌──────────┐           │              │  ┌────────────┐  │    │
│  │  Wallet  │           │              │  │  Vault     │  │    │
│  │ (Phantom)│           │              │  │  Account   │  │    │
│  └──────────┘           │              │  └────────────┘  │    │
│       │                  │              │  ┌────────────┐  │    │
│       └──────────────────┴─────────────▶│  │  Config    │  │    │
│                                         │  │  Account   │  │    │
│                                         │  └────────────┘  │    │
│                                         └──────────────────┘    │
│                                                                  │
│  Trust Model: Trustless - code is law                           │
│  No Single Point of Failure: Decentralized validators           │
│  Censorship Resistant: No entity can freeze funds               │
└─────────────────────────────────────────────────────────────────┘
```

#### Solana Account Structure (PDAs)

```rust
// Platform Config PDA: ["platform_config"]
PlatformConfig {
    admin: Pubkey,
    fee_bps: u16,
    fee_recipient: Pubkey,
    total_escrows: u64,
    total_volume: u64,
}

// Escrow PDA: ["escrow", buyer_pubkey, escrow_id]
Escrow {
    buyer: Pubkey,
    seller: Pubkey,
    arbiter: Pubkey,
    amount: u64,
    state: EscrowState,
    deadline: i64,
    fee_bps: u16,
}

// Vault PDA: ["vault", escrow_pubkey]
// (Native SOL account holding escrowed funds)
```

---

## 🔄 State Machine Comparison

### State Transitions

```
                    WEB2                              WEB3
                    
    ┌─────────┐                           ┌─────────┐
    │ CREATED │                           │ CREATED │
    └────┬────┘                           └────┬────┘
         │ fund()                              │ FundEscrow
         ▼                                     ▼
    ┌─────────┐                           ┌─────────┐
    │ FUNDED  │◀──────────────────────────│ FUNDED  │
    └────┬────┘                           └────┬────┘
         │                                     │
    ┌────┴────┬──────────┐           ┌────────┼────────┐
    │         │          │           │        │        │
    ▼         ▼          ▼           ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│DELIVERED│ │DISPUTED│ │CANCELLED│ │DELIVERED│ │DISPUTED│ │CANCELLED│
└────┬────┘ └────┬───┘ └────────┘ └────┬────┘ └────┬───┘ └────────┘
     │           │                      │           │
     ▼           ▼                      ▼           ▼
┌─────────┐ ┌─────────┐           ┌─────────┐ ┌─────────┐
│COMPLETED│ │RESOLVED │           │COMPLETED│ │RESOLVED │
└─────────┘ └─────────┘           └─────────┘ └─────────┘
```

---

## ⚖️ Tradeoffs & Constraints

| Aspect | Web2 | Web3 (Solana) |
|--------|------|---------------|
| **Trust Model** | Trust platform operator | Trustless (code is law) |
| **Latency** | ~50-200ms | ~400ms (slot time) |
| **Cost per Transaction** | ~$0.01-0.05 (payment processor) | ~$0.00025 (transaction fee) |
| **Data Storage Cost** | ~$0.023/GB/month (AWS S3) | ~0.00089 SOL/byte (rent) |
| **Scalability** | Horizontal scaling | 65,000 TPS (theoretical) |
| **Privacy** | Data is private | All data is public |
| **Reversibility** | Admin can reverse | Immutable (by design) |
| **Uptime** | 99.9% SLA typical | 99.5%+ (network dependent) |
| **Compliance** | Easy KYC/AML | Pseudonymous by default |
| **Dispute Resolution** | Human arbitration | On-chain arbiter or DAO |

### Key Architectural Differences

1. **Account Model vs Database**
   - Web2: Relational tables with foreign keys
   - Web3: PDAs (Program Derived Addresses) with serialized data

2. **Authentication**
   - Web2: JWT tokens, sessions, OAuth
   - Web3: Cryptographic signatures from wallets

3. **Authorization**
   - Web2: Role-based middleware
   - Web3: On-chain account ownership checks

4. **Atomicity**
   - Web2: Database transactions with rollback
   - Web3: All-or-nothing instruction execution

5. **Event Logging**
   - Web2: Application logs, audit tables
   - Web3: Program logs, indexed by explorers

---

## 🚀 Deployment

### Program Address (Devnet)
```
Program ID: EscrowEngine111111111111111111111111111111111
```

### Example Transactions (Devnet)

| Action | Transaction Signature |
|--------|----------------------|
| Initialize Platform | `[pending deployment]` |
| Create Escrow | `[pending deployment]` |
| Fund Escrow | `[pending deployment]` |
| Release Funds | `[pending deployment]` |

---

## 🛠️ Local Development

### Prerequisites
- Rust 1.70+
- Solana CLI 1.18+
- Node.js 18+

### Build Program
```bash
cd contracts/escrow_engine
cargo build-bpf
```

### Deploy to Devnet
```bash
solana program deploy target/deploy/escrow_engine.so --url devnet
```

### Run Tests
```bash
cargo test
```

---

## 📱 Client Interface

The frontend application provides:
- Wallet connection (Phantom, Solflare)
- Create new escrows
- Fund existing escrows
- Mark delivery complete
- Release funds
- Raise/resolve disputes
- View escrow history

---

## 🔐 Security Considerations

1. **Reentrancy**: Not applicable in Solana's execution model
2. **Integer Overflow**: Checked math in Rust
3. **Access Control**: Signer verification on all state-changing instructions
4. **PDA Validation**: All PDAs verified against expected seeds
5. **Rent Exemption**: All accounts created with minimum rent

---

## 📚 Further Reading

- [Solana Cookbook - PDAs](https://solanacookbook.com/core-concepts/pdas.html)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Program Security](https://docs.solana.com/developing/programming-model/security)

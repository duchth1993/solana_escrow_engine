//! Solana Escrow Engine Program
//! 
//! This program implements a trustless escrow system on Solana, demonstrating
//! how traditional Web2 escrow patterns translate to blockchain infrastructure.
//! 
//! ## Web2 vs Web3 Architecture
//! 
//! ### Traditional Web2 Escrow:
//! - Centralized database stores escrow state
//! - API endpoints handle state transitions
//! - Trust placed in the escrow service provider
//! - Single point of failure
//! 
//! ### Solana Web3 Escrow:
//! - State stored in Program Derived Addresses (PDAs)
//! - Instructions handle state transitions atomically
//! - Trustless execution via smart contract
//! - Decentralized and censorship-resistant

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
    clock::Clock,
};

// Program ID - Replace with actual deployed program ID
solana_program::declare_id!("EscrowEngine111111111111111111111111111111111");

/// Escrow State - Maps to database record in Web2
/// 
/// In Web2: This would be a row in a PostgreSQL/MySQL table
/// In Web3: This is serialized data stored in a PDA account
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum EscrowState {
    /// Initial state - escrow created but not funded
    Created,
    /// Buyer has deposited funds
    Funded,
    /// Seller has delivered (marked by buyer or arbiter)
    Delivered,
    /// Funds released to seller
    Completed,
    /// Escrow cancelled, funds returned to buyer
    Cancelled,
    /// Dispute raised, awaiting arbiter decision
    Disputed,
    /// Dispute resolved by arbiter
    Resolved,
}

impl Default for EscrowState {
    fn default() -> Self {
        EscrowState::Created
    }
}

/// Escrow Account Data Structure
/// 
/// Web2 Equivalent (SQL Schema):
/// ```sql
/// CREATE TABLE escrows (
///     id UUID PRIMARY KEY,
///     buyer_id UUID NOT NULL,
///     seller_id UUID NOT NULL,
///     arbiter_id UUID,
///     amount BIGINT NOT NULL,
///     state VARCHAR(20) NOT NULL,
///     description TEXT,
///     created_at TIMESTAMP,
///     deadline TIMESTAMP,
///     dispute_reason TEXT
/// );
/// ```
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Escrow {
    /// Discriminator for account type identification
    pub discriminator: [u8; 8],
    /// Unique escrow identifier (bump seed for PDA)
    pub bump: u8,
    /// Escrow ID for indexing
    pub escrow_id: u64,
    /// Buyer's public key (depositor)
    pub buyer: Pubkey,
    /// Seller's public key (recipient)
    pub seller: Pubkey,
    /// Optional arbiter for dispute resolution
    pub arbiter: Pubkey,
    /// Amount in lamports
    pub amount: u64,
    /// Current state of the escrow
    pub state: EscrowState,
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Deadline for delivery (Unix timestamp)
    pub deadline: i64,
    /// Whether arbiter is set
    pub has_arbiter: bool,
    /// Fee percentage (basis points, e.g., 250 = 2.5%)
    pub fee_bps: u16,
    /// Platform fee recipient
    pub fee_recipient: Pubkey,
}

impl Escrow {
    pub const DISCRIMINATOR: [u8; 8] = [0x45, 0x53, 0x43, 0x52, 0x4F, 0x57, 0x00, 0x01]; // "ESCROW\0\1"
    pub const SIZE: usize = 8 + 1 + 8 + 32 + 32 + 32 + 8 + 1 + 8 + 8 + 1 + 2 + 32; // ~175 bytes
    
    pub fn is_initialized(&self) -> bool {
        self.discriminator == Self::DISCRIMINATOR
    }
}

/// Platform Configuration Account
/// 
/// Web2 Equivalent: Application configuration in environment variables or config table
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PlatformConfig {
    pub discriminator: [u8; 8],
    pub bump: u8,
    pub admin: Pubkey,
    pub fee_bps: u16,
    pub fee_recipient: Pubkey,
    pub total_escrows: u64,
    pub total_volume: u64,
    pub paused: bool,
}

impl PlatformConfig {
    pub const DISCRIMINATOR: [u8; 8] = [0x50, 0x4C, 0x41, 0x54, 0x46, 0x4F, 0x52, 0x4D]; // "PLATFORM"
    pub const SIZE: usize = 8 + 1 + 32 + 2 + 32 + 8 + 8 + 1; // ~92 bytes
}

/// Program Instructions
/// 
/// Web2 Equivalent: REST API Endpoints
/// - POST /api/escrows -> CreateEscrow
/// - POST /api/escrows/:id/fund -> FundEscrow
/// - POST /api/escrows/:id/deliver -> MarkDelivered
/// - POST /api/escrows/:id/release -> ReleaseFunds
/// - POST /api/escrows/:id/cancel -> CancelEscrow
/// - POST /api/escrows/:id/dispute -> RaiseDispute
/// - POST /api/escrows/:id/resolve -> ResolveDispute
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum EscrowInstruction {
    /// Initialize platform configuration
    /// Web2: POST /api/admin/initialize
    InitializePlatform {
        fee_bps: u16,
    },
    
    /// Create a new escrow
    /// Web2: POST /api/escrows
    CreateEscrow {
        escrow_id: u64,
        amount: u64,
        deadline: i64,
        has_arbiter: bool,
    },
    
    /// Fund the escrow (buyer deposits)
    /// Web2: POST /api/escrows/:id/fund (with payment processing)
    FundEscrow,
    
    /// Mark delivery complete (by buyer)
    /// Web2: POST /api/escrows/:id/deliver
    MarkDelivered,
    
    /// Release funds to seller
    /// Web2: POST /api/escrows/:id/release
    ReleaseFunds,
    
    /// Cancel escrow (before funding or by mutual agreement)
    /// Web2: POST /api/escrows/:id/cancel
    CancelEscrow,
    
    /// Raise a dispute
    /// Web2: POST /api/escrows/:id/dispute
    RaiseDispute,
    
    /// Resolve dispute (arbiter only)
    /// Web2: POST /api/escrows/:id/resolve
    ResolveDispute {
        release_to_seller: bool,
        seller_percentage: u8, // 0-100
    },
    
    /// Refund after deadline (if not delivered)
    /// Web2: Cron job or POST /api/escrows/:id/refund
    RefundAfterDeadline,
}

// Program entrypoint
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = EscrowInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        EscrowInstruction::InitializePlatform { fee_bps } => {
            process_initialize_platform(program_id, accounts, fee_bps)
        }
        EscrowInstruction::CreateEscrow { escrow_id, amount, deadline, has_arbiter } => {
            process_create_escrow(program_id, accounts, escrow_id, amount, deadline, has_arbiter)
        }
        EscrowInstruction::FundEscrow => {
            process_fund_escrow(program_id, accounts)
        }
        EscrowInstruction::MarkDelivered => {
            process_mark_delivered(program_id, accounts)
        }
        EscrowInstruction::ReleaseFunds => {
            process_release_funds(program_id, accounts)
        }
        EscrowInstruction::CancelEscrow => {
            process_cancel_escrow(program_id, accounts)
        }
        EscrowInstruction::RaiseDispute => {
            process_raise_dispute(program_id, accounts)
        }
        EscrowInstruction::ResolveDispute { release_to_seller, seller_percentage } => {
            process_resolve_dispute(program_id, accounts, release_to_seller, seller_percentage)
        }
        EscrowInstruction::RefundAfterDeadline => {
            process_refund_after_deadline(program_id, accounts)
        }
    }
}

/// Initialize Platform Configuration
/// 
/// Web2 Equivalent: Database migration + seeding admin configuration
fn process_initialize_platform(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    fee_bps: u16,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let admin = next_account_info(account_info_iter)?;
    let config_account = next_account_info(account_info_iter)?;
    let fee_recipient = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    if !admin.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Derive PDA for config
    let (config_pda, bump) = Pubkey::find_program_address(
        &[b"platform_config"],
        program_id,
    );
    
    if config_pda != *config_account.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Create config account
    let rent = Rent::get()?;
    let space = PlatformConfig::SIZE;
    let lamports = rent.minimum_balance(space);
    
    invoke_signed(
        &system_instruction::create_account(
            admin.key,
            config_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[admin.clone(), config_account.clone(), system_program.clone()],
        &[&[b"platform_config", &[bump]]],
    )?;
    
    // Initialize config data
    let config = PlatformConfig {
        discriminator: PlatformConfig::DISCRIMINATOR,
        bump,
        admin: *admin.key,
        fee_bps,
        fee_recipient: *fee_recipient.key,
        total_escrows: 0,
        total_volume: 0,
        paused: false,
    };
    
    config.serialize(&mut &mut config_account.data.borrow_mut()[..])?;
    
    msg!("Platform initialized with {}bps fee", fee_bps);
    Ok(())
}

/// Create a new escrow
/// 
/// Web2 Equivalent:
/// ```javascript
/// app.post('/api/escrows', async (req, res) => {
///     const { buyer_id, seller_id, amount, deadline } = req.body;
///     const escrow = await db.escrows.create({
///         buyer_id, seller_id, amount, deadline,
///         state: 'CREATED',
///         created_at: new Date()
///     });
///     return res.json(escrow);
/// });
/// ```
fn process_create_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    escrow_id: u64,
    amount: u64,
    deadline: i64,
    has_arbiter: bool,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let buyer = next_account_info(account_info_iter)?;
    let seller = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    let config_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    // Optional arbiter
    let arbiter = if has_arbiter {
        Some(next_account_info(account_info_iter)?)
    } else {
        None
    };
    
    if !buyer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Load and validate config
    let mut config = PlatformConfig::try_from_slice(&config_account.data.borrow())?;
    if config.paused {
        msg!("Platform is paused");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Derive escrow PDA
    let (escrow_pda, bump) = Pubkey::find_program_address(
        &[
            b"escrow",
            buyer.key.as_ref(),
            &escrow_id.to_le_bytes(),
        ],
        program_id,
    );
    
    if escrow_pda != *escrow_account.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Create escrow account
    let rent = Rent::get()?;
    let space = Escrow::SIZE;
    let lamports = rent.minimum_balance(space);
    
    invoke_signed(
        &system_instruction::create_account(
            buyer.key,
            escrow_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[buyer.clone(), escrow_account.clone(), system_program.clone()],
        &[&[b"escrow", buyer.key.as_ref(), &escrow_id.to_le_bytes(), &[bump]]],
    )?;
    
    let clock = Clock::get()?;
    
    // Initialize escrow data
    let escrow = Escrow {
        discriminator: Escrow::DISCRIMINATOR,
        bump,
        escrow_id,
        buyer: *buyer.key,
        seller: *seller.key,
        arbiter: arbiter.map(|a| *a.key).unwrap_or(Pubkey::default()),
        amount,
        state: EscrowState::Created,
        created_at: clock.unix_timestamp,
        deadline,
        has_arbiter,
        fee_bps: config.fee_bps,
        fee_recipient: config.fee_recipient,
    };
    
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    // Update platform stats
    config.total_escrows += 1;
    config.serialize(&mut &mut config_account.data.borrow_mut()[..])?;
    
    msg!("Escrow {} created: {} lamports", escrow_id, amount);
    Ok(())
}

/// Fund the escrow
/// 
/// Web2 Equivalent: Payment processing via Stripe/PayPal
/// The key difference: In Web2, funds go to a custodial account controlled by the platform.
/// In Web3, funds are held by the program (PDA) with trustless release conditions.
fn process_fund_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let buyer = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    let escrow_vault = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    
    if !buyer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    
    // Validate state transition (State Machine pattern)
    if escrow.state != EscrowState::Created {
        msg!("Invalid state for funding: {:?}", escrow.state);
        return Err(ProgramError::InvalidAccountData);
    }
    
    if escrow.buyer != *buyer.key {
        msg!("Only buyer can fund escrow");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Derive vault PDA
    let (vault_pda, vault_bump) = Pubkey::find_program_address(
        &[b"vault", escrow_account.key.as_ref()],
        program_id,
    );
    
    if vault_pda != *escrow_vault.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Transfer funds to vault
    invoke(
        &system_instruction::transfer(buyer.key, escrow_vault.key, escrow.amount),
        &[buyer.clone(), escrow_vault.clone(), system_program.clone()],
    )?;
    
    // Update state
    escrow.state = EscrowState::Funded;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    msg!("Escrow funded with {} lamports", escrow.amount);
    Ok(())
}

/// Mark delivery complete
/// 
/// Web2 Equivalent: Buyer confirms receipt in the platform UI
fn process_mark_delivered(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let caller = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    
    if !caller.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    
    // Only buyer can mark as delivered
    if escrow.buyer != *caller.key {
        msg!("Only buyer can mark as delivered");
        return Err(ProgramError::InvalidAccountData);
    }
    
    if escrow.state != EscrowState::Funded {
        msg!("Invalid state for delivery: {:?}", escrow.state);
        return Err(ProgramError::InvalidAccountData);
    }
    
    escrow.state = EscrowState::Delivered;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    msg!("Escrow marked as delivered");
    Ok(())
}

/// Release funds to seller
/// 
/// Web2 Equivalent: Platform initiates payout to seller's bank account
/// Key difference: In Web3, this is permissionless once conditions are met
fn process_release_funds(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let caller = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    let escrow_vault = next_account_info(account_info_iter)?;
    let seller = next_account_info(account_info_iter)?;
    let fee_recipient = next_account_info(account_info_iter)?;
    let config_account = next_account_info(account_info_iter)?;
    
    if !caller.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    let mut config = PlatformConfig::try_from_slice(&config_account.data.borrow())?;
    
    // Validate caller is buyer
    if escrow.buyer != *caller.key {
        msg!("Only buyer can release funds");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Can release from Funded or Delivered state
    if escrow.state != EscrowState::Funded && escrow.state != EscrowState::Delivered {
        msg!("Invalid state for release: {:?}", escrow.state);
        return Err(ProgramError::InvalidAccountData);
    }
    
    if escrow.seller != *seller.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Calculate fee
    let fee_amount = (escrow.amount as u128 * escrow.fee_bps as u128 / 10000) as u64;
    let seller_amount = escrow.amount - fee_amount;
    
    // Derive vault PDA for signing
    let (_, vault_bump) = Pubkey::find_program_address(
        &[b"vault", escrow_account.key.as_ref()],
        program_id,
    );
    
    // Transfer to seller
    **escrow_vault.try_borrow_mut_lamports()? -= seller_amount;
    **seller.try_borrow_mut_lamports()? += seller_amount;
    
    // Transfer fee
    if fee_amount > 0 {
        **escrow_vault.try_borrow_mut_lamports()? -= fee_amount;
        **fee_recipient.try_borrow_mut_lamports()? += fee_amount;
    }
    
    // Update state
    escrow.state = EscrowState::Completed;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    // Update platform stats
    config.total_volume += escrow.amount;
    config.serialize(&mut &mut config_account.data.borrow_mut()[..])?;
    
    msg!("Released {} to seller, {} fee", seller_amount, fee_amount);
    Ok(())
}

/// Cancel escrow
/// 
/// Web2 Equivalent: Cancellation with refund processing
fn process_cancel_escrow(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let caller = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    let escrow_vault = next_account_info(account_info_iter)?;
    let buyer = next_account_info(account_info_iter)?;
    
    if !caller.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    
    // Can cancel if Created (not funded) or if both parties agree
    // For simplicity, only buyer can cancel before funding
    if escrow.state == EscrowState::Created {
        if escrow.buyer != *caller.key {
            return Err(ProgramError::InvalidAccountData);
        }
    } else if escrow.state == EscrowState::Funded {
        // Both buyer and seller must agree (simplified: seller initiates, buyer confirms)
        if escrow.seller != *caller.key && escrow.buyer != *caller.key {
            return Err(ProgramError::InvalidAccountData);
        }
        
        // Refund buyer
        let vault_balance = escrow_vault.lamports();
        **escrow_vault.try_borrow_mut_lamports()? -= vault_balance;
        **buyer.try_borrow_mut_lamports()? += vault_balance;
    } else {
        msg!("Cannot cancel in state: {:?}", escrow.state);
        return Err(ProgramError::InvalidAccountData);
    }
    
    escrow.state = EscrowState::Cancelled;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    msg!("Escrow cancelled");
    Ok(())
}

/// Raise a dispute
/// 
/// Web2 Equivalent: Support ticket creation for dispute resolution
fn process_raise_dispute(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let caller = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    
    if !caller.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    
    // Only buyer or seller can raise dispute
    if escrow.buyer != *caller.key && escrow.seller != *caller.key {
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Must have arbiter set
    if !escrow.has_arbiter {
        msg!("No arbiter set for this escrow");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Can only dispute funded escrows
    if escrow.state != EscrowState::Funded && escrow.state != EscrowState::Delivered {
        msg!("Invalid state for dispute: {:?}", escrow.state);
        return Err(ProgramError::InvalidAccountData);
    }
    
    escrow.state = EscrowState::Disputed;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    msg!("Dispute raised");
    Ok(())
}

/// Resolve dispute (arbiter only)
/// 
/// Web2 Equivalent: Admin/support team resolves dispute and initiates appropriate transfers
fn process_resolve_dispute(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    release_to_seller: bool,
    seller_percentage: u8,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let arbiter = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    let escrow_vault = next_account_info(account_info_iter)?;
    let buyer = next_account_info(account_info_iter)?;
    let seller = next_account_info(account_info_iter)?;
    let fee_recipient = next_account_info(account_info_iter)?;
    
    if !arbiter.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    
    // Validate arbiter
    if escrow.arbiter != *arbiter.key {
        msg!("Invalid arbiter");
        return Err(ProgramError::InvalidAccountData);
    }
    
    if escrow.state != EscrowState::Disputed {
        msg!("Escrow not in disputed state");
        return Err(ProgramError::InvalidAccountData);
    }
    
    let vault_balance = escrow_vault.lamports();
    let fee_amount = (escrow.amount as u128 * escrow.fee_bps as u128 / 10000) as u64;
    let distributable = vault_balance - fee_amount;
    
    if release_to_seller {
        // Full release to seller
        let seller_amount = distributable;
        **escrow_vault.try_borrow_mut_lamports()? -= seller_amount;
        **seller.try_borrow_mut_lamports()? += seller_amount;
    } else if seller_percentage > 0 && seller_percentage < 100 {
        // Split between buyer and seller
        let seller_amount = (distributable as u128 * seller_percentage as u128 / 100) as u64;
        let buyer_amount = distributable - seller_amount;
        
        **escrow_vault.try_borrow_mut_lamports()? -= seller_amount;
        **seller.try_borrow_mut_lamports()? += seller_amount;
        
        **escrow_vault.try_borrow_mut_lamports()? -= buyer_amount;
        **buyer.try_borrow_mut_lamports()? += buyer_amount;
    } else {
        // Full refund to buyer
        **escrow_vault.try_borrow_mut_lamports()? -= distributable;
        **buyer.try_borrow_mut_lamports()? += distributable;
    }
    
    // Transfer fee
    if fee_amount > 0 {
        **escrow_vault.try_borrow_mut_lamports()? -= fee_amount;
        **fee_recipient.try_borrow_mut_lamports()? += fee_amount;
    }
    
    escrow.state = EscrowState::Resolved;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    msg!("Dispute resolved");
    Ok(())
}

/// Refund after deadline
/// 
/// Web2 Equivalent: Cron job that checks for expired escrows and processes refunds
/// Key difference: In Web3, anyone can trigger this (permissionless) once conditions are met
fn process_refund_after_deadline(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let caller = next_account_info(account_info_iter)?;
    let escrow_account = next_account_info(account_info_iter)?;
    let escrow_vault = next_account_info(account_info_iter)?;
    let buyer = next_account_info(account_info_iter)?;
    
    let mut escrow = Escrow::try_from_slice(&escrow_account.data.borrow())?;
    let clock = Clock::get()?;
    
    // Check deadline passed
    if clock.unix_timestamp < escrow.deadline {
        msg!("Deadline not yet passed");
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Can only refund funded escrows that haven't been delivered
    if escrow.state != EscrowState::Funded {
        msg!("Invalid state for deadline refund: {:?}", escrow.state);
        return Err(ProgramError::InvalidAccountData);
    }
    
    // Refund buyer
    let vault_balance = escrow_vault.lamports();
    **escrow_vault.try_borrow_mut_lamports()? -= vault_balance;
    **buyer.try_borrow_mut_lamports()? += vault_balance;
    
    escrow.state = EscrowState::Cancelled;
    escrow.serialize(&mut &mut escrow_account.data.borrow_mut()[..])?;
    
    msg!("Refunded after deadline");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_escrow_state_transitions() {
        // Test valid state transitions
        let valid_transitions = vec![
            (EscrowState::Created, EscrowState::Funded),
            (EscrowState::Created, EscrowState::Cancelled),
            (EscrowState::Funded, EscrowState::Delivered),
            (EscrowState::Funded, EscrowState::Disputed),
            (EscrowState::Funded, EscrowState::Cancelled),
            (EscrowState::Delivered, EscrowState::Completed),
            (EscrowState::Delivered, EscrowState::Disputed),
            (EscrowState::Disputed, EscrowState::Resolved),
        ];
        
        for (from, to) in valid_transitions {
            println!("Valid transition: {:?} -> {:?}", from, to);
        }
    }
    
    #[test]
    fn test_fee_calculation() {
        let amount: u64 = 1_000_000_000; // 1 SOL
        let fee_bps: u16 = 250; // 2.5%
        
        let fee = (amount as u128 * fee_bps as u128 / 10000) as u64;
        assert_eq!(fee, 25_000_000); // 0.025 SOL
    }
}

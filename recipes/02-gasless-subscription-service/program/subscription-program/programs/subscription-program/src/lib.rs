use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use spl_token::instruction as token_instruction;

declare_id!("5MpaXq6rwiWfnpjR5THsa6TsLRMJ8jxgNYw3HH86yKwU");

#[program]
pub mod subscription_program {
    use super::*;

    /// Initialize a new subscription
    /// User signs this ONCE with their Lazorkit passkey
    /// This also delegates the token account to the subscription PDA
    pub fn initialize_subscription(
        ctx: Context<InitializeSubscription>,
        amount_per_period: u64,
        interval_seconds: i64,
        expires_at: Option<i64>,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;

        subscription.authority = ctx.accounts.authority.key();
        subscription.recipient = ctx.accounts.recipient.key();
        subscription.user_token_account = ctx.accounts.user_token_account.key();
        subscription.recipient_token_account = ctx.accounts.recipient_token_account.key();
        subscription.token_mint = ctx.accounts.token_mint.key();
        subscription.amount_per_period = amount_per_period;
        subscription.interval_seconds = interval_seconds;
        subscription.last_charge_timestamp = 0;
        subscription.created_at = clock.unix_timestamp;
        subscription.expires_at = expires_at;
        subscription.is_active = true;
        subscription.total_charged = 0;
        subscription.bump = ctx.bumps.subscription;

        // Delegate the user's token account to the subscription PDA
        // This allows the subscription to pull funds on schedule
        let delegate_ix = token_instruction::approve(
            &ctx.accounts.token_program.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.subscription.key(),
            &ctx.accounts.authority.key(),
            &[],
            u64::MAX, // Unlimited delegation (we enforce limits in our program)
        )?;

        anchor_lang::solana_program::program::invoke(
            &delegate_ix,
            &[
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.subscription.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        msg!("Subscription initialized!");
        msg!("Amount per period: {} tokens", amount_per_period);
        msg!("Interval: {} seconds", interval_seconds);
        msg!("Token account delegated to subscription PDA");

        Ok(())
    }

    /// Charge the subscription
    /// Anyone can call this (merchant, cron job, etc.)
    /// Program enforces that interval has passed
    pub fn charge_subscription(ctx: Context<ChargeSubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // Check if subscription is active
        require!(subscription.is_active, ErrorCode::SubscriptionInactive);

        // Check if expired
        if let Some(expires_at) = subscription.expires_at {
            require!(current_time < expires_at, ErrorCode::SubscriptionExpired);
        }

        // Check if enough time has passed since last charge
        let time_since_last_charge = current_time - subscription.last_charge_timestamp;
        require!(
            time_since_last_charge >= subscription.interval_seconds,
            ErrorCode::IntervalNotMet
        );

        // Validate token accounts are owned by Token Program
        require_keys_eq!(
            *ctx.accounts.user_token_account.owner,
            spl_token::ID,
            ErrorCode::InvalidTokenAccount
        );
        require_keys_eq!(
            *ctx.accounts.recipient_token_account.owner,
            spl_token::ID,
            ErrorCode::InvalidTokenAccount
        );

        // Store values we need before borrowing issues
        let amount = subscription.amount_per_period;
        let authority_key = subscription.authority;
        let recipient_key = subscription.recipient;
        let bump = subscription.bump;

        // Create PDA signer seeds
        let seeds = &[
            b"subscription",
            authority_key.as_ref(),
            recipient_key.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Get subscription PDA key
        let subscription_key = ctx.accounts.subscription.key();

        // Transfer tokens using the subscription PDA as authority (via delegation)
        let transfer_ix = token_instruction::transfer(
            &ctx.accounts.token_program.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.recipient_token_account.key(),
            &subscription_key, // PDA is the delegate
            &[],
            amount,
        )?;

        // Invoke with PDA signer
        invoke_signed(
            &transfer_ix,
            &[
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.recipient_token_account.to_account_info(),
                ctx.accounts.subscription.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Update subscription state (now safe to borrow mutably again)
        let subscription = &mut ctx.accounts.subscription;
        subscription.last_charge_timestamp = current_time;
        subscription.total_charged += amount;

        msg!("Subscription charged!");
        msg!("Amount: {} tokens", amount);
        msg!("Total charged: {} tokens", subscription.total_charged);

        Ok(())
    }

    /// Cancel subscription
    /// Only the authority (user) can cancel
    /// This also revokes the token delegation
    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;

        require!(subscription.is_active, ErrorCode::SubscriptionAlreadyCancelled);

        // Revoke delegation
        let revoke_ix = token_instruction::revoke(
            &ctx.accounts.token_program.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.authority.key(),
            &[],
        )?;

        anchor_lang::solana_program::program::invoke(
            &revoke_ix,
            &[
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        subscription.is_active = false;

        msg!("Subscription cancelled by user");
        msg!("Token delegation revoked");

        Ok(())
    }

    /// Update subscription (modify amount or interval)
    /// Only the authority (user) can update
    pub fn update_subscription(
        ctx: Context<UpdateSubscription>,
        new_amount: Option<u64>,
        new_interval: Option<i64>,
        new_expires_at: Option<i64>,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;

        require!(subscription.is_active, ErrorCode::SubscriptionInactive);

        if let Some(amount) = new_amount {
            subscription.amount_per_period = amount;
            msg!("Updated amount to: {} tokens", amount);
        }

        if let Some(interval) = new_interval {
            subscription.interval_seconds = interval;
            msg!("Updated interval to: {} seconds", interval);
        }

        if new_expires_at.is_some() {
            subscription.expires_at = new_expires_at;
            msg!("Updated expiry");
        }

        Ok(())
    }
}

// Account contexts
#[derive(Accounts)]
pub struct InitializeSubscription<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Subscription::INIT_SPACE,
        seeds = [
            b"subscription",
            authority.key().as_ref(),
            recipient.key().as_ref(),
        ],
        bump
    )]
    pub subscription: Account<'info, Subscription>,

    /// The user's smart wallet (Lazorkit wallet)
    pub authority: Signer<'info>,

    /// CHECK: Merchant/recipient address
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: User's token account (will be delegated to subscription PDA)
    #[account(mut)]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: Recipient's token account
    pub recipient_token_account: UncheckedAccount<'info>,

    /// CHECK: Token mint (USDC)
    pub token_mint: UncheckedAccount<'info>,

    /// CHECK: SPL Token program
    pub token_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ChargeSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.authority.as_ref(),
            subscription.recipient.as_ref(),
        ],
        bump = subscription.bump,
    )]
    pub subscription: Account<'info, Subscription>,

    /// CHECK: User's token account - validated against subscription
    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account
    )]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: Recipient's token account - validated against subscription
    #[account(
        mut,
        constraint = recipient_token_account.key() == subscription.recipient_token_account
    )]
    pub recipient_token_account: UncheckedAccount<'info>,

    /// CHECK: SPL Token program
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.authority.as_ref(),
            subscription.recipient.as_ref(),
        ],
        bump = subscription.bump,
        has_one = authority
    )]
    pub subscription: Account<'info, Subscription>,

    pub authority: Signer<'info>,

    /// CHECK: User's token account - for revoking delegation
    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account
    )]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: SPL Token program
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct UpdateSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.authority.as_ref(),
            subscription.recipient.as_ref(),
        ],
        bump = subscription.bump,
        has_one = authority
    )]
    pub subscription: Account<'info, Subscription>,

    pub authority: Signer<'info>,
}

// Subscription account structure
#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub authority: Pubkey,              // User's Lazorkit smart wallet
    pub recipient: Pubkey,              // Merchant receiving payments
    pub user_token_account: Pubkey,     // User's USDC account
    pub recipient_token_account: Pubkey, // Merchant's USDC account
    pub token_mint: Pubkey,             // USDC mint
    pub amount_per_period: u64,         // Amount to charge each period
    pub interval_seconds: i64,          // Time between charges (e.g., 30 days)
    pub last_charge_timestamp: i64,     // When last charged
    pub created_at: i64,                // Subscription creation time
    pub expires_at: Option<i64>,        // Optional expiry
    pub is_active: bool,                // Can be cancelled
    pub total_charged: u64,             // Running total
    pub bump: u8,                       // PDA bump seed
}

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Subscription is not active")]
    SubscriptionInactive,
    #[msg("Subscription has expired")]
    SubscriptionExpired,
    #[msg("Not enough time has passed since last charge")]
    IntervalNotMet,
    #[msg("Subscription already cancelled")]
    SubscriptionAlreadyCancelled,
    #[msg("Invalid token account - must be owned by Token Program")]
    InvalidTokenAccount,
}
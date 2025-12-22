use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use spl_token::instruction as token_instruction;

declare_id!("5MpaXq6rwiWfnpjR5THsa6TsLRMJ8jxgNYw3HH86yKwU");

#[program]
pub mod subscription_program {
    use super::*;

    /// Initialize a new subscription AND charge first payment immediately (PREPAID)
    pub fn initialize_subscription(
        ctx: Context<InitializeSubscription>,
        amount_per_period: u64,
        interval_seconds: i64,
        expires_at: Option<i64>,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // ========== STEP 1: DELEGATE TOKEN ACCOUNT ==========
        // This MUST happen before we charge, so PDA can act as delegate
        let delegate_ix = token_instruction::approve(
            &ctx.accounts.token_program.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.subscription.key(),
            &ctx.accounts.authority.key(),
            &[],
            u64::MAX,
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

        // ========== STEP 2: CHARGE FIRST PAYMENT IMMEDIATELY ==========
        // Get PDA info BEFORE borrowing subscription mutably
        let authority_key = ctx.accounts.authority.key();
        let recipient_key = ctx.accounts.recipient.key();
        let subscription_key = ctx.accounts.subscription.key();
        let bump = ctx.bumps.subscription;

        let seeds = &[
            b"subscription",
            authority_key.as_ref(),
            recipient_key.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer first payment using PDA as delegate
        let transfer_ix = token_instruction::transfer(
            &ctx.accounts.token_program.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.recipient_token_account.key(),
            &subscription_key,
            &[],
            amount_per_period,
        )?;

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

        // ========== STEP 3: INITIALIZE SUBSCRIPTION STATE ==========
        // NOW we can mutably borrow subscription to set its state
        let subscription = &mut ctx.accounts.subscription;
        subscription.authority = authority_key;
        subscription.recipient = recipient_key;
        subscription.user_token_account = ctx.accounts.user_token_account.key();
        subscription.recipient_token_account = ctx.accounts.recipient_token_account.key();
        subscription.token_mint = ctx.accounts.token_mint.key();
        subscription.amount_per_period = amount_per_period;
        subscription.interval_seconds = interval_seconds;
        subscription.last_charge_timestamp = clock.unix_timestamp; // ← Set to NOW for prepaid
        subscription.created_at = clock.unix_timestamp;
        subscription.expires_at = expires_at;
        subscription.is_active = true;
        subscription.total_charged = amount_per_period; // ← Already charged first payment
        subscription.bump = bump;

        msg!("Subscription initialized with PREPAID model!");
        msg!("First payment charged: {} tokens", amount_per_period);
        msg!("Next charge in {} seconds (30 days)", interval_seconds);
        msg!("Token account delegated to subscription PDA");

        Ok(())
    }

    /// Charge the subscription (for recurring payments after first payment)
    pub fn charge_subscription(ctx: Context<ChargeSubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        require!(subscription.is_active, ErrorCode::SubscriptionInactive);

        if let Some(expires_at) = subscription.expires_at {
            require!(current_time < expires_at, ErrorCode::SubscriptionExpired);
        }

        let time_since_last_charge = current_time - subscription.last_charge_timestamp;
        require!(
            time_since_last_charge >= subscription.interval_seconds,
            ErrorCode::IntervalNotMet
        );

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

        let amount = subscription.amount_per_period;
        let authority_key = subscription.authority;
        let recipient_key = subscription.recipient;
        let bump = subscription.bump;

        let seeds = &[
            b"subscription",
            authority_key.as_ref(),
            recipient_key.as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let subscription_key = ctx.accounts.subscription.key();

        let transfer_ix = token_instruction::transfer(
            &ctx.accounts.token_program.key(),
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.recipient_token_account.key(),
            &subscription_key,
            &[],
            amount,
        )?;

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

        let subscription = &mut ctx.accounts.subscription;
        subscription.last_charge_timestamp = current_time;
        subscription.total_charged += amount;

        msg!("Subscription charged!");
        msg!("Amount: {} tokens", amount);
        msg!("Total charged: {} tokens", subscription.total_charged);

        Ok(())
    }

    /// Cancel subscription - closes account and refunds rent
    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let subscription = &ctx.accounts.subscription;

        require!(subscription.is_active, ErrorCode::SubscriptionAlreadyCancelled);

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

        msg!("Subscription cancelled by user");
        msg!("Token delegation revoked");
        msg!("Account closed - rent refunded to user");

        Ok(())
    }

    /// Cleanup old cancelled subscription
    pub fn cleanup_cancelled_subscription(ctx: Context<CleanupCancelledSubscription>) -> Result<()> {
        let subscription = &ctx.accounts.subscription;

        require!(!subscription.is_active, ErrorCode::SubscriptionStillActive);

        msg!("Cleaning up old cancelled subscription");
        msg!("Account closed - rent refunded to user");

        Ok(())
    }

    /// Update subscription
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

    pub authority: Signer<'info>,

    /// CHECK: Merchant/recipient address
    pub recipient: UncheckedAccount<'info>,

    /// CHECK: User's token account (will be delegated to subscription PDA)
    #[account(mut)]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: Recipient's token account
    #[account(mut)]
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

    /// CHECK: User's token account
    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account
    )]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: Recipient's token account
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
        has_one = authority,
        close = authority
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: User's token account
    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account
    )]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: SPL Token program
    pub token_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct CleanupCancelledSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.authority.as_ref(),
            subscription.recipient.as_ref(),
        ],
        bump = subscription.bump,
        has_one = authority,
        close = authority
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.authority.as_ref(),
            subscription.recipient.as_ref(),  // ← FIXED: Added () after as_ref
        ],
        bump = subscription.bump,
        has_one = authority
    )]
    pub subscription: Account<'info, Subscription>,

    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Subscription {
    pub authority: Pubkey,
    pub recipient: Pubkey,
    pub user_token_account: Pubkey,
    pub recipient_token_account: Pubkey,
    pub token_mint: Pubkey,
    pub amount_per_period: u64,
    pub interval_seconds: i64,
    pub last_charge_timestamp: i64,
    pub created_at: i64,
    pub expires_at: Option<i64>,
    pub is_active: bool,
    pub total_charged: u64,
    pub bump: u8,
}

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
    #[msg("Cannot cleanup - subscription is still active")]
    SubscriptionStillActive,
}
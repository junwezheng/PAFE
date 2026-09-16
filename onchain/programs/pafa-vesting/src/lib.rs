//! PAFA vesting escrow.
//!
//! Cashback is paid to users as tokenised equity (xStocks). Rather than sending
//! the tokens straight to the user, each purchase escrows them in a per-purchase
//! "lot" PDA. A lot becomes claimable when either:
//!
//!   * the time cliff passes (`vesting_days` after it was earned), or
//!   * the user spends `monthly_spend_target` inside the same calendar month,
//!     which waives the hold on every lot earned that month.
//!
//! Escrowed stock still belongs to the user for benefit-tier purposes — the lot
//! PDA is derived from their pubkey and only they can release it. The client
//! sums lot balances into "held value", so vesting never gates a perk.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub const CONFIG_SEED: &[u8] = b"config";
pub const USER_SEED: &[u8] = b"user";
pub const LOT_SEED: &[u8] = b"lot";

pub const SECONDS_PER_DAY: i64 = 86_400;

#[program]
pub mod pafa_vesting {
    use super::*;

    /// One-time setup of the global economics. Signer becomes the authority.
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        vesting_days: u16,
        monthly_spend_target_cents: u64,
        cashback_bps: u16,
    ) -> Result<()> {
        require!(cashback_bps <= 10_000, PafaError::InvalidCashbackRate);

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.vesting_days = vesting_days;
        config.monthly_spend_target_cents = monthly_spend_target_cents;
        config.cashback_bps = cashback_bps;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Retune the economics. Mirrors the Tweaks panel in the demo app.
    pub fn set_params(
        ctx: Context<SetParams>,
        vesting_days: u16,
        monthly_spend_target_cents: u64,
        cashback_bps: u16,
    ) -> Result<()> {
        require!(cashback_bps <= 10_000, PafaError::InvalidCashbackRate);

        let config = &mut ctx.accounts.config;
        config.vesting_days = vesting_days;
        config.monthly_spend_target_cents = monthly_spend_target_cents;
        config.cashback_bps = cashback_bps;
        Ok(())
    }

    /// Create the per-user spend/vesting ledger.
    pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let user = &mut ctx.accounts.user_state;
        user.owner = ctx.accounts.owner.key();
        user.month_key = month_key_from_unix(now);
        user.month_spend_cents = 0;
        user.lifetime_spend_cents = 0;
        user.vesting_waived = false;
        user.lot_count = 0;
        user.bump = ctx.bumps.user_state;
        Ok(())
    }

    /// Record a purchase and escrow the cashback stock into a fresh lot.
    ///
    /// `stock_amount` is in the mint's base units and is computed off-chain from
    /// the swap that acquired it (USDC -> xStock). The funder — PAFA's treasury
    /// in production — signs, because the tokens move out of its account.
    ///
    /// `lot_index` must equal the user's current `lot_count`; it is an argument
    /// rather than a read so it can be used as a PDA seed.
    pub fn record_purchase(
        ctx: Context<RecordPurchase>,
        lot_index: u64,
        spend_cents: u64,
        stock_amount: u64,
    ) -> Result<()> {
        require!(stock_amount > 0, PafaError::EmptyLot);

        let now = Clock::get()?.unix_timestamp;
        let month_key = month_key_from_unix(now);
        let vesting_days = ctx.accounts.config.vesting_days as i64;
        let target = ctx.accounts.config.monthly_spend_target_cents;

        let (owner, waived) = {
            let user = &mut ctx.accounts.user_state;

            // The monthly target resets on the 1st.
            if user.month_key != month_key {
                user.month_key = month_key;
                user.month_spend_cents = 0;
                user.vesting_waived = false;
            }

            user.month_spend_cents = user.month_spend_cents.saturating_add(spend_cents);
            user.lifetime_spend_cents = user.lifetime_spend_cents.saturating_add(spend_cents);
            user.vesting_waived = user.month_spend_cents >= target;
            user.lot_count = user.lot_count.checked_add(1).ok_or(PafaError::LotOverflow)?;

            (user.owner, user.vesting_waived)
        };

        let mint = ctx.accounts.stock_mint.key();
        let unlock_at = now + vesting_days * SECONDS_PER_DAY;

        {
            let lot = &mut ctx.accounts.lot;
            lot.owner = owner;
            lot.mint = mint;
            lot.index = lot_index;
            lot.amount = stock_amount;
            lot.earned_at = now;
            lot.unlock_at = unlock_at;
            lot.month_key = month_key;
            lot.released = false;
            lot.bump = ctx.bumps.lot;
        }

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.funder_stock_account.to_account_info(),
                    to: ctx.accounts.lot_escrow.to_account_info(),
                    authority: ctx.accounts.funder.to_account_info(),
                },
            ),
            stock_amount,
        )?;

        emit!(LotCreated {
            owner,
            mint,
            index: lot_index,
            amount: stock_amount,
            unlock_at,
            month_key,
            vesting_waived: waived,
        });

        Ok(())
    }

    /// Permanently free a lot whose month hit the spend target.
    ///
    /// `release_lot` already honours a live waiver, but the waiver is
    /// month-scoped and resets on the 1st. Calling this the moment the target is
    /// crossed pins the release into the lot, so an unclaimed lot doesn't
    /// silently re-lock when the month rolls over.
    pub fn waive_lot(ctx: Context<WaiveLot>, _lot_index: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let waived = ctx.accounts.user_state.vesting_waived;
        let user_month = ctx.accounts.user_state.month_key;
        let lot = &mut ctx.accounts.lot;

        require!(!lot.released, PafaError::LotAlreadyReleased);
        require!(waived, PafaError::SpendTargetNotMet);
        require!(user_month == lot.month_key, PafaError::WaiverMonthMismatch);

        if lot.unlock_at > now {
            lot.unlock_at = now;
            emit!(LotWaived { owner: lot.owner, index: lot.index, unlock_at: now });
        }
        Ok(())
    }

    /// Claim a vested lot: escrow -> the owner's associated token account.
    pub fn release_lot(ctx: Context<ReleaseLot>, lot_index: u64) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let waived = ctx.accounts.user_state.vesting_waived;
        let user_month = ctx.accounts.user_state.month_key;

        let (lot_bump, lot_owner, lot_mint) = {
            let lot = &ctx.accounts.lot;
            require!(!lot.released, PafaError::LotAlreadyReleased);

            let cliff_passed = now >= lot.unlock_at;
            let waived_this_month = waived && user_month == lot.month_key;
            require!(cliff_passed || waived_this_month, PafaError::StillVesting);

            (lot.bump, lot.owner, lot.mint)
        };

        let amount = ctx.accounts.lot_escrow.amount;
        let owner_key = ctx.accounts.owner.key();
        let index_bytes = lot_index.to_le_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[LOT_SEED, owner_key.as_ref(), index_bytes.as_ref(), &[lot_bump]]];

        if amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.lot_escrow.to_account_info(),
                        to: ctx.accounts.owner_stock_account.to_account_info(),
                        authority: ctx.accounts.lot.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount,
            )?;
        }

        // Reclaim the escrow's rent for the user.
        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.lot_escrow.to_account_info(),
                destination: ctx.accounts.owner.to_account_info(),
                authority: ctx.accounts.lot.to_account_info(),
            },
            signer_seeds,
        ))?;

        ctx.accounts.lot.released = true;

        emit!(LotReleased { owner: lot_owner, mint: lot_mint, index: lot_index, amount, released_at: now });

        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────
// Accounts
// ─────────────────────────────────────────────────────────────

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub vesting_days: u16,
    pub monthly_spend_target_cents: u64,
    pub cashback_bps: u16,
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 8 + 32 + 2 + 8 + 2 + 1;
}

#[account]
pub struct UserState {
    pub owner: Pubkey,
    /// `year * 12 + month_index` for the month currently being accumulated.
    pub month_key: u32,
    pub month_spend_cents: u64,
    pub lifetime_spend_cents: u64,
    pub vesting_waived: bool,
    pub lot_count: u64,
    pub bump: u8,
}

impl UserState {
    pub const LEN: usize = 8 + 32 + 4 + 8 + 8 + 1 + 8 + 1;
}

#[account]
pub struct VestingLot {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub index: u64,
    pub amount: u64,
    pub earned_at: i64,
    pub unlock_at: i64,
    pub month_key: u32,
    pub released: bool,
    pub bump: u8,
}

impl VestingLot {
    // disc + owner + mint + index + amount + earned_at + unlock_at + month_key + released + bump
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 4 + 1 + 1;
}

// ─────────────────────────────────────────────────────────────
// Contexts
// ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(init, payer = authority, space = Config::LEN, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetParams<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(
        init,
        payer = payer,
        space = UserState::LEN,
        seeds = [USER_SEED, owner.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
    /// CHECK: identity only — the PDA is derived from this key.
    pub owner: UncheckedAccount<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lot_index: u64)]
pub struct RecordPurchase<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [USER_SEED, user_state.owner.as_ref()],
        bump = user_state.bump,
        constraint = user_state.lot_count == lot_index @ PafaError::LotIndexMismatch,
    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        init,
        payer = funder,
        space = VestingLot::LEN,
        seeds = [LOT_SEED, user_state.owner.as_ref(), lot_index.to_le_bytes().as_ref()],
        bump
    )]
    pub lot: Account<'info, VestingLot>,

    pub stock_mint: Account<'info, Mint>,

    /// Escrow owned by the lot PDA itself — only `release_lot` can move it out.
    #[account(
        init,
        payer = funder,
        associated_token::mint = stock_mint,
        associated_token::authority = lot,
    )]
    pub lot_escrow: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = funder_stock_account.mint == stock_mint.key() @ PafaError::MintMismatch,
        constraint = funder_stock_account.owner == funder.key() @ PafaError::FunderMismatch,
    )]
    pub funder_stock_account: Account<'info, TokenAccount>,

    /// PAFA's treasury: pays rent and supplies the stock.
    #[account(mut)]
    pub funder: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(lot_index: u64)]
pub struct WaiveLot<'info> {
    #[account(
        seeds = [USER_SEED, owner.key().as_ref()],
        bump = user_state.bump,
        has_one = owner,
    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        mut,
        seeds = [LOT_SEED, owner.key().as_ref(), lot_index.to_le_bytes().as_ref()],
        bump = lot.bump,
        has_one = owner,
    )]
    pub lot: Account<'info, VestingLot>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(lot_index: u64)]
pub struct ReleaseLot<'info> {
    #[account(
        seeds = [USER_SEED, owner.key().as_ref()],
        bump = user_state.bump,
        has_one = owner,
    )]
    pub user_state: Account<'info, UserState>,

    #[account(
        mut,
        seeds = [LOT_SEED, owner.key().as_ref(), lot_index.to_le_bytes().as_ref()],
        bump = lot.bump,
        has_one = owner,
        has_one = mint,
    )]
    pub lot: Account<'info, VestingLot>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lot,
    )]
    pub lot_escrow: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub owner_stock_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

#[event]
pub struct LotCreated {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub index: u64,
    pub amount: u64,
    pub unlock_at: i64,
    pub month_key: u32,
    pub vesting_waived: bool,
}

#[event]
pub struct LotWaived {
    pub owner: Pubkey,
    pub index: u64,
    pub unlock_at: i64,
}

#[event]
pub struct LotReleased {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub index: u64,
    pub amount: u64,
    pub released_at: i64,
}

// ─────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────

#[error_code]
pub enum PafaError {
    #[msg("Cashback rate must be between 0 and 10000 bps")]
    InvalidCashbackRate,
    #[msg("A lot must escrow a non-zero amount")]
    EmptyLot,
    #[msg("Lot index overflow")]
    LotOverflow,
    #[msg("Lot index does not match the user's next lot")]
    LotIndexMismatch,
    #[msg("This lot has already been released")]
    LotAlreadyReleased,
    #[msg("This lot is still vesting")]
    StillVesting,
    #[msg("The monthly spend target has not been met")]
    SpendTargetNotMet,
    #[msg("The waiver only applies to lots earned in the current month")]
    WaiverMonthMismatch,
    #[msg("Token account mint does not match the stock mint")]
    MintMismatch,
    #[msg("Token account is not owned by the funder")]
    FunderMismatch,
}

// ─────────────────────────────────────────────────────────────
// Calendar math
// ─────────────────────────────────────────────────────────────

/// `year * 12 + month_index` (month_index 0-11) for a Unix timestamp, UTC.
///
/// Uses Howard Hinnant's `civil_from_days` so the monthly reset lands on the
/// real 1st of the month rather than a rolling 30-day window.
pub fn month_key_from_unix(ts: i64) -> u32 {
    let days = ts.div_euclid(SECONDS_PER_DAY);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    (year as u32) * 12 + (m as u32 - 1)
}

#[cfg(test)]
mod tests {
    use super::month_key_from_unix;

    fn key(year: u32, month_1_based: u32) -> u32 {
        year * 12 + (month_1_based - 1)
    }

    #[test]
    fn epoch_is_january_1970() {
        assert_eq!(month_key_from_unix(0), key(1970, 1));
    }

    #[test]
    fn known_timestamps_map_to_the_right_month() {
        // 2026-09-16T00:00:00Z
        assert_eq!(month_key_from_unix(1_789_516_800), key(2026, 9));
        // 2024-02-29T12:00:00Z — leap day
        assert_eq!(month_key_from_unix(1_709_208_000), key(2024, 2));
        // 2000-03-01T00:00:00Z — the 400-year rule
        assert_eq!(month_key_from_unix(951_868_800), key(2000, 3));
    }

    #[test]
    fn month_boundaries_are_exact() {
        // 2026-09-30T23:59:59Z then 2026-10-01T00:00:00Z
        assert_eq!(month_key_from_unix(1_790_812_799), key(2026, 9));
        assert_eq!(month_key_from_unix(1_790_812_800), key(2026, 10));
    }

    #[test]
    fn consecutive_months_differ_by_one() {
        assert_eq!(month_key_from_unix(1_790_812_800) - month_key_from_unix(1_789_516_800), 1);
    }
}

// RuneDelve: Abyssal Vault — on-chain rules for Solana Playground.
//
// Paste this file over Playground's src/lib.rs, then put Playground's own
// declare_id!(...) back on the line below. Build & Deploy once.
//
// Token already created in Playground (9 decimals):
//   8mL2P4G3S3AnJJNaA5VzrDpnMBDBNspQ7U4hHQx1MDrk
// `initialize` already ran. Do not call it again.
// It moved mint authority to this program, so only the program can print $RDAV.
//
// Next test, with that same wallet. The coin purse must already exist
// (the token account that received the minted supply). Do not generate a new one.
//   1. init_player          (prints 100 $RDAV into the existing purse)
//   2. claim_faucet         (prints 10,000 $RDAV, then waits one hour)
//   3. summon_delver(0)     (costs 50, id starts at 0)
//   4. dispatch(0, 0)       and add the delver account as a remaining account
//   5. admin_finish(0)      skips the wait — admin only, for devnet tests
//   6. claim(0)             same delver remaining account
//   7. take_loot(0, 0)      once per dropped item; second arg is the loot slot 0..3
//
// Ownership lives in the `owner` field. Selling changes that field.
// The account address does not change, so a buyer still loads the same account.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use solana_program::pubkey;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, SetAuthority, Token, TokenAccount, Transfer};
use anchor_spl::token::spl_token::instruction::AuthorityType;

declare_id!("8cNry1rJa2WMJX9EdvcDPd346mTjoWWTw39HKshCN3eT");

/// Whole-token amounts are multiplied by this. The mint uses 9 decimals.
const UNIT: u64 = 1_000_000_000;
const STARTER_RDAV: u64 = 100 * UNIT;
/// Whole tokens the shrine prints once an hour.
const FAUCET_RDAV: u64 = 10_000 * UNIT;
const SUMMON_COST: u64 = 50 * UNIT;
const RENAME_COST: u64 = 500 * UNIT;
const IMBUE_COST: u64 = 1_000 * UNIT;
const CURE_COST: u64 = 500 * UNIT;
/// 3% blood tax, in basis points.
const TAX_BPS: u64 = 300;
const IMBUE_GAIN: u16 = 2;
const NONE: u8 = 255;

pub const RDAV_MINT: Pubkey = pubkey!("8mL2P4G3S3AnJJNaA5VzrDpnMBDBNspQ7U4hHQx1MDrk");

#[program]
pub mod rdav {
    use super::*;

    /// Create the rulebook and hand mint authority to the config account.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let mint_auth = ctx.accounts.mint.mint_authority;
        require!(
            mint_auth == COption::Some(ctx.accounts.admin.key()),
            GameError::NotMintAuthority
        );

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.mint = ctx.accounts.mint.key();
        config.guild_vault = ctx.accounts.guild_vault.key();
        config.bump = ctx.bumps.config;

        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.admin.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            AuthorityType::MintTokens,
            Some(config.key()),
        )?;
        Ok(())
    }

    /// Open the player record and print the one-time starter purse into the existing vault.
    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.owner = ctx.accounts.owner.key();
        player.next_delver_id = 0;
        player.next_item_id = 0;
        player.next_run_id = 0;
        player.starter_claimed = true;
        player.last_faucet_at = 0;
        player.summon_window_start = 0;
        player.summons_in_window = 0;
        player.bump = ctx.bumps.player;

        mint_rdav(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
            &ctx.accounts.config,
            STARTER_RDAV,
        )?;
        Ok(())
    }

    /// Beta vein. Ten thousand $RDAV, then the shrine is silent for one hour.
    pub fn claim_faucet(ctx: Context<ClaimFaucet>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let player = &mut ctx.accounts.player;
        require!(
            player.last_faucet_at == 0 || now >= player.last_faucet_at + 3600,
            GameError::FaucetCooling
        );
        player.last_faucet_at = now;
        mint_rdav(
            &ctx.accounts.token_program,
            &ctx.accounts.mint,
            &ctx.accounts.vault,
            &ctx.accounts.config,
            FAUCET_RDAV,
        )?;
        Ok(())
    }

    /// Pay 50 $RDAV and roll one mercenary. `delver_id` must equal `next_delver_id` (starts at 0).
    /// Three summons per hour. The fourth waits.
    pub fn summon_delver(ctx: Context<SummonDelver>, delver_id: u64) -> Result<()> {
        require!(
            delver_id == ctx.accounts.player.next_delver_id,
            GameError::BadId
        );
        let clock = Clock::get()?;
        let player = &mut ctx.accounts.player;
        if player.summon_window_start == 0
            || clock.unix_timestamp >= player.summon_window_start + 3600
        {
            player.summon_window_start = clock.unix_timestamp;
            player.summons_in_window = 0;
        }
        require!(player.summons_in_window < 3, GameError::SummonCap);
        player.summons_in_window = player.summons_in_window.saturating_add(1);

        take_fee(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.guild_vault,
            &ctx.accounts.owner,
            SUMMON_COST,
        )?;

        let mut rng = clock.slot.wrapping_mul(0x9E37_79B9_7F4A_7C15) ^ delver_id ^ 0xA5A5;
        let job = (next_u64(&mut rng) % 5) as u8;
        let rarity = roll_rarity(&mut rng);
        let personality = (next_u64(&mut rng) % 5) as u8;
        let mult = RARITY_MULT[rarity as usize];

        let delver = &mut ctx.accounts.delver;
        delver.origin = ctx.accounts.owner.key();
        delver.owner = ctx.accounts.owner.key();
        delver.id = delver_id;
        let mut name = [0u8; 32];
        name[..7].copy_from_slice(b"Unnamed");
        delver.name = name;
        delver.job = job;
        delver.rarity = rarity;
        delver.personality = personality;
        delver.mining = scale_stat(JOB_MINING[job as usize], mult);
        delver.power = scale_stat(JOB_POWER[job as usize], mult);
        delver.armor = scale_stat(JOB_ARMOR[job as usize], mult);
        delver.luck = scale_stat(JOB_LUCK[job as usize], mult);
        delver.speed = scale_stat(JOB_SPEED[job as usize], mult);
        delver.sanity = scale_stat(JOB_SANITY[job as usize], mult).min(100);
        delver.status = STATUS_IDLE;
        delver.incapacitated_until = 0;
        delver.bump = ctx.bumps.delver;
        ctx.accounts.player.next_delver_id = delver_id + 1;
        Ok(())
    }

    /// Carve a new name. 32 bytes max. Costs 500 $RDAV.
    pub fn rename_delver(ctx: Context<DelverWithFee>, name: String) -> Result<()> {
        require_idle(&ctx.accounts.delver)?;
        write_name(&mut ctx.accounts.delver.name, &name)?;
        take_fee(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.guild_vault,
            &ctx.accounts.owner,
            RENAME_COST,
        )?;
        Ok(())
    }

    /// Pay 1000 $RDAV. Each attribute grows by 2. Sanity stops at 100.
    pub fn imbue_delver(ctx: Context<DelverWithFee>) -> Result<()> {
        require_idle(&ctx.accounts.delver)?;
        take_fee(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.guild_vault,
            &ctx.accounts.owner,
            IMBUE_COST,
        )?;
        let delver = &mut ctx.accounts.delver;
        delver.mining = delver.mining.saturating_add(IMBUE_GAIN);
        delver.power = delver.power.saturating_add(IMBUE_GAIN);
        delver.armor = delver.armor.saturating_add(IMBUE_GAIN);
        delver.luck = delver.luck.saturating_add(IMBUE_GAIN);
        delver.speed = delver.speed.saturating_add(IMBUE_GAIN);
        delver.sanity = delver.sanity.saturating_add(IMBUE_GAIN).min(100);
        Ok(())
    }

    /// Put a bag item into the matching slot. `slot`: 0 pickaxe, 1 armor, 2 accessory, 3 consumable.
    pub fn equip(ctx: Context<Equip>, slot: u8) -> Result<()> {
        require!(slot < 4, GameError::BadSlot);
        require_idle(&ctx.accounts.delver)?;
        require!(!ctx.accounts.item.listed, GameError::Listed);
        require!(
            ctx.accounts.item.equipped_to == Pubkey::default(),
            GameError::AlreadyEquipped
        );
        require!(ctx.accounts.item.kind == slot, GameError::BadSlot);
        require!(ctx.accounts.item.owner == ctx.accounts.owner.key(), GameError::NotOwner);

        let slot_ref = slot_pubkey(&ctx.accounts.delver, slot);
        require!(*slot_ref == Pubkey::default(), GameError::SlotFull);

        *slot_pubkey_mut(&mut ctx.accounts.delver, slot) = ctx.accounts.item.key();
        add_gear(&mut ctx.accounts.delver, &ctx.accounts.item, true);
        ctx.accounts.item.equipped_to = ctx.accounts.delver.key();
        Ok(())
    }

    /// Drop a slot back into the bag.
    pub fn unequip(ctx: Context<Equip>, slot: u8) -> Result<()> {
        require!(slot < 4, GameError::BadSlot);
        require_idle(&ctx.accounts.delver)?;
        require!(
            slot_pubkey(&ctx.accounts.delver, slot) == &ctx.accounts.item.key(),
            GameError::BadSlot
        );
        *slot_pubkey_mut(&mut ctx.accounts.delver, slot) = Pubkey::default();
        add_gear(&mut ctx.accounts.delver, &ctx.accounts.item, false);
        ctx.accounts.item.equipped_to = Pubkey::default();
        Ok(())
    }

    /// Send 1–3 healthy, idle mercenaries. Pass each delver account as a remaining account, in order.
    /// `run_id` must equal `next_run_id`.
    pub fn dispatch(ctx: Context<Dispatch>, run_id: u64, zone: u8) -> Result<()> {
        require!(zone < 4, GameError::BadZone);
        require!(run_id == ctx.accounts.player.next_run_id, GameError::BadId);
        let count = ctx.remaining_accounts.len();
        require!((1..=3).contains(&count), GameError::BadSquad);

        let clock = Clock::get()?;
        let mut duration = ZONE_SECONDS[zone as usize];
        let mut reckless = false;

        let mut squad = [Pubkey::default(); 3];
        for (index, account) in ctx.remaining_accounts.iter().enumerate() {
            let mut delver = load_delver(account, ctx.program_id)?;
            require!(delver.owner == ctx.accounts.owner.key(), GameError::NotOwner);
            require_idle(&delver)?;
            if delver.personality == 4 {
                reckless = true;
            }
            delver.status = STATUS_DELVING;
            squad[index] = account.key();
            save_delver(account, &delver)?;
        }
        if reckless {
            duration = duration * 85 / 100;
        }

        let run = &mut ctx.accounts.expedition;
        run.owner = ctx.accounts.owner.key();
        run.id = run_id;
        run.zone = zone;
        run.squad_len = count as u8;
        run.squad = squad;
        run.started_at = clock.unix_timestamp;
        run.duration = duration;
        run.seed = clock
            .slot
            .wrapping_mul(0x9E37_79B9_7F4A_7C15)
            .wrapping_add(run_id);
        run.claimed = false;
        run.loot = [NONE; 4];
        run.bump = ctx.bumps.expedition;
        ctx.accounts.player.next_run_id = run_id + 1;
        Ok(())
    }

    /// Devnet only. The admin wallet pulls a cart to the chest without waiting.
    pub fn admin_finish(ctx: Context<AdminRun>, run_id: u64) -> Result<()> {
        require_keys_eq!(ctx.accounts.admin.key(), ctx.accounts.config.admin, GameError::NotAdmin);
        require!(!ctx.accounts.expedition.claimed, GameError::AlreadyClaimed);
        require!(ctx.accounts.expedition.id == run_id, GameError::BadId);
        let now = Clock::get()?.unix_timestamp;
        ctx.accounts.expedition.started_at = now.saturating_sub(ctx.accounts.expedition.duration);
        Ok(())
    }

    /// Open the chest once the clock has passed. Same remaining delver accounts as dispatch.
    /// Mints $RDAV. Writes up to four loot slots. Injury is a timestamp, not a permanent flag.
    pub fn claim(ctx: Context<Claim>, run_id: u64) -> Result<()> {
        let run = &mut ctx.accounts.expedition;
        require!(run.id == run_id, GameError::BadId);
        require!(!run.claimed, GameError::AlreadyClaimed);
        require!(run.owner == ctx.accounts.owner.key(), GameError::NotOwner);
        let now = Clock::get()?.unix_timestamp;
        require!(now >= run.started_at + run.duration, GameError::StillDelving);

        let count = ctx.remaining_accounts.len();
        require!(count == run.squad_len as usize, GameError::BadSquad);

        let mut snaps = [Snap::default(); 3];
        for (i, account) in ctx.remaining_accounts.iter().enumerate() {
            require_keys_eq!(account.key(), run.squad[i], GameError::BadSquad);
            let delver = load_delver(account, ctx.program_id)?;
            require!(delver.owner == ctx.accounts.owner.key(), GameError::NotOwner);
            require!(delver.status == STATUS_DELVING, GameError::NotDelving);
            snaps[i] = snap_of(&delver);
        }

        let plan = resolve(run.zone, run.seed, &snaps[..count]);
        let down_for = if plan.down_mask == 0 {
            0
        } else if plan.outcome == OUTCOME_DEFEAT {
            45 * 60
        } else {
            15 * 60
        };

        for (i, account) in ctx.remaining_accounts.iter().enumerate() {
            let mut delver = load_delver(account, ctx.program_id)?;
            delver.status = STATUS_IDLE;
            if plan.down_mask & (1 << i) != 0 {
                delver.incapacitated_until = now + down_for;
            } else {
                delver.incapacitated_until = 0;
            }
            if plan.outcome != OUTCOME_DEFEAT {
                delver.dungeons_cleared = delver.dungeons_cleared.saturating_add(1);
            }
            delver.rdav_earned = delver.rdav_earned.saturating_add(plan.rdav_whole / count as u64);
            delver.seconds_delved = delver.seconds_delved.saturating_add(run.duration as u64);
            save_delver(account, &delver)?;
        }

        run.claimed = true;
        run.outcome = plan.outcome;
        run.rdav_whole = plan.rdav_whole;
        run.loot = plan.loot;

        let raw = plan.rdav_whole.saturating_mul(UNIT);
        if raw > 0 {
            mint_rdav(
                &ctx.accounts.token_program,
                &ctx.accounts.mint,
                &ctx.accounts.vault,
                &ctx.accounts.config,
                raw,
            )?;
        }
        msg!("outcome {} rdav {}", plan.outcome, plan.rdav_whole);
        Ok(())
    }

    /// Turn one loot slot into an item account. `slot` is 0, 1, 2, or 3.
    /// `item_id` must equal `next_item_id`.
    pub fn take_loot(ctx: Context<TakeLoot>, run_id: u64, slot: u8, item_id: u64) -> Result<()> {
        require!((slot as usize) < 4, GameError::BadSlot);
        require!(item_id == ctx.accounts.player.next_item_id, GameError::BadId);
        require!(ctx.accounts.expedition.id == run_id, GameError::BadId);
        require!(ctx.accounts.expedition.claimed, GameError::NotReady);
        let template = ctx.accounts.expedition.loot[slot as usize];
        require!(template != NONE, GameError::EmptyLoot);
        ctx.accounts.expedition.loot[slot as usize] = NONE;

        write_item_from_template(
            &mut ctx.accounts.item,
            ctx.accounts.owner.key(),
            item_id,
            template,
            ctx.bumps.item,
        )?;
        ctx.accounts.player.next_item_id = item_id + 1;
        Ok(())
    }

    /// Burn one Abyssal Elixir (template 4) and clear one collapse now.
    pub fn use_elixir(ctx: Context<UseElixir>) -> Result<()> {
        require!(ctx.accounts.item.template == 4, GameError::NotElixir);
        require!(ctx.accounts.item.owner == ctx.accounts.owner.key(), GameError::NotOwner);
        require!(
            ctx.accounts.item.equipped_to == Pubkey::default(),
            GameError::AlreadyEquipped
        );
        let now = Clock::get()?.unix_timestamp;
        require!(
            ctx.accounts.delver.incapacitated_until > now,
            GameError::NotInjured
        );
        ctx.accounts.delver.incapacitated_until = 0;
        // The item account is closed by the Anchor constraint, rent returns to the owner.
        Ok(())
    }

    /// Pay 500 $RDAV once and stand every delver passed as a remaining account.
    pub fn pay_cure(ctx: Context<PayCure>) -> Result<()> {
        require!(!ctx.remaining_accounts.is_empty(), GameError::BadSquad);
        let now = Clock::get()?.unix_timestamp;
        let mut any = false;
        for account in ctx.remaining_accounts.iter() {
            let mut delver = load_delver(account, ctx.program_id)?;
            require!(delver.owner == ctx.accounts.owner.key(), GameError::NotOwner);
            if delver.incapacitated_until > now {
                delver.incapacitated_until = 0;
                any = true;
                save_delver(account, &delver)?;
            }
        }
        require!(any, GameError::NotInjured);
        take_fee(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.guild_vault,
            &ctx.accounts.owner,
            CURE_COST,
        )?;
        Ok(())
    }

    /// List a naked, healthy, idle mercenary. Price is whole $RDAV (the program adds 9 decimals).
    pub fn list_delver(ctx: Context<ListDelver>, price_whole: u64) -> Result<()> {
        require!(price_whole > 0, GameError::BadPrice);
        let delver = &mut ctx.accounts.delver;
        require_idle(delver)?;
        require!(naked(delver), GameError::StillGeared);
        delver.listed = true;
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.owner.key();
        listing.asset = delver.key();
        listing.kind = KIND_DELVER;
        listing.price = price_whole.saturating_mul(UNIT);
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    /// List a bag item that is not equipped.
    pub fn list_item(ctx: Context<ListItem>, price_whole: u64) -> Result<()> {
        require!(price_whole > 0, GameError::BadPrice);
        let item = &mut ctx.accounts.item;
        require!(item.owner == ctx.accounts.owner.key(), GameError::NotOwner);
        require!(!item.listed, GameError::Listed);
        require!(item.equipped_to == Pubkey::default(), GameError::AlreadyEquipped);
        item.listed = true;
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.owner.key();
        listing.asset = item.key();
        listing.kind = KIND_ITEM;
        listing.price = price_whole.saturating_mul(UNIT);
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    /// Buy a mercenary. 3% stays in the guild vault. 97% goes to the seller.
    pub fn buy_delver(ctx: Context<BuyDelver>) -> Result<()> {
        settle_buy(
            &ctx.accounts.token_program,
            &ctx.accounts.buyer_vault,
            &ctx.accounts.guild_vault,
            &ctx.accounts.seller_vault,
            &ctx.accounts.buyer,
            ctx.accounts.listing.price,
            ctx.accounts.listing.seller,
        )?;
        let delver = &mut ctx.accounts.delver;
        delver.owner = ctx.accounts.buyer.key();
        delver.listed = false;
        Ok(())
    }

    /// Buy an item. Same 3% cut.
    pub fn buy_item(ctx: Context<BuyItem>) -> Result<()> {
        settle_buy(
            &ctx.accounts.token_program,
            &ctx.accounts.buyer_vault,
            &ctx.accounts.guild_vault,
            &ctx.accounts.seller_vault,
            &ctx.accounts.buyer,
            ctx.accounts.listing.price,
            ctx.accounts.listing.seller,
        )?;
        let item = &mut ctx.accounts.item;
        item.owner = ctx.accounts.buyer.key();
        item.listed = false;
        Ok(())
    }

    /// Pull an unsold mercenary back. No fee.
    pub fn cancel_delver(ctx: Context<CancelDelver>) -> Result<()> {
        ctx.accounts.delver.listed = false;
        Ok(())
    }

    /// Pull an unsold item back. No fee.
    pub fn cancel_item(ctx: Context<CancelItem>) -> Result<()> {
        ctx.accounts.item.listed = false;
        Ok(())
    }
}

// --- accounts ----------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, address = RDAV_MINT)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = config
    )]
    pub guild_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = 8 + Player::LEN,
        seeds = [b"player", owner.key().as_ref()],
        bump
    )]
    pub player: Account<'info, Player>,
    // Do not create this account here. Devnet rejects that create
    // ("Provided owner is not allowed"). Pass the purse this wallet already holds.
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimFaucet<'info> {
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == owner.key()
    )]
    pub player: Account<'info, Player>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(delver_id: u64)]
pub struct SummonDelver<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == owner.key()
    )]
    pub player: Account<'info, Player>,
    #[account(
        init,
        payer = owner,
        space = 8 + Delver::LEN,
        seeds = [b"delver", owner.key().as_ref(), &delver_id.to_le_bytes()],
        bump
    )]
    pub delver: Account<'info, Delver>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = owner
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.guild_vault)]
    pub guild_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelverWithFee<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        seeds = [b"delver", delver.origin.as_ref(), &delver.id.to_le_bytes()],
        bump = delver.bump,
        constraint = delver.owner == owner.key()
    )]
    pub delver: Account<'info, Delver>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = owner
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.guild_vault)]
    pub guild_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Equip<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"delver", delver.origin.as_ref(), &delver.id.to_le_bytes()],
        bump = delver.bump,
        constraint = delver.owner == owner.key()
    )]
    pub delver: Account<'info, Delver>,
    #[account(
        mut,
        seeds = [b"item", item.origin.as_ref(), &item.id.to_le_bytes()],
        bump = item.bump
    )]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
#[instruction(run_id: u64)]
pub struct Dispatch<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == owner.key()
    )]
    pub player: Account<'info, Player>,
    #[account(
        init,
        payer = owner,
        space = 8 + Expedition::LEN,
        seeds = [b"run", owner.key().as_ref(), &run_id.to_le_bytes()],
        bump
    )]
    pub expedition: Account<'info, Expedition>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(run_id: u64)]
pub struct AdminRun<'info> {
    pub admin: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: wallet that dispatched. Seeds bind the run; this key is not a signer.
    pub runner: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"run", runner.key().as_ref(), &run_id.to_le_bytes()],
        bump = expedition.bump,
        constraint = expedition.owner == runner.key()
    )]
    pub expedition: Account<'info, Expedition>,
}

#[derive(Accounts)]
#[instruction(run_id: u64)]
pub struct Claim<'info> {
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [b"run", owner.key().as_ref(), &run_id.to_le_bytes()],
        bump = expedition.bump
    )]
    pub expedition: Account<'info, Expedition>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(run_id: u64, slot: u8, item_id: u64)]
pub struct TakeLoot<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"player", owner.key().as_ref()],
        bump = player.bump,
        constraint = player.owner == owner.key()
    )]
    pub player: Account<'info, Player>,
    #[account(
        mut,
        seeds = [b"run", owner.key().as_ref(), &run_id.to_le_bytes()],
        bump = expedition.bump,
        constraint = expedition.owner == owner.key()
    )]
    pub expedition: Account<'info, Expedition>,
    #[account(
        init,
        payer = owner,
        space = 8 + Item::LEN,
        seeds = [b"item", owner.key().as_ref(), &item_id.to_le_bytes()],
        bump
    )]
    pub item: Account<'info, Item>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UseElixir<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"delver", delver.origin.as_ref(), &delver.id.to_le_bytes()],
        bump = delver.bump,
        constraint = delver.owner == owner.key()
    )]
    pub delver: Account<'info, Delver>,
    #[account(
        mut,
        close = owner,
        seeds = [b"item", item.origin.as_ref(), &item.id.to_le_bytes()],
        bump = item.bump
    )]
    pub item: Account<'info, Item>,
}

#[derive(Accounts)]
pub struct PayCure<'info> {
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = owner
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.guild_vault)]
    pub guild_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ListDelver<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"delver", delver.origin.as_ref(), &delver.id.to_le_bytes()],
        bump = delver.bump,
        constraint = delver.owner == owner.key()
    )]
    pub delver: Account<'info, Delver>,
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::LEN,
        seeds = [b"listing", delver.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListItem<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"item", item.origin.as_ref(), &item.id.to_le_bytes()],
        bump = item.bump
    )]
    pub item: Account<'info, Item>,
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::LEN,
        seeds = [b"listing", item.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyDelver<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: rent from the closed listing returns to the seller wallet.
    #[account(mut, address = listing.seller)]
    pub seller: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"listing", delver.key().as_ref()],
        bump = listing.bump,
        close = seller,
        constraint = listing.kind == KIND_DELVER,
        constraint = listing.asset == delver.key(),
        constraint = listing.seller != buyer.key()
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [b"delver", delver.origin.as_ref(), &delver.id.to_le_bytes()],
        bump = delver.bump,
        constraint = delver.listed
    )]
    pub delver: Account<'info, Delver>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = buyer
    )]
    pub buyer_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = listing.seller
    )]
    pub seller_vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.guild_vault)]
    pub guild_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyItem<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: rent from the closed listing returns to the seller wallet.
    #[account(mut, address = listing.seller)]
    pub seller: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"listing", item.key().as_ref()],
        bump = listing.bump,
        close = seller,
        constraint = listing.kind == KIND_ITEM,
        constraint = listing.asset == item.key(),
        constraint = listing.seller != buyer.key()
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [b"item", item.origin.as_ref(), &item.id.to_le_bytes()],
        bump = item.bump,
        constraint = item.listed
    )]
    pub item: Account<'info, Item>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = buyer
    )]
    pub buyer_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = listing.seller
    )]
    pub seller_vault: Account<'info, TokenAccount>,
    #[account(mut, address = config.guild_vault)]
    pub guild_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelDelver<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"listing", delver.key().as_ref()],
        bump = listing.bump,
        close = owner,
        constraint = listing.seller == owner.key(),
        constraint = listing.asset == delver.key()
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [b"delver", delver.origin.as_ref(), &delver.id.to_le_bytes()],
        bump = delver.bump,
        constraint = delver.owner == owner.key()
    )]
    pub delver: Account<'info, Delver>,
}

#[derive(Accounts)]
pub struct CancelItem<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"listing", item.key().as_ref()],
        bump = listing.bump,
        close = owner,
        constraint = listing.seller == owner.key(),
        constraint = listing.asset == item.key()
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        seeds = [b"item", item.origin.as_ref(), &item.id.to_le_bytes()],
        bump = item.bump,
        constraint = item.owner == owner.key()
    )]
    pub item: Account<'info, Item>,
}

// --- state -------------------------------------------------------------------

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub guild_vault: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const LEN: usize = 32 + 32 + 32 + 1;
}

#[account]
pub struct Player {
    pub owner: Pubkey,
    pub next_delver_id: u64,
    pub next_item_id: u64,
    pub next_run_id: u64,
    pub starter_claimed: bool,
    /// Unix seconds of the last 10,000 $RDAV draw. 0 means never.
    pub last_faucet_at: i64,
    /// Start of the current three-summon hour.
    pub summon_window_start: i64,
    pub summons_in_window: u8,
    pub bump: u8,
}

impl Player {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Delver {
    pub origin: Pubkey,
    pub owner: Pubkey,
    pub id: u64,
    pub name: [u8; 32],
    pub job: u8,
    pub rarity: u8,
    pub personality: u8,
    pub mining: u16,
    pub power: u16,
    pub armor: u16,
    pub luck: u16,
    pub speed: u16,
    pub sanity: u16,
    pub gear_mining: i16,
    pub gear_power: i16,
    pub gear_armor: i16,
    pub gear_luck: i16,
    pub gear_speed: i16,
    pub gear_sanity: i16,
    pub pickaxe: Pubkey,
    pub armor_item: Pubkey,
    pub accessory: Pubkey,
    pub consumable: Pubkey,
    /// 0 idle, 1 delving. Injury is only `incapacitated_until`.
    pub status: u8,
    pub listed: bool,
    pub incapacitated_until: i64,
    pub dungeons_cleared: u32,
    pub rdav_earned: u64,
    pub seconds_delved: u64,
    pub bump: u8,
}

impl Delver {
    pub const LEN: usize = 512;
}

#[account]
pub struct Item {
    pub origin: Pubkey,
    pub owner: Pubkey,
    pub equipped_to: Pubkey,
    pub id: u64,
    /// 0 pickaxe, 1 armor, 2 accessory, 3 consumable.
    pub kind: u8,
    pub template: u8,
    pub rarity: u8,
    pub mining: i16,
    pub power: i16,
    pub armor: i16,
    pub luck: i16,
    pub speed: i16,
    pub sanity: i16,
    pub durability: u16,
    pub listed: bool,
    pub bump: u8,
}

impl Item {
    pub const LEN: usize = 256;
}

#[account]
pub struct Expedition {
    pub owner: Pubkey,
    pub id: u64,
    pub zone: u8,
    pub squad_len: u8,
    /// Mercenaries sealed into this run. Empty seats are the default pubkey.
    pub squad: [Pubkey; 3],
    pub started_at: i64,
    pub duration: i64,
    pub seed: u64,
    pub claimed: bool,
    /// 0 success, 1 costly win, 2 defeat. Meaningful after claim.
    pub outcome: u8,
    pub rdav_whole: u64,
    /// Item template ids. 255 means empty.
    pub loot: [u8; 4],
    pub bump: u8,
}

impl Expedition {
    pub const LEN: usize = 256;
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub asset: Pubkey,
    pub kind: u8,
    pub price: u64,
    pub bump: u8,
}

impl Listing {
    pub const LEN: usize = 32 + 32 + 1 + 8 + 1;
}

#[error_code]
pub enum GameError {
    #[msg("Connect the wallet that still owns this mint, then call initialize.")]
    NotMintAuthority,
    #[msg("That id does not match the next free id on the player account.")]
    BadId,
    #[msg("The name must be 1 to 32 bytes.")]
    BadName,
    #[msg("That slot does not exist.")]
    BadSlot,
    #[msg("The slot is already full.")]
    SlotFull,
    #[msg("That piece is already equipped.")]
    AlreadyEquipped,
    #[msg("You do not own that.")]
    NotOwner,
    #[msg("They are listed. Revoke the consignment first.")]
    Listed,
    #[msg("They are still in the depths.")]
    NotDelving,
    #[msg("The cart has not returned yet.")]
    StillDelving,
    #[msg("That chest is already open.")]
    AlreadyClaimed,
    #[msg("The chest is not open yet.")]
    NotReady,
    #[msg("That loot slot is empty.")]
    EmptyLoot,
    #[msg("Bring one to three mercenaries.")]
    BadSquad,
    #[msg("Unknown gate.")]
    BadZone,
    #[msg("They are not injured.")]
    NotInjured,
    #[msg("That is not an Abyssal Elixir.")]
    NotElixir,
    #[msg("The Smugglers refuse wounded goods. Heal them first.")]
    Wounded,
    #[msg("Unequip all gear before consigning to the black market.")]
    StillGeared,
    #[msg("Name a price in $RDAV.")]
    BadPrice,
    #[msg("Only the mint admin can do that.")]
    NotAdmin,
    #[msg("The vein is dry. The shrine refills once an hour.")]
    FaucetCooling,
    #[msg("The altar accepts only three offerings an hour.")]
    SummonCap,
}

// --- rules -------------------------------------------------------------------

const STATUS_IDLE: u8 = 0;
const STATUS_DELVING: u8 = 1;
const KIND_DELVER: u8 = 0;
const KIND_ITEM: u8 = 1;
const OUTCOME_DEFEAT: u8 = 2;

const JOB_MINING: [u16; 5] = [12, 8, 10, 18, 7];
const JOB_POWER: [u16; 5] = [10, 14, 11, 8, 9];
const JOB_ARMOR: [u16; 5] = [6, 16, 7, 9, 12];
const JOB_LUCK: [u16; 5] = [14, 6, 16, 10, 8];
const JOB_SPEED: [u16; 5] = [9, 7, 15, 8, 10];
const JOB_SANITY: [u16; 5] = [70, 80, 65, 75, 95];
const RARITY_MULT: [u16; 6] = [100, 115, 135, 160, 200, 275];
const ZONE_SECONDS: [i64; 4] = [5 * 60, 30 * 60, 120 * 60, 480 * 60];
const ZONE_THREAT: [u32; 4] = [8, 200, 600, 1500];
const ZONE_RDAV: [(u64, u64); 4] = [(30, 90), (80, 220), (700, 1800), (2200, 6400)];
const ZONE_ROLLS: [u8; 4] = [2, 2, 2, 3];

#[derive(Clone, Copy, Default)]
struct Snap {
    power: u32,
    mining: u32,
    armor: u16,
    sanity: u16,
    personality: u8,
    injury_bps: u16,
}

struct Plan {
    outcome: u8,
    rdav_whole: u64,
    loot: [u8; 4],
    down_mask: u8,
}

fn next_u64(state: &mut u64) -> u64 {
    *state = state
        .wrapping_mul(1664525)
        .wrapping_add(1013904223);
    *state
}

fn scale_stat(base: u16, mult: u16) -> u16 {
    (base as u32 * mult as u32 / 100) as u16
}

fn roll_rarity(rng: &mut u64) -> u8 {
    // Common heavy, Abyssal rare. Weights sum to 100.
    let weights = [50u64, 25, 15, 7, 2, 1];
    let mut ticket = next_u64(rng) % 100;
    for (index, weight) in weights.iter().enumerate() {
        if ticket < *weight {
            return index as u8;
        }
        ticket -= weight;
    }
    0
}

fn write_name(dst: &mut [u8; 32], name: &str) -> Result<()> {
    let bytes = name.as_bytes();
    require!(!bytes.is_empty() && bytes.len() <= 32, GameError::BadName);
    dst.fill(0);
    dst[..bytes.len()].copy_from_slice(bytes);
    Ok(())
}

fn require_idle(delver: &Delver) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(!delver.listed, GameError::Listed);
    require!(delver.status == STATUS_IDLE, GameError::NotDelving);
    require!(delver.incapacitated_until <= now, GameError::Wounded);
    Ok(())
}

fn naked(delver: &Delver) -> bool {
    delver.pickaxe == Pubkey::default()
        && delver.armor_item == Pubkey::default()
        && delver.accessory == Pubkey::default()
        && delver.consumable == Pubkey::default()
}

fn slot_pubkey(delver: &Delver, slot: u8) -> &Pubkey {
    match slot {
        0 => &delver.pickaxe,
        1 => &delver.armor_item,
        2 => &delver.accessory,
        _ => &delver.consumable,
    }
}

fn slot_pubkey_mut(delver: &mut Delver, slot: u8) -> &mut Pubkey {
    match slot {
        0 => &mut delver.pickaxe,
        1 => &mut delver.armor_item,
        2 => &mut delver.accessory,
        _ => &mut delver.consumable,
    }
}

fn add_gear(delver: &mut Delver, item: &Item, equip: bool) {
    let sign: i16 = if equip { 1 } else { -1 };
    delver.gear_mining = delver.gear_mining.saturating_add(item.mining * sign);
    delver.gear_power = delver.gear_power.saturating_add(item.power * sign);
    delver.gear_armor = delver.gear_armor.saturating_add(item.armor * sign);
    delver.gear_luck = delver.gear_luck.saturating_add(item.luck * sign);
    delver.gear_speed = delver.gear_speed.saturating_add(item.speed * sign);
    delver.gear_sanity = delver.gear_sanity.saturating_add(item.sanity * sign);
}

fn snap_of(delver: &Delver) -> Snap {
    let mut power = delver.power as i32 + delver.gear_power as i32;
    let mut mining = delver.mining as i32 + delver.gear_mining as i32;
    let mut injury: u16 = 100;
    if delver.personality == 2 {
        power = power * 125 / 100;
    }
    if delver.personality == 0 {
        mining = mining * 120 / 100;
    }
    if delver.personality == 1 {
        mining = mining * 90 / 100;
        injury = 50;
    }
    if delver.personality == 3 {
        injury = injury * 70 / 100;
    }
    if delver.personality == 4 {
        injury = injury * 115 / 100;
    }
    Snap {
        power: power.max(0) as u32,
        mining: mining.max(0) as u32,
        armor: (delver.armor as i32 + delver.gear_armor as i32).max(0) as u16,
        sanity: delver.sanity,
        personality: delver.personality,
        injury_bps: injury,
    }
}

fn resolve(zone: u8, seed: u64, squad: &[Snap]) -> Plan {
    let mut rng = seed | 1;
    let threat = ZONE_THREAT[zone as usize].max(1);
    let combat: u32 = squad.iter().map(|row| row.power).sum();
    let mining: u32 = squad.iter().map(|row| row.mining).sum();
    let ratio = combat.saturating_mul(100) / threat;
    let injury: u32 = squad.iter().map(|row| row.injury_bps as u32).sum::<u32>()
        / squad.len().max(1) as u32;
    let injury_roll = (next_u64(&mut rng) % 10_000) * injury as u64 / 100;
    let threshold = 1800i64.max(7200 - ratio as i64 * 35);
    let hurt = injury_roll as i64 > threshold;

    let outcome = if ratio < 72 || (hurt && ratio < 90) {
        OUTCOME_DEFEAT
    } else if hurt || ratio < 105 {
        1
    } else {
        0
    };

    let mut down_mask = 0u8;
    if outcome == OUTCOME_DEFEAT {
        for i in 0..squad.len() {
            down_mask |= 1 << i;
        }
    } else if outcome == 1 {
        let mut order: Vec<usize> = (0..squad.len()).collect();
        order.sort_by_key(|i| squad[*i].armor as u32 + squad[*i].sanity as u32);
        for index in order {
            let vigilant = squad[index].personality == 1;
            if vigilant && next_u64(&mut rng) % 2 == 0 {
                continue;
            }
            down_mask |= 1 << index;
            break;
        }
    }

    let yield_mod = if squad.iter().any(|row| row.personality == 0) {
        120u64
    } else if squad.iter().any(|row| row.personality == 1) {
        90
    } else {
        100
    };
    let outcome_mod = match outcome {
        OUTCOME_DEFEAT => 35u64,
        1 => 75,
        _ => 100,
    };
    let (lo, hi) = ZONE_RDAV[zone as usize];
    let span = hi - lo + 1;
    let rolled = lo + (next_u64(&mut rng) % span);
    let rdav_whole = (rolled * yield_mod * outcome_mod / 10_000).max(1);

    let rolls = match outcome {
        OUTCOME_DEFEAT => 1,
        1 => ZONE_ROLLS[zone as usize],
        _ => ZONE_ROLLS[zone as usize] + 1,
    };
    let mut loot = [NONE; 4];
    for i in 0..rolls.min(4) {
        loot[i as usize] = roll_template(zone, &mut rng);
    }

    let _ = mining;
    Plan {
        outcome,
        rdav_whole,
        loot,
        down_mask,
    }
}

fn roll_template(zone: u8, rng: &mut u64) -> u8 {
    // (template, weight). 255 is coin-only.
    let table: &[(u8, u64)] = match zone {
        0 => &[(0, 40), (3, 35), (NONE, 25)],
        1 => &[(0, 34), (3, 34), (NONE, 32)],
        2 => &[(1, 36), (2, 36), (NONE, 28)],
        _ => &[(1, 32), (2, 32), (4, 12), (NONE, 24)],
    };
    let total: u64 = table.iter().map(|row| row.1).sum();
    let mut ticket = next_u64(rng) % total;
    for (template, weight) in table {
        if ticket < *weight {
            return *template;
        }
        ticket -= weight;
    }
    NONE
}

fn write_item_from_template(
    item: &mut Item,
    owner: Pubkey,
    id: u64,
    template: u8,
    bump: u8,
) -> Result<()> {
    // kind, rarity, mining, luck, durability. Other stats stay 0.
    let (kind, rarity, mining, luck, durability) = match template {
        0 => (0u8, 0u8, 20i16, 0i16, 50u16),
        1 => (0, 2, 80, 5, 150),
        2 => (2, 1, 0, 15, 80),
        3 => (3, 0, 0, 0, 1),
        4 => (3, 3, 0, 0, 1),
        _ => return err!(GameError::EmptyLoot),
    };
    item.origin = owner;
    item.owner = owner;
    item.equipped_to = Pubkey::default();
    item.id = id;
    item.kind = kind;
    item.template = template;
    item.rarity = rarity;
    item.mining = mining;
    item.luck = luck;
    item.durability = durability;
    item.listed = false;
    item.bump = bump;
    Ok(())
}

fn load_delver(account: &AccountInfo, program_id: &Pubkey) -> Result<Delver> {
    require_keys_eq!(*account.owner, *program_id, GameError::NotOwner);
    let data = account.try_borrow_data()?;
    let mut slice: &[u8] = &data;
    Delver::try_deserialize(&mut slice).map_err(|_| error!(GameError::NotOwner))
}

fn save_delver(account: &AccountInfo, delver: &Delver) -> Result<()> {
    let mut data = account.try_borrow_mut_data()?;
    let dst: &mut [u8] = &mut data;
    delver.try_serialize(&mut &mut dst[..])?;
    Ok(())
}

fn take_fee<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    token::transfer(
        CpiContext::new(
            token_program.to_account_info(),
            Transfer {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
            },
        ),
        amount,
    )
}

fn settle_buy<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    guild: &Account<'info, TokenAccount>,
    seller: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    price: u64,
    seller_key: Pubkey,
) -> Result<()> {
    require!(authority.key() != seller_key, GameError::NotOwner);
    let tax = price * TAX_BPS / 10_000;
    let rest = price - tax;
    if tax > 0 {
        take_fee(token_program, from, guild, authority, tax)?;
    }
    if rest > 0 {
        take_fee(token_program, from, seller, authority, rest)?;
    }
    Ok(())
}

fn mint_rdav<'info>(
    token_program: &Program<'info, Token>,
    mint: &Account<'info, Mint>,
    to: &Account<'info, TokenAccount>,
    config: &Account<'info, Config>,
    amount: u64,
) -> Result<()> {
    let seeds: &[&[u8]] = &[b"config", &[config.bump]];
    token::mint_to(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            MintTo {
                mint: mint.to_account_info(),
                to: to.to_account_info(),
                authority: config.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )
}

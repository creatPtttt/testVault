/**
 * BlackMarket — the hall. Small cards, one page at a time.
 * A click opens the dossier. Coin only moves after the player reads it.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GUILD_TAX_RATE, LOCAL_SELLER_ID, PERSONALITIES, RARITY_COLORS } from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import type { Delver, Item, MarketListing } from '../../types/game'
import { StatBar, type StatBarKey } from '../camp/StatBar'
import { JOB_PORTRAIT } from '../camp/campSprites'
import { ItemGlyph } from '../ui/ItemGlyph'
import { RuneButton } from '../ui/RuneButton'
import { ToastBanner } from '../ui/ToastBanner'
import { itemSprite } from '../../utils/itemArt'

type KindFilter = 'all' | 'delver' | 'item' | 'mine'

const PAGE_SIZE = 12
const STATS: StatBarKey[] = ['mining', 'power', 'armor', 'luck', 'speed', 'sanity']

export function BlackMarket() {
  const { player, buyListing, cancelListing, sigilBusy } = useGame()
  const [kind, setKind] = useState<KindFilter>('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [acquired, setAcquired] = useState<MarketListing | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const seller = player.walletAddress ?? LOCAL_SELLER_ID

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return player.marketListings.filter((listing) => {
      if (kind === 'mine') {
        if (listing.sellerId !== seller) return false
      } else if (kind !== 'all' && listing.asset.kind !== kind) {
        return false
      }
      if (!needle) return true
      const name = listing.asset.kind === 'delver' ? listing.asset.delver.name : listing.asset.item.name
      return name.toLowerCase().includes(needle) || listing.sellerName.toLowerCase().includes(needle)
    })
  }, [kind, player.marketListings, query, seller])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const slice = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  const open = openId ? player.marketListings.find((listing) => listing.id === openId) : undefined

  useEffect(() => {
    setPage(0)
  }, [kind, query])

  useEffect(() => {
    if (openId && !open) setOpenId(null)
  }, [open, openId])

  const buy = (listing: MarketListing) => {
    if (sigilBusy) return
    const tax = Math.floor(listing.price * GUILD_TAX_RATE)
    const snapshot = listing
    void buyListing(listing.id).then((refusal) => {
      if (refusal) {
        setToast({ tone: 'error', message: refusal })
        return
      }
      setOpenId(null)
      setAcquired(snapshot)
      setToast({
        tone: 'success',
        message: `Acquired. Guild burn ${tax.toLocaleString('en-US')} $RDAV.`,
      })
    })
  }

  const revoke = (listing: MarketListing) => {
    if (sigilBusy) return
    void cancelListing(listing.id).then((ok) => {
      setToast(
        ok
          ? { tone: 'success', message: 'The consignment is torn up. The goods are back in your vault.' }
          : { tone: 'error', message: 'The chain refused to tear that up.' },
      )
      if (ok) setOpenId(null)
    })
  }

  return (
    <div>
      {toast && (
        <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} durationMs={4800} />
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'delver', label: 'Blades' },
            { id: 'item', label: 'Relics' },
            { id: 'mine', label: 'Nailed' },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`bazaar-tab font-body ${kind === entry.id ? 'is-on' : ''}`}
            onClick={() => setKind(entry.id)}
          >
            {entry.label}
          </button>
        ))}
        <input
          className="muster-ledger-input ml-auto max-w-xs"
          value={query}
          placeholder="Name or fence…"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Filter the hall"
        />
      </div>
      <p className="mb-3 font-body text-[11px] uppercase tracking-[0.16em] text-white/40">
        {kind === 'mine'
          ? `${rows.length} nailed under your mark · click to revoke or inspect`
          : `${rows.length} on the board · click a card to read it`}
      </p>
      <div className="bazaar-hall">
        {slice.length === 0 && (
          <p className="font-body text-sm text-white/60">
            {kind === 'mine'
              ? 'Nothing of yours is nailed to the board. Post from My Consignments.'
              : 'The hall is quiet. No one is selling that.'}
          </p>
        )}
        {slice.map((listing) => (
          <HallCard
            key={listing.id}
            listing={listing}
            yours={listing.sellerId === seller}
            onOpen={() => setOpenId(listing.id)}
          />
        ))}
      </div>
      {rows.length > PAGE_SIZE && (
        <div className="bazaar-pager">
          <button
            type="button"
            className="bazaar-tab font-body"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            Prev
          </button>
          <span className="font-pixel text-sm text-antique-gold">
            {current + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="bazaar-tab font-body"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      )}
      {open && (
        <ListingDossier
          listing={open}
          yours={open.sellerId === seller}
          busy={sigilBusy}
          onClose={() => {
            if (!sigilBusy) setOpenId(null)
          }}
          onBuy={() => buy(open)}
          onRevoke={() => revoke(open)}
        />
      )}
      {acquired && (
        <AcquisitionReveal listing={acquired} onClose={() => setAcquired(null)} />
      )}
    </div>
  )
}

function HallCard({
  listing,
  yours,
  onOpen,
}: {
  listing: MarketListing
  yours: boolean
  onOpen: () => void
}) {
  const asset = listing.asset
  const name = asset.kind === 'delver' ? asset.delver.name : asset.item.name
  const line = asset.kind === 'delver' ? asset.delver.jobClass : asset.item.rarity
  const tint = asset.kind === 'item' ? RARITY_COLORS[asset.item.rarity] : undefined

  return (
    <button type="button" className={`bazaar-card ${yours ? 'is-nailed' : ''}`} onClick={onOpen}>
      {asset.kind === 'delver' ? (
        <img src={JOB_PORTRAIT[asset.delver.jobClass]} alt="" className="bazaar-card-art pixelated" draggable={false} />
      ) : (
        <HallRelic item={asset.item} />
      )}
      <span className="font-heading text-base leading-none text-antique-gold">{name}</span>
      <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: tint ?? 'rgba(255,255,255,0.45)' }}>
        {line}
      </span>
      <span className="font-pixel text-sm text-runeflame">{listing.price.toLocaleString('en-US')}</span>
      <span className="font-body text-[10px] text-[#e07070]">{yours ? 'Yours' : 'Inspect'}</span>
    </button>
  )
}

function HallRelic({ item }: { item: Item }) {
  const sprite = itemSprite(item)
  if (sprite) {
    return (
      <span className="bazaar-card-relic">
        <img src={sprite} alt="" className="pixelated" draggable={false} />
      </span>
    )
  }
  return (
    <span className="bazaar-card-relic">
      <ItemGlyph item={item} />
    </span>
  )
}

function ListingDossier({
  listing,
  yours,
  busy,
  onClose,
  onBuy,
  onRevoke,
}: {
  listing: MarketListing
  yours: boolean
  busy: boolean
  onClose: () => void
  onBuy: () => void
  onRevoke: () => void
}) {
  const tax = Math.floor(listing.price * GUILD_TAX_RATE)
  const asset = listing.asset
  const name = asset.kind === 'delver' ? asset.delver.name : asset.item.name

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md modal-backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-dossier-title"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div className="listing-dossier fade-rise-in" onClick={(event) => event.stopPropagation()}>
        <div className="vault-modal-shell">
          <button type="button" className="vault-modal-close" onClick={onClose} aria-label="Close listing" disabled={busy} />
          <div className="listing-dossier-top">
            <div className="listing-portrait">
              {asset.kind === 'delver' ? (
                <img
                  src={JOB_PORTRAIT[asset.delver.jobClass]}
                  alt=""
                  className="listing-hero pixelated"
                  draggable={false}
                />
              ) : (
                <RelicArt item={asset.item} />
              )}
            </div>
            <div className="listing-dossier-copy">
              <p className="vault-modal-sub font-body">{yours ? 'Your consignment' : `Fence · ${listing.sellerName}`}</p>
              <h2 id="listing-dossier-title" className="vault-modal-title font-heading">
                {name}
              </h2>
              {asset.kind === 'delver' ? (
                <p className="font-body text-sm" style={{ color: RARITY_COLORS[asset.delver.rarity] }}>
                  {asset.delver.jobClass} · {asset.delver.rarity}
                </p>
              ) : (
                <p className="font-body text-sm" style={{ color: RARITY_COLORS[asset.item.rarity] }}>
                  {asset.item.type} · {asset.item.rarity}
                </p>
              )}
              <p className="listing-price font-pixel">
                {listing.price.toLocaleString('en-US')}
                <span className="font-body"> $RDAV</span>
              </p>
              <p className="font-body text-xs text-[#e07070]">Guild burn {tax.toLocaleString('en-US')} $RDAV</p>
              {busy && (
                <p className="mt-2 font-body text-xs uppercase tracking-widest text-antique-gold">
                  The sigil awaits…
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {yours ? (
                  <RuneButton type="button" glow="runeflame" disabled={busy} onClick={onRevoke}>
                    {busy ? 'Awaiting sigil…' : 'Revoke'}
                  </RuneButton>
                ) : (
                  <RuneButton type="button" glow="amethyst" disabled={busy} onClick={onBuy}>
                    {busy ? 'Awaiting sigil…' : 'Buy'}
                  </RuneButton>
                )}
                <RuneButton type="button" glow="amethyst" disabled={busy} onClick={onClose}>
                  Walk away
                </RuneButton>
              </div>
            </div>
          </div>
          {asset.kind === 'delver' ? <DelverSheet delver={asset.delver} /> : <ItemSheet item={asset.item} />}
        </div>
      </div>
    </div>
  )
}

function RelicArt({ item }: { item: Item }) {
  const sprite = itemSprite(item)
  if (sprite) {
    return <img src={sprite} alt="" className="listing-relic pixelated" draggable={false} />
  }
  return (
    <span className="listing-relic-fallback">
      <ItemGlyph item={item} />
    </span>
  )
}

function DelverSheet({ delver }: { delver: Delver }) {
  const trait = PERSONALITIES[delver.personality]
  return (
    <div className="listing-dossier-body">
      <section className="vault-inset">
        <h3 className="vault-section-title font-body">Personality</h3>
        <p className="font-body text-sm text-white/85">
          <span className="text-antique-gold">[{trait.name}]</span> — {trait.desc}
        </p>
      </section>
      <section className="vault-inset">
        <h3 className="vault-section-title font-body">Attributes</h3>
        <div className="listing-stat-grid">
          {STATS.map((stat) => (
            <StatBar key={stat} stat={stat} value={delver.stats[stat]} />
          ))}
        </div>
      </section>
      <section className="vault-inset listing-career">
        <h3 className="vault-section-title font-body">Career</h3>
        <ul>
          <li>Expeditions <span className="font-pixel">{delver.lifetimeStats.dungeonsCleared}</span></li>
          <li>Ore <span className="font-pixel">{delver.lifetimeStats.oreExtracted}</span></li>
          <li>$RDAV <span className="font-pixel">{delver.lifetimeStats.rdavEarned}</span></li>
          <li>Hours <span className="font-pixel">{delver.lifetimeStats.hoursDelved}</span></li>
        </ul>
      </section>
    </div>
  )
}

function ItemSheet({ item }: { item: Item }) {
  const bonuses = Object.entries(item.stats).filter((entry) => entry[1] != null && entry[1] !== 0)
  return (
    <div className="listing-dossier-body">
      <section className="vault-inset">
        <h3 className="vault-section-title font-body">Relic</h3>
        <p className="font-body text-sm text-white/70">
          Durability <span className="font-pixel text-runeflame">{item.durability}</span>
        </p>
        <div className="listing-bonus-row">
          {bonuses.length === 0 && <p className="font-body text-sm text-white/45">No etched bonuses.</p>}
          {bonuses.map(([key, value]) => (
            <p key={key} className="listing-bonus font-body">
              {key} <span className="font-pixel text-runeflame">+{value}</span>
            </p>
          ))}
        </div>
      </section>
    </div>
  )
}

/** After a buy — show what entered the vault before the hall refreshes away. */
function AcquisitionReveal({ listing, onClose }: { listing: MarketListing; onClose: () => void }) {
  const asset = listing.asset
  const name = asset.kind === 'delver' ? asset.delver.name : asset.item.name
  const where = asset.kind === 'delver' ? 'Barracks Muster Ledger' : 'Barracks Stash'
  const to = '/camp'

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md modal-backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acquisition-title"
      onClick={onClose}
    >
      <div className="listing-dossier fade-rise-in max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="vault-modal-shell">
          <button type="button" className="vault-modal-close" onClick={onClose} aria-label="Close" />
          <p className="font-body text-[11px] uppercase tracking-[0.28em] text-[#e07070]">Blood bargain sealed</p>
          <h2 id="acquisition-title" className="mt-1 font-heading text-3xl text-[#f0d78c]">
            Acquired
          </h2>
          <div className="mt-5 flex flex-col items-center text-center">
            {asset.kind === 'delver' ? (
              <img
                src={JOB_PORTRAIT[asset.delver.jobClass]}
                alt=""
                className="h-28 w-28 pixelated drop-shadow-[0_8px_20px_rgba(0,0,0,0.75)]"
                draggable={false}
              />
            ) : (
              <span className="stash-slot loot-slot">
                <ItemGlyph item={asset.item} />
              </span>
            )}
            <p className="mt-4 font-heading text-2xl text-[#f0d78c]">{name}</p>
            {asset.kind === 'delver' ? (
              <p className="mt-1 font-body text-sm" style={{ color: RARITY_COLORS[asset.delver.rarity] }}>
                {asset.delver.jobClass} · {asset.delver.rarity}
              </p>
            ) : (
              <p className="mt-1 font-body text-sm" style={{ color: RARITY_COLORS[asset.item.rarity] }}>
                {asset.item.type} · {asset.item.rarity}
              </p>
            )}
            <p className="mt-4 max-w-xs font-body text-sm text-white/65">
              It rests in your {where}. Open the barracks when you are ready to arm or rename it.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <RuneButton type="button" glow="amethyst" onClick={onClose}>
              Keep browsing
            </RuneButton>
            <Link to={to} className="font-heading text-sm text-antique-gold transition hover:text-runeflame" onClick={onClose}>
              Open Barracks →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

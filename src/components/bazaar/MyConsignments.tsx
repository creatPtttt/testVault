/**
 * MyConsignments — card shelf. Click a blade or relic, then name the price in a contract.
 */

import { useEffect, useState } from 'react'
import {
  GUILD_TAX_RATE,
  LOCAL_SELLER_ID,
  MARKET_GEAR,
  MARKET_TAX_WARNING,
  MARKET_WOUNDED,
  RARITY_COLORS,
} from '../../config/gameConfig'
import { useGame } from '../../context/GameContext'
import type { Delver, Item, MarketListing } from '../../types/game'
import { hasEquippedGear, isInjured } from '../../utils/squadPower'
import { JOB_PORTRAIT } from '../camp/campSprites'
import { ItemGlyph } from '../ui/ItemGlyph'
import { RuneButton } from '../ui/RuneButton'
import { StonePanel } from '../ui/StonePanel'
import { ToastBanner } from '../ui/ToastBanner'
import { itemSprite } from '../../utils/itemArt'

type Pick = { kind: 'delver'; id: string } | { kind: 'item'; id: string }

export function MyConsignments() {
  const { player, listDelver, listItem, cancelListing, sigilBusy } = useGame()
  const [pick, setPick] = useState<Pick | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const seller = player.walletAddress ?? LOCAL_SELLER_ID
  const mine = player.marketListings.filter((listing) => listing.sellerId === seller)
  const selectedDelver = pick?.kind === 'delver' ? player.delvers.find((d) => d.id === pick.id) : undefined
  const selectedItem = pick?.kind === 'item' ? player.inventory.find((item) => item.id === pick.id) : undefined

  const confirm = async (price: number): Promise<string | null> => {
    if (!pick || sigilBusy) return 'The sigil already awaits another contract.'
    const refusal =
      pick.kind === 'delver' ? await listDelver(pick.id, price) : await listItem(pick.id, price)
    if (refusal) {
      setToast({ tone: 'error', message: refusal })
    } else {
      setToast({ tone: 'success', message: 'Consigned. Look for it on the Black Market — marked as yours.' })
      setPick(null)
    }
    return refusal
  }

  return (
    <div className="flex flex-col gap-8">
      {toast && (
        <ToastBanner message={toast.message} tone={toast.tone} onClose={() => setToast(null)} durationMs={4800} />
      )}

      <section>
        <h2 className="font-heading text-2xl text-antique-gold">Still in your vault</h2>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.16em] text-white/45">
          Click a card · Name a price · The Guild drinks 3%
        </p>
        <div className="bazaar-shelf mt-4">
          {player.delvers.length === 0 && player.inventory.length === 0 && (
            <p className="font-body text-sm text-white/50">The vault is empty.</p>
          )}
          {player.delvers.map((delver) => (
            <button
              key={delver.id}
              type="button"
              className={`bazaar-card ${consignBlock(delver) ? 'is-blocked' : ''}`}
              onClick={() => setPick({ kind: 'delver', id: delver.id })}
            >
              <img src={JOB_PORTRAIT[delver.jobClass]} alt="" className="bazaar-card-art pixelated" draggable={false} />
              <span className="font-heading text-base leading-none text-antique-gold">{delver.name}</span>
              <span className="font-body text-[10px] uppercase tracking-wider text-white/45">{delver.jobClass}</span>
              <span className="font-body text-[10px] text-[#e07070]">{consignBlock(delver) ? 'Cannot consign' : 'Sell'}</span>
            </button>
          ))}
          {player.inventory.map((item) => (
            <button
              key={item.id}
              type="button"
              className="bazaar-card"
              onClick={() => setPick({ kind: 'item', id: item.id })}
            >
              <ShelfRelic item={item} />
              <span className="font-heading text-base leading-none text-antique-gold">{item.name}</span>
              <span className="font-body text-[10px] uppercase tracking-wider" style={{ color: RARITY_COLORS[item.rarity] }}>
                {item.rarity}
              </span>
              <span className="font-body text-[10px] text-white/45">Sell</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-2xl text-antique-gold">Nailed already</h2>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.16em] text-white/45">
          These also sit on the Black Market
        </p>
        <div className="bazaar-shelf mt-4">
          {mine.length === 0 && <p className="font-body text-sm text-white/55">Nothing of yours is on the board.</p>}
          {mine.map((listing) => (
            <NailedCard
              key={listing.id}
              listing={listing}
              onRevoke={() => {
                void cancelListing(listing.id).then((ok) => {
                  setToast(
                    ok
                      ? { tone: 'success', message: 'The consignment is torn up. The goods are back in your vault.' }
                      : { tone: 'error', message: 'The chain refused to tear that up.' },
                  )
                })
              }}
            />
          ))}
        </div>
      </section>

      {pick && (selectedDelver || selectedItem) && (
        <PriceContract
          delver={selectedDelver}
          item={selectedItem}
          onClose={() => setPick(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}

function NailedCard({ listing, onRevoke }: { listing: MarketListing; onRevoke: () => void }) {
  const asset = listing.asset
  const name = asset.kind === 'delver' ? asset.delver.name : asset.item.name
  return (
    <article className="bazaar-card is-nailed">
      {asset.kind === 'delver' ? (
        <img src={JOB_PORTRAIT[asset.delver.jobClass]} alt="" className="bazaar-card-art pixelated" draggable={false} />
      ) : (
        <ShelfRelic item={asset.item} />
      )}
      <span className="font-heading text-base leading-none text-antique-gold">{name}</span>
      <span className="font-pixel text-sm text-runeflame">{listing.price.toLocaleString('en-US')}</span>
      <RuneButton type="button" glow="amethyst" variant="compact" onClick={onRevoke}>
        Revoke
      </RuneButton>
    </article>
  )
}

function ShelfRelic({ item }: { item: Item }) {
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

function PriceContract({
  delver,
  item,
  onClose,
  onConfirm,
}: {
  delver?: Delver
  item?: Item
  onClose: () => void
  onConfirm: (price: number) => string | null | undefined | Promise<string | null>
}) {
  const { sigilBusy } = useGame()
  const [price, setPrice] = useState('500')
  const [error, setError] = useState<string | null>(null)
  const [nailing, setNailing] = useState(false)
  const asking = Number(price)
  const tax = Number.isFinite(asking) ? Math.floor(asking * GUILD_TAX_RATE) : 0
  const payout = Number.isFinite(asking) ? Math.max(0, asking - tax) : 0
  const block = delver ? consignBlock(delver) : null
  const name = delver?.name ?? item?.name ?? 'Goods'

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sigilBusy && !nailing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sigilBusy, nailing])

  const submit = () => {
    if (block || sigilBusy || nailing) {
      if (block) setError(block)
      return
    }
    setNailing(true)
    setError(null)
    void Promise.resolve(onConfirm(asking)).then((refusal) => {
      setNailing(false)
      if (refusal) setError(refusal)
    })
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md modal-backdrop-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consign-price-title"
      onClick={() => {
        if (!sigilBusy && !nailing) onClose()
      }}
    >
      <div className="fade-rise-in w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <StonePanel className="bazaar-contract">
          <h2 id="consign-price-title" className="font-heading text-2xl text-antique-gold">
            {name}
          </h2>
          <p className="mt-2 font-body text-sm text-[#e07070]">{block ?? MARKET_TAX_WARNING}</p>
          {!block && (
            <p className="mt-1 font-body text-xs text-white/55">
              You would receive <span className="font-pixel text-runeflame">{payout.toLocaleString('en-US')}</span> $RDAV
              after the burn.
            </p>
          )}
          <label className="mt-4 block font-body text-[11px] uppercase tracking-widest text-white/50">
            Price in $RDAV
            <input
              className="muster-ledger-input mt-1 w-full"
              inputMode="numeric"
              value={price}
              autoFocus
              disabled={Boolean(block) || sigilBusy || nailing}
              onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ''))}
            />
          </label>
          {error && <p className="mt-3 font-body text-sm text-[#e07070]">{error}</p>}
          {(sigilBusy || nailing) && (
            <p className="mt-3 font-body text-xs uppercase tracking-widest text-antique-gold">
              The sigil awaits in Phantom…
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <RuneButton type="button" glow="runeflame" disabled={Boolean(block) || sigilBusy || nailing} onClick={submit}>
              {sigilBusy || nailing ? 'Awaiting sigil…' : 'Nail the contract'}
            </RuneButton>
            <RuneButton type="button" glow="amethyst" disabled={sigilBusy || nailing} onClick={onClose}>
              Walk away
            </RuneButton>
          </div>
        </StonePanel>
      </div>
    </div>
  )
}

function consignBlock(delver: Delver): string | null {
  if (isInjured(delver)) return MARKET_WOUNDED
  if (hasEquippedGear(delver)) return MARKET_GEAR
  if (delver.status === 'delving') return 'They are still in the depths.'
  return null
}

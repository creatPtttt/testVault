/**
 * Devnet client for the deployed RuneDelve program.
 * Builds Anchor instructions by hand so the site does not need the Anchor SDK.
 * While a wallet is connected, this module is the game. localStorage is only the offline demo.
 */

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type AccountMeta,
} from '@solana/web3.js'
import {
  BASE_ITEMS,
  DUNGEON_ZONES,
  RDAV_MINT_ADDRESS,
  RDAV_PROGRAM_ID,
  RELIQUARIES,
} from '../config/gameConfig'
import type {
  Delver,
  DelverSlots,
  ExpeditionRun,
  Item,
  ItemType,
  JobClass,
  MarketListing,
  PlayerState,
  Rarity,
} from '../types/game'
import type { ChronicleReport } from '../utils/chronicle'

export const PROGRAM_ID = new PublicKey(RDAV_PROGRAM_ID)
export const MINT = new PublicKey(RDAV_MINT_ADDRESS)
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const UNIT = 1_000_000_000n
const NONE = 255

const JOBS: JobClass[] = [
  'Rune Arcanist',
  'Breaker Paladin',
  'Ashen Rogue',
  'Vault Geomancer',
  'Sanity Warden',
]
const RARITIES: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Abyssal']
const KINDS: ItemType[] = ['pickaxe', 'armor', 'accessory', 'consumable']
const TEMPLATE_KEYS = ['iron_pickaxe', 'runic_pickaxe', 'labyrinth_lantern', 'dwarven_dynamite', 'abyssal_elixir']

/** First 8 bytes of sha256("global:<name>") — Anchor's instruction id. */
const IX = {
  initPlayer: hex('721bdb90320fe442'),
  claimFaucet: hex('5007fb6c37918744'),
  summonDelver: hex('7f44a69f000eb799'),
  renameDelver: hex('0e5feca085807112'),
  imbueDelver: hex('dec674a2b4c1bfa1'),
  equip: hex('9e7ba54a25fe279a'),
  unequip: hex('8d750fd9fe0e9bff'),
  dispatch: hex('084360ac117ca03f'),
  adminFinish: hex('5958777a4537bc05'),
  claim: hex('3ec6d6c1d59f6cd2'),
  takeLoot: hex('8917e7b4bebb1344'),
  useElixir: hex('7c88acc7ec9dd734'),
  payCure: hex('bc3da825bfd28d49'),
  listDelver: hex('1fe15ae90781acaf'),
  listItem: hex('aef516d3e467790d'),
  buyDelver: hex('28dad9b16e8601db'),
  buyItem: hex('5052c1c9d81b46b8'),
  cancelDelver: hex('887788d4ed85c735'),
  cancelItem: hex('eeec0a5fb958ddb3'),
}

/** First 8 bytes of sha256("account:<Name>"). */
const DISC = {
  config: hex('9b0caae01efacc82'),
  player: hex('cdde7007a59bceda'),
  delver: hex('639f4dce8f782d61'),
  item: hex('5c9da38248fe56d8'),
  expedition: hex('0853766f198b05b9'),
  listing: hex('da2032492b861a3a'),
}

export interface ChainDelver {
  pubkey: PublicKey
  origin: PublicKey
  owner: PublicKey
  id: bigint
  name: string
  job: number
  rarity: number
  personality: number
  mining: number
  power: number
  armor: number
  luck: number
  speed: number
  sanity: number
  pickaxe: PublicKey
  armorItem: PublicKey
  accessory: PublicKey
  consumable: PublicKey
  status: number
  listed: boolean
  /** Unix seconds. 0 means healthy. */
  incapacitatedUntil: number
  dungeonsCleared: number
  rdavEarned: bigint
  secondsDelved: bigint
}

export interface ChainItem {
  pubkey: PublicKey
  origin: PublicKey
  owner: PublicKey
  equippedTo: PublicKey
  id: bigint
  kind: number
  template: number
  rarity: number
  mining: number
  power: number
  armor: number
  luck: number
  speed: number
  sanity: number
  durability: number
  listed: boolean
}

export interface ChainRun {
  pubkey: PublicKey
  id: bigint
  zone: number
  squad: PublicKey[]
  startedAt: number
  duration: number
  claimed: boolean
  outcome: number
  rdavWhole: bigint
  loot: number[]
}

export interface ChainListing {
  pubkey: PublicKey
  seller: PublicKey
  asset: PublicKey
  kind: number
  priceRaw: bigint
}

export interface ChainSnap {
  admin: PublicKey
  guildVault: PublicKey
  nextDelverId: bigint
  nextItemId: bigint
  nextRunId: bigint
  lastFaucetAt: number
  summonWindowStart: number
  summonsInWindow: number
  balanceWhole: number
  delvers: ChainDelver[]
  items: ChainItem[]
  runs: ChainRun[]
  listings: ChainListing[]
}

export type SendTx = (tx: Transaction, connection: Connection) => Promise<string>

export function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([seed('config')], PROGRAM_ID)[0]
}

export function playerPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([seed('player'), owner.toBytes()], PROGRAM_ID)[0]
}

export function delverPda(origin: PublicKey, id: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [seed('delver'), origin.toBytes(), u64(id)],
    PROGRAM_ID,
  )[0]
}

export function itemPda(origin: PublicKey, id: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [seed('item'), origin.toBytes(), u64(id)],
    PROGRAM_ID,
  )[0]
}

export function runPda(owner: PublicKey, id: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [seed('run'), owner.toBytes(), u64(id)],
    PROGRAM_ID,
  )[0]
}

export function listingPda(asset: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([seed('listing'), asset.toBytes()], PROGRAM_ID)[0]
}

export function vaultAta(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), MINT.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0]
}

/** Create the associated token account if it is missing. Safe to call when it already exists. */
function createAtaIx(payer: PublicKey, owner: PublicKey): TransactionInstruction {
  const ata = vaultAta(owner)
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      meta(payer, true, true),
      meta(ata, true),
      meta(owner),
      meta(MINT),
      meta(SystemProgram.programId),
      meta(TOKEN_PROGRAM_ID),
    ],
    // 1 = CreateIdempotent (succeeds if the purse already exists)
    data: bytes([1]) as never,
  })
}

/** Lamports a first-time vault open needs for rent + fees on Devnet. */
export const MIN_OPEN_LAMPORTS = 15_000_000

/** Create the coin purse if needed, then the player record. One signature. */
export async function ensurePlayer(
  connection: Connection,
  owner: PublicKey,
  send: SendTx,
): Promise<'created' | 'existing'> {
  const existing = await connection.getAccountInfo(playerPda(owner))
  if (existing) return 'existing'

  const sol = await connection.getBalance(owner, 'confirmed')
  if (sol < MIN_OPEN_LAMPORTS) {
    throw new Error(
      'Need a little Devnet SOL to open the vault (~0.015). Switch Phantom to Devnet, then claim free SOL at https://faucet.solana.com',
    )
  }

  const config = configPda()
  const player = playerPda(owner)
  const vault = vaultAta(owner)
  const vaultInfo = await connection.getAccountInfo(vault)
  const ixs: TransactionInstruction[] = []
  if (!vaultInfo) ixs.push(createAtaIx(owner, owner))
  ixs.push(
    instruction(IX.initPlayer, [
      meta(owner, true, true),
      meta(config),
      meta(MINT, true),
      meta(player, true),
      meta(vault, true),
      meta(TOKEN_PROGRAM_ID),
      meta(SystemProgram.programId),
    ]),
  )
  await sendIx(connection, owner, send, ixs)
  return 'created'
}

/** Read every account this wallet needs, plus the public order book. */
export async function loadSnap(connection: Connection, owner: PublicKey): Promise<ChainSnap> {
  const configKey = configPda()
  const configInfo = await connection.getAccountInfo(configKey)
  if (!configInfo) throw new Error('The rulebook account is missing. initialize has not been run.')
  const config = decodeConfig(bytesOf(configInfo.data))

  const playerInfo = await connection.getAccountInfo(playerPda(owner))
  if (!playerInfo) throw new Error('This wallet has no player record yet.')
  const player = decodePlayer(bytesOf(playerInfo.data))

  const [delvers, items, runs, listings, balanceWhole] = await Promise.all([
    fetchOwned(connection, DISC.delver, 520, 40, owner).then((rows) => rows.map((row) => decodeDelver(row.pubkey, row.data))),
    fetchOwned(connection, DISC.item, 264, 40, owner).then((rows) => rows.map((row) => decodeItem(row.pubkey, row.data))),
    fetchOwned(connection, DISC.expedition, 264, 8, owner).then((rows) => rows.map((row) => decodeRun(row.pubkey, row.data))),
    fetchListings(connection),
    readBalance(connection, owner),
  ])

  const extra = await fetchListingAssets(connection, listings, delvers, items)
  return {
    admin: config.admin,
    guildVault: config.guildVault,
    nextDelverId: player.nextDelverId,
    nextItemId: player.nextItemId,
    nextRunId: player.nextRunId,
    lastFaucetAt: player.lastFaucetAt,
    summonWindowStart: player.summonWindowStart,
    summonsInWindow: player.summonsInWindow,
    balanceWhole,
    delvers: [...delvers, ...extra.delvers],
    items: [...items, ...extra.items],
    runs: runs.filter((run) => !run.claimed),
    listings,
  }
}

export async function txClaimFaucet(connection: Connection, owner: PublicKey, send: SendTx): Promise<void> {
  const vault = vaultAta(owner)
  await sendIx(connection, owner, send, [
    instruction(IX.claimFaucet, [
      meta(owner, false, true),
      meta(configPda()),
      meta(MINT, true),
      meta(playerPda(owner), true),
      meta(vault, true),
      meta(TOKEN_PROGRAM_ID),
    ]),
  ])
}

export async function txSummon(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap): Promise<void> {
  const id = snap.nextDelverId
  await sendIx(connection, owner, send, [
    instruction(IX.summonDelver, [
      meta(owner, true, true),
      meta(configPda()),
      meta(playerPda(owner), true),
      meta(delverPda(owner, id), true),
      meta(vaultAta(owner), true),
      meta(snap.guildVault, true),
      meta(TOKEN_PROGRAM_ID),
      meta(SystemProgram.programId),
    ], u64(id)),
  ])
}

export async function txRename(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKey: string, name: string): Promise<void> {
  const delver = requireDelver(snap, delverKey)
  await sendIx(connection, owner, send, [
    instruction(IX.renameDelver, feeKeys(owner, snap, delver.pubkey), rustString(name)),
  ])
}

export async function txImbue(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKey: string): Promise<void> {
  const delver = requireDelver(snap, delverKey)
  await sendIx(connection, owner, send, [
    instruction(IX.imbueDelver, feeKeys(owner, snap, delver.pubkey)),
  ])
}

export async function txEquip(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKey: string, itemKey: string): Promise<void> {
  const delver = requireDelver(snap, delverKey)
  const item = requireItem(snap, itemKey)
  await sendIx(connection, owner, send, [
    instruction(IX.equip, gearKeys(owner, delver.pubkey, item.pubkey), bytes([item.kind])),
  ])
}

export async function txUnequip(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKey: string, slot: number): Promise<void> {
  const delver = requireDelver(snap, delverKey)
  const itemKey = [delver.pickaxe, delver.armorItem, delver.accessory, delver.consumable][slot]
  if (!itemKey || itemKey.equals(PublicKey.default)) throw new Error('That slot is empty.')
  await sendIx(connection, owner, send, [
    instruction(IX.unequip, gearKeys(owner, delver.pubkey, itemKey), bytes([slot])),
  ])
}

export async function txDispatch(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, zone: number, delverKeys: string[]): Promise<void> {
  const squad = delverKeys.map((key) => requireDelver(snap, key).pubkey)
  await sendIx(connection, owner, send, [
    instruction(IX.dispatch, [
      meta(owner, true, true),
      meta(playerPda(owner), true),
      meta(runPda(owner, snap.nextRunId), true),
      meta(SystemProgram.programId),
      ...squad.map((key) => meta(key, true)),
    ], concat(u64(snap.nextRunId), bytes([zone]))),
  ])
}

export async function txAdminFinish(connection: Connection, owner: PublicKey, send: SendTx, run: ChainRun): Promise<void> {
  await sendIx(connection, owner, send, [
    instruction(IX.adminFinish, [
      meta(owner, false, true),
      meta(configPda()),
      meta(owner),
      meta(run.pubkey, true),
    ], u64(run.id)),
  ])
}

/** Claim the run, mint the coins, then pull every loot slot into an item account. */
export async function txClaim(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, runKey: string): Promise<ChronicleReport> {
  const run = snap.runs.find((entry) => entry.pubkey.toBase58() === runKey)
  if (!run) throw new Error('That cart is not on the chain.')
  await sendIx(connection, owner, send, [
    instruction(IX.claim, [
      meta(owner, false, true),
      meta(configPda()),
      meta(MINT, true),
      meta(run.pubkey, true),
      meta(vaultAta(owner), true),
      meta(TOKEN_PROGRAM_ID),
      ...run.squad.map((key) => meta(key, true)),
    ], u64(run.id)),
  ])

  const after = await connection.getAccountInfo(run.pubkey)
  if (!after) throw new Error('The expedition account disappeared.')
  const closed = decodeRun(run.pubkey, bytesOf(after.data))
  const itemKeys: string[] = []
  let itemId = snap.nextItemId
  for (let slot = 0; slot < closed.loot.length; slot += 1) {
    const template = closed.loot[slot] ?? NONE
    if (template === NONE) continue
    await sendIx(connection, owner, send, [
      instruction(IX.takeLoot, [
        meta(owner, true, true),
        meta(playerPda(owner), true),
        meta(run.pubkey, true),
        meta(itemPda(owner, itemId), true),
        meta(SystemProgram.programId),
      ], concat(u64(run.id), bytes([slot]), u64(itemId))),
    ])
    itemKeys.push(TEMPLATE_KEYS[template] ?? 'iron_pickaxe')
    itemId += 1n
  }

  const fallen: string[] = []
  for (const key of run.squad) {
    const info = await connection.getAccountInfo(key)
    if (!info) continue
    const delver = decodeDelver(key, bytesOf(info.data))
    if (delver.incapacitatedUntil * 1000 > Date.now()) fallen.push(key.toBase58())
  }
  const outcome = closed.outcome === 2 ? 'Defeat' : closed.outcome === 1 ? 'Costly Win' : 'Success'
  const rdav = Number(closed.rdavWhole)
  const downForMs = fallen.length === 0 ? 0 : outcome === 'Defeat' ? 45 * 60_000 : 15 * 60_000
  return {
    outcome,
    lines: [
      'The chain sealed this delve.',
      `${rdav.toLocaleString('en-US')} $RDAV was minted into the vault.`,
      itemKeys.length ? 'Relics were cut into the stash.' : 'The chest held coin and nothing else.',
    ],
    reliquary: RELIQUARIES[Math.min(closed.zone, RELIQUARIES.length - 1)] ?? RELIQUARIES[0],
    rdav,
    itemKeys,
    incapacitatedIds: fallen,
    downForMs,
    deltas: run.squad.map((key) => ({
      delverId: key.toBase58(),
      dungeonsCleared: outcome === 'Defeat' ? 0 : 1,
      rdavEarned: Math.floor(rdav / Math.max(1, run.squad.length)),
      oreExtracted: 0,
      damageTaken: 0,
      hoursDelved: closed.duration / 3600,
    })),
  }
}

export async function txUseElixir(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKey: string): Promise<void> {
  const delver = requireDelver(snap, delverKey)
  const elixir = snap.items.find((item) => item.template === 4 && !item.listed && item.equippedTo.equals(PublicKey.default))
  if (!elixir) throw new Error('No Abyssal Elixir in the stash.')
  await sendIx(connection, owner, send, [
    instruction(IX.useElixir, [
      meta(owner, true, true),
      meta(delver.pubkey, true),
      meta(elixir.pubkey, true),
    ]),
  ])
}

export async function txPayCure(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKeys: string[]): Promise<void> {
  const squad = delverKeys.map((key) => requireDelver(snap, key).pubkey)
  await sendIx(connection, owner, send, [
    instruction(IX.payCure, [
      meta(owner, false, true),
      meta(configPda()),
      meta(vaultAta(owner), true),
      meta(snap.guildVault, true),
      meta(TOKEN_PROGRAM_ID),
      ...squad.map((key) => meta(key, true)),
    ]),
  ])
}

export async function txListDelver(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, delverKey: string, price: number): Promise<void> {
  const delver = requireDelver(snap, delverKey)
  await sendIx(connection, owner, send, [
    instruction(IX.listDelver, [
      meta(owner, true, true),
      meta(delver.pubkey, true),
      meta(listingPda(delver.pubkey), true),
      meta(SystemProgram.programId),
    ], u64(BigInt(Math.floor(price)))),
  ])
}

export async function txListItem(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, itemKey: string, price: number): Promise<void> {
  const item = requireItem(snap, itemKey)
  await sendIx(connection, owner, send, [
    instruction(IX.listItem, [
      meta(owner, true, true),
      meta(item.pubkey, true),
      meta(listingPda(item.pubkey), true),
      meta(SystemProgram.programId),
    ], u64(BigInt(Math.floor(price)))),
  ])
}

export async function txBuy(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, listingKey: string): Promise<void> {
  const listing = snap.listings.find((entry) => entry.pubkey.toBase58() === listingKey)
  if (!listing) throw new Error('That consignment is gone.')
  const asset = listing.kind === 0
    ? snap.delvers.find((entry) => entry.pubkey.equals(listing.asset))
    : snap.items.find((entry) => entry.pubkey.equals(listing.asset))
  if (!asset) throw new Error('The listed relic is missing.')
  const buyerVault = vaultAta(owner)
  const sellerVault = vaultAta(listing.seller)
  const shared: AccountMeta[] = [
    meta(owner, true, true),
    meta(configPda()),
    meta(listing.seller, true),
    meta(listing.pubkey, true),
    meta(listing.asset, true),
    meta(buyerVault, true),
    meta(sellerVault, true),
    meta(snap.guildVault, true),
    meta(TOKEN_PROGRAM_ID),
  ]
  await sendIx(connection, owner, send, [
    instruction(listing.kind === 0 ? IX.buyDelver : IX.buyItem, shared),
  ])
}

export async function txCancel(connection: Connection, owner: PublicKey, send: SendTx, snap: ChainSnap, listingKey: string): Promise<void> {
  const listing = snap.listings.find((entry) => entry.pubkey.toBase58() === listingKey)
  if (!listing) throw new Error('That consignment is gone.')
  await sendIx(connection, owner, send, [
    instruction(listing.kind === 0 ? IX.cancelDelver : IX.cancelItem, [
      meta(owner, true, true),
      meta(listing.pubkey, true),
      meta(listing.asset, true),
    ]),
  ])
}

/** Turn the chain snapshot into the shape the pages already render. */
export function toPlayerState(snap: ChainSnap, wallet: string): PlayerState {
  const mine = wallet
  const itemMap = new Map(snap.items.map((item) => [item.pubkey.toBase58(), item]))
  const ownedDelvers = snap.delvers.filter((delver) => delver.owner.toBase58() === mine && !delver.listed)
  const ownedItems = snap.items.filter((item) => item.owner.toBase58() === mine)
  const equipped = new Set(
    ownedDelvers.flatMap((delver) => [delver.pickaxe, delver.armorItem, delver.accessory, delver.consumable].map((key) => key.toBase58())),
  )
  return {
    rdavBalance: snap.balanceWhole,
    delvers: ownedDelvers.map((delver) => mapDelver(delver, itemMap)),
    inventory: ownedItems
      .filter((item) => !item.listed && !equipped.has(item.pubkey.toBase58()) && item.equippedTo.equals(PublicKey.default))
      .map(mapItem),
    lastLogin: new Date().toISOString(),
    walletAddress: wallet,
    lastFaucetAt: snap.lastFaucetAt > 0 ? snap.lastFaucetAt * 1000 : 0,
    summonWindowStart: snap.summonWindowStart > 0 ? snap.summonWindowStart * 1000 : 0,
    summonsInWindow: snap.summonsInWindow,
    expeditions: snap.runs.map(mapRun),
    marketListings: snap.listings.flatMap((listing) => mapListing(listing, snap, mine)),
  }
}

export function zoneIndex(zoneId: string): number {
  const index = DUNGEON_ZONES.findIndex((zone) => zone.id === zoneId)
  return index < 0 ? 0 : index
}

export async function explainFailure(error: unknown): Promise<string> {
  const anyError = error as { message?: string; getLogs?: () => Promise<string[]> }
  let logs: string[] = []
  try {
    if (typeof anyError.getLogs === 'function') logs = await anyError.getLogs()
  } catch {
    logs = []
  }
  const messageLine = logs.find((line) => line.includes('Error Message:'))
  if (messageLine) {
    const text = messageLine.split('Error Message:')[1]?.trim()
    if (text) return text
  }
  const text = anyError.message ?? 'The chain rejected that action.'
  if (/User rejected|rejected the request/i.test(text)) return 'The wallet closed the request.'
  if (/block height exceeded|has expired/i.test(text)) {
    return 'The signature timed out. Approve in Phantom within a few seconds, then try again.'
  }
  if (/insufficient|no record of a prior/i.test(text)) {
    return 'Need Devnet SOL for fees. Claim free SOL at https://faucet.solana.com'
  }
  if (/simulation|reverted/i.test(text) && /sol/i.test(text)) {
    return 'Need Devnet SOL for fees. Claim free SOL at https://faucet.solana.com'
  }
  return text
}

function feeKeys(owner: PublicKey, snap: ChainSnap, delver: PublicKey): AccountMeta[] {
  return [
    meta(owner, true, true),
    meta(configPda()),
    meta(delver, true),
    meta(vaultAta(owner), true),
    meta(snap.guildVault, true),
    meta(TOKEN_PROGRAM_ID),
  ]
}

function gearKeys(owner: PublicKey, delver: PublicKey, item: PublicKey): AccountMeta[] {
  return [meta(owner, false, true), meta(delver, true), meta(item, true)]
}

function requireDelver(snap: ChainSnap, key: string): ChainDelver {
  const found = snap.delvers.find((delver) => delver.pubkey.toBase58() === key)
  if (!found) throw new Error('That mercenary is not on this wallet.')
  return found
}

function requireItem(snap: ChainSnap, key: string): ChainItem {
  const found = snap.items.find((item) => item.pubkey.toBase58() === key)
  if (!found) throw new Error('That relic is not in the stash.')
  return found
}

function mapDelver(delver: ChainDelver, items: Map<string, ChainItem>): Delver {
  const slot = (key: PublicKey): Item | null => {
    if (key.equals(PublicKey.default)) return null
    const row = items.get(key.toBase58())
    return row ? mapItem(row) : null
  }
  const slots: DelverSlots = {
    pickaxe: slot(delver.pickaxe),
    armor: slot(delver.armorItem),
    accessory: slot(delver.accessory),
    consumable: slot(delver.consumable),
  }
  const personality = Math.min(4, Math.max(0, delver.personality)) as 0 | 1 | 2 | 3 | 4
  return {
    id: delver.pubkey.toBase58(),
    name: delver.name || 'Unnamed',
    rarity: RARITIES[delver.rarity] ?? 'Common',
    jobClass: JOBS[delver.job] ?? JOBS[0],
    stats: {
      mining: delver.mining,
      power: delver.power,
      armor: delver.armor,
      luck: delver.luck,
      speed: delver.speed,
      sanity: delver.sanity,
    },
    personality,
    slots,
    lifetimeStats: {
      dungeonsCleared: delver.dungeonsCleared,
      rdavEarned: Number(delver.rdavEarned),
      oreExtracted: 0,
      damageTaken: 0,
      hoursDelved: Number(delver.secondsDelved) / 3600,
    },
    status: delver.status === 1 ? 'delving' : 'idle',
    incapacitatedUntil: delver.incapacitatedUntil > 0 ? delver.incapacitatedUntil * 1000 : null,
  }
}

function mapItem(item: ChainItem): Item {
  const key = TEMPLATE_KEYS[item.template]
  const catalog = BASE_ITEMS.find((row) => row.key === key)
  return {
    id: item.pubkey.toBase58(),
    type: KINDS[item.kind] ?? catalog?.type ?? 'material',
    name: catalog?.name ?? 'Relic',
    rarity: RARITIES[item.rarity] ?? catalog?.rarity ?? 'Common',
    stats: {
      mining: item.mining,
      power: item.power,
      armor: item.armor,
      luck: item.luck,
      speed: item.speed,
      sanity: item.sanity,
    },
    durability: item.durability,
  }
}

function mapRun(run: ChainRun): ExpeditionRun {
  const zone = DUNGEON_ZONES[run.zone]
  return {
    id: run.pubkey.toBase58(),
    zoneId: zone?.id ?? 'zone_1',
    delverIds: run.squad.map((key) => key.toBase58()),
    startedAt: run.startedAt * 1000,
    durationMs: run.duration * 1000,
    unsealedAt: null,
  }
}

function mapListing(listing: ChainListing, snap: ChainSnap, mine: string): MarketListing[] {
  const sellerId = listing.seller.toBase58()
  const price = Number(listing.priceRaw / UNIT)
  const base = {
    id: listing.pubkey.toBase58(),
    sellerId,
    sellerName: sellerId === mine ? 'You' : `${sellerId.slice(0, 4)}…${sellerId.slice(-4)}`,
    price,
    listedAt: Date.now(),
  }
  if (listing.kind === 0) {
    const delver = snap.delvers.find((entry) => entry.pubkey.equals(listing.asset))
    if (!delver) return []
    return [{ ...base, asset: { kind: 'delver', delver: mapDelver(delver, new Map(snap.items.map((item) => [item.pubkey.toBase58(), item]))) } }]
  }
  const item = snap.items.find((entry) => entry.pubkey.equals(listing.asset))
  if (!item) return []
  return [{ ...base, asset: { kind: 'item', item: mapItem(item) } }]
}

async function fetchOwned(connection: Connection, disc: Uint8Array, size: number, ownerOffset: number, owner: PublicKey) {
  const rows = await connection.getProgramAccounts(PROGRAM_ID, {
    commitment: 'confirmed',
    filters: [
      { dataSize: size },
      { memcmp: { offset: 0, bytes: toBase58(disc) } },
      { memcmp: { offset: ownerOffset, bytes: owner.toBase58() } },
    ],
  })
  return rows.map((row) => ({ pubkey: row.pubkey, data: bytesOf(row.account.data) }))
}

async function fetchListings(connection: Connection): Promise<ChainListing[]> {
  const rows = await connection.getProgramAccounts(PROGRAM_ID, {
    commitment: 'confirmed',
    filters: [
      { dataSize: 82 },
      { memcmp: { offset: 0, bytes: toBase58(DISC.listing) } },
    ],
  })
  return rows.map((row) => decodeListing(row.pubkey, bytesOf(row.account.data)))
}

async function fetchListingAssets(connection: Connection, listings: ChainListing[], haveDelvers: ChainDelver[], haveItems: ChainItem[]) {
  const known = new Set([...haveDelvers.map((row) => row.pubkey.toBase58()), ...haveItems.map((row) => row.pubkey.toBase58())])
  const missing = listings.map((row) => row.asset).filter((key) => !known.has(key.toBase58()))
  const delvers: ChainDelver[] = []
  const items: ChainItem[] = []
  if (missing.length === 0) return { delvers, items }
  const infos = await connection.getMultipleAccountsInfo(missing)
  infos.forEach((info, index) => {
    const key = missing[index]
    if (!info || !key) return
    const data = bytesOf(info.data)
    if (sameDisc(data, DISC.delver)) delvers.push(decodeDelver(key, data))
    if (sameDisc(data, DISC.item)) items.push(decodeItem(key, data))
  })
  return { delvers, items }
}

async function readBalance(connection: Connection, owner: PublicKey): Promise<number> {
  try {
    const balance = await connection.getTokenAccountBalance(vaultAta(owner))
    const whole = (balance.value.uiAmountString ?? '0').split('.')[0] ?? '0'
    return Number(whole.replace(/[^\d]/g, '')) || 0
  } catch {
    return 0
  }
}

async function sendIx(connection: Connection, payer: PublicKey, send: SendTx, ixs: TransactionInstruction[]): Promise<void> {
  // Leave the blockhash empty. The wallet adapter stamps a fresh one
  // in the same moment it opens Phantom, so slow public RPCs waste less of the TTL.
  const tx = new Transaction()
  tx.feePayer = payer
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
  tx.add(...ixs)
  try {
    const signature = await send(tx, connection)
    // Poll the signature itself. Do not reuse a brand-new blockhash for confirm —
    // that pair is unrelated to the signed transaction and can report false timeouts.
    const start = Date.now()
    while (Date.now() - start < 60_000) {
      const status = await connection.getSignatureStatuses([signature])
      const value = status.value[0]
      if (value?.err) throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`)
      if (value && (value.confirmationStatus === 'confirmed' || value.confirmationStatus === 'finalized')) {
        return
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800))
    }
    throw new Error('The signature timed out. Approve in Phantom within a few seconds, then try again.')
  } catch (error) {
    throw new Error(await explainFailure(error))
  }
}

function instruction(disc: Uint8Array, keys: AccountMeta[], data?: Uint8Array): TransactionInstruction {
  const payload = data ? concat(disc, data) : disc
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data: payload as never,
  })
}

function meta(pubkey: PublicKey, writable = false, signer = false): AccountMeta {
  return { pubkey, isWritable: writable, isSigner: signer }
}

function decodeConfig(data: Uint8Array) {
  const cursor = new Cursor(data)
  return {
    admin: cursor.pubkey(),
    mint: cursor.pubkey(),
    guildVault: cursor.pubkey(),
  }
}

function decodePlayer(data: Uint8Array) {
  const cursor = new Cursor(data)
  cursor.pubkey()
  const nextDelverId = cursor.u64()
  const nextItemId = cursor.u64()
  const nextRunId = cursor.u64()
  cursor.u8()
  return {
    nextDelverId,
    nextItemId,
    nextRunId,
    lastFaucetAt: cursor.i64(),
    summonWindowStart: cursor.i64(),
    summonsInWindow: cursor.u8(),
  }
}

function decodeDelver(pubkey: PublicKey, data: Uint8Array): ChainDelver {
  const cursor = new Cursor(data)
  const origin = cursor.pubkey()
  const owner = cursor.pubkey()
  const id = cursor.u64()
  const name = cursor.name()
  const job = cursor.u8()
  const rarity = cursor.u8()
  const personality = cursor.u8()
  const mining = cursor.u16()
  const power = cursor.u16()
  const armor = cursor.u16()
  const luck = cursor.u16()
  const speed = cursor.u16()
  const sanity = cursor.u16()
  cursor.i16()
  cursor.i16()
  cursor.i16()
  cursor.i16()
  cursor.i16()
  cursor.i16()
  return {
    pubkey,
    origin,
    owner,
    id,
    name,
    job,
    rarity,
    personality,
    mining,
    power,
    armor,
    luck,
    speed,
    sanity,
    pickaxe: cursor.pubkey(),
    armorItem: cursor.pubkey(),
    accessory: cursor.pubkey(),
    consumable: cursor.pubkey(),
    status: cursor.u8(),
    listed: cursor.bool(),
    incapacitatedUntil: cursor.i64(),
    dungeonsCleared: cursor.u32(),
    rdavEarned: cursor.u64(),
    secondsDelved: cursor.u64(),
  }
}

function decodeItem(pubkey: PublicKey, data: Uint8Array): ChainItem {
  const cursor = new Cursor(data)
  return {
    pubkey,
    origin: cursor.pubkey(),
    owner: cursor.pubkey(),
    equippedTo: cursor.pubkey(),
    id: cursor.u64(),
    kind: cursor.u8(),
    template: cursor.u8(),
    rarity: cursor.u8(),
    mining: cursor.i16(),
    power: cursor.i16(),
    armor: cursor.i16(),
    luck: cursor.i16(),
    speed: cursor.i16(),
    sanity: cursor.i16(),
    durability: cursor.u16(),
    listed: cursor.bool(),
  }
}

function decodeRun(pubkey: PublicKey, data: Uint8Array): ChainRun {
  const cursor = new Cursor(data)
  cursor.pubkey()
  const id = cursor.u64()
  const zone = cursor.u8()
  const squadLen = cursor.u8()
  const squad = [cursor.pubkey(), cursor.pubkey(), cursor.pubkey()].slice(0, squadLen)
  return {
    pubkey,
    id,
    zone,
    squad,
    startedAt: cursor.i64(),
    duration: cursor.i64(),
    claimed: (() => {
      cursor.u64()
      return cursor.bool()
    })(),
    outcome: cursor.u8(),
    rdavWhole: cursor.u64(),
    loot: [cursor.u8(), cursor.u8(), cursor.u8(), cursor.u8()],
  }
}

function decodeListing(pubkey: PublicKey, data: Uint8Array): ChainListing {
  const cursor = new Cursor(data)
  return {
    pubkey,
    seller: cursor.pubkey(),
    asset: cursor.pubkey(),
    kind: cursor.u8(),
    priceRaw: cursor.u64(),
  }
}

class Cursor {
  i = 8
  data: Uint8Array
  constructor(data: Uint8Array) {
    this.data = data
  }
  u8() { return this.data[this.i++] ?? 0 }
  bool() { return this.u8() !== 0 }
  u16() {
    const value = (this.data[this.i] ?? 0) | ((this.data[this.i + 1] ?? 0) << 8)
    this.i += 2
    return value
  }
  i16() {
    const value = this.u16()
    return value >= 0x8000 ? value - 0x10000 : value
  }
  u32() {
    const value = (this.data[this.i] ?? 0) | ((this.data[this.i + 1] ?? 0) << 8) | ((this.data[this.i + 2] ?? 0) << 16) | ((this.data[this.i + 3] ?? 0) << 24)
    this.i += 4
    return value >>> 0
  }
  u64() {
    const value = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength).getBigUint64(this.i, true)
    this.i += 8
    return value
  }
  i64() {
    const value = Number(new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength).getBigInt64(this.i, true))
    this.i += 8
    return value
  }
  pubkey() {
    const key = new PublicKey(this.data.subarray(this.i, this.i + 32))
    this.i += 32
    return key
  }
  name() {
    const raw = this.data.subarray(this.i, this.i + 32)
    this.i += 32
    const end = raw.indexOf(0)
    return new TextDecoder().decode(end < 0 ? raw : raw.subarray(0, end))
  }
}

function sameDisc(data: Uint8Array, disc: Uint8Array): boolean {
  if (data.length < 8) return false
  for (let i = 0; i < 8; i += 1) if (data[i] !== disc[i]) return false
  return true
}

function bytesOf(data: Uint8Array): Uint8Array {
  return new Uint8Array(data)
}

function seed(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function bytes(values: number[]): Uint8Array {
  return Uint8Array.from(values)
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function hex(value: string): Uint8Array {
  const out = new Uint8Array(value.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** Solana memcmp wants base58 of the raw bytes. */
function toBase58(input: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let zeros = 0
  while (zeros < input.length && input[zeros] === 0) zeros += 1
  const digits = [0]
  for (let i = zeros; i < input.length; i += 1) {
    let carry = input[i] ?? 0
    for (let j = 0; j < digits.length; j += 1) {
      carry += digits[j]! * 256
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let out = '1'.repeat(zeros)
  for (let i = digits.length - 1; i >= 0; i -= 1) out += alphabet[digits[i]!]
  return out
}

function u64(value: bigint): Uint8Array {
  const out = new Uint8Array(8)
  new DataView(out.buffer).setBigUint64(0, value, true)
  return out
}

function rustString(value: string): Uint8Array {
  const text = new TextEncoder().encode(value)
  const len = new Uint8Array(4)
  new DataView(len.buffer).setUint32(0, text.length, true)
  return concat(len, text)
}

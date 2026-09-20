/**
 * Abyssal Codex — structured whitepaper sections for /whitepaper.
 * Source: RuneDelve Abyssal Vault lore document.
 */

export interface CodexBlock {
  type: 'p' | 'h3' | 'ul' | 'ol' | 'note'
  text?: string
  items?: string[]
}

export interface CodexSection {
  id: string
  number: string
  title: string
  blocks: CodexBlock[]
}

export const CODEX_SECTIONS: CodexSection[] = [
  {
    id: 'descent',
    number: '01',
    title: 'Introduction: The Descent',
    blocks: [
      {
        type: 'p',
        text: 'The sun is a forgotten myth. The surface world is nothing but choking ash, poisoned winds, and the bones of a dead era. Yet, beneath the scorched crust, the earth still bleeds magic. Deep within the Sunken Depths, hidden among the crumbling remnants of mad god temples and lost dwarven empires, lies the last true wealth of this world: the Rune Shards ($RDAV).',
      },
      {
        type: 'p',
        text: 'You are not a hero. You are a Guild Master, a ruthless orchestrator of survival and greed. From the shadows of the Vanguard Barracks, you will bind outcasts, exiled sorcerers, and disgraced knights to your will. You will send them into the suffocating dark. Some will return clad in ancient gold and glory; others will return broken, their minds shattered by the horrors of the abyss.',
      },
      {
        type: 'p',
        text: 'RuneDelve: Abyssal Vault is a Dark Fantasy RPG built natively on the Solana blockchain. We offer a grim, unforgiving, and 100% onchain reality.',
      },
      {
        type: 'p',
        text: 'Here, every drop of blood spilled, every relic unearthed, and every shard traded is permanently etched into the ledger. RuneDelve thrives on an uncompromising foundation: a self sustaining, hyper deflationary token economy; brutal, math driven abyssal combat; and a completely decentralized, player controlled black market.',
      },
      {
        type: 'note',
        text: 'The descent beckons. Will you conquer the depths, or will the abyss swallow your legacy?',
      },
    ],
  },
  {
    id: 'cycle',
    number: '02',
    title: 'The Cycle of the Abyss',
    blocks: [
      {
        type: 'p',
        text: 'Survival in RuneDelve is not handed to you; it is clawed back from the darkness. The game revolves around a relentless cycle of strategy, sacrifice, and unimaginable wealth, driven by a living blockchain that never sleeps.',
      },
      { type: 'h3', text: 'I. The Blood Contract' },
      {
        type: 'p',
        text: 'Your empire begins in the shadows of the Vanguard Barracks. By signing ancient pacts in blood, you draw forth wanderers, exiles, and disgraced knights. Every soul bound to your roster brings forgotten classes, volatile personalities, and innate traits. Forge them into a lethal strike force.',
      },
      { type: 'h3', text: 'II. The Descent & The Slaughter' },
      {
        type: 'p',
        text: 'Command your Vanguard into the ancient ruins. Pit mercenaries against nightmarish monstrosities in high stakes encounters. Dictate their gear, manage their sanity, and outsmart the dark — or face mental collapse and a bloodstained retreat.',
      },
      { type: 'h3', text: 'III. Unsealing the Reliquaries' },
      {
        type: 'p',
        text: 'Read the chronicles of survival and pry open cursed locks. From defeated bosses pour forth legendary armaments, lost blueprints, and pure glowing $RDAV shards.',
      },
      { type: 'h3', text: "IV. The Smuggler's Den" },
      {
        type: 'p',
        text: 'In a world without sunlight, there is no honor — only commerce. Auction veterans, hoard abyssal pickaxes, and remember: everything has a price, and the Guild always takes its cut.',
      },
    ],
  },
  {
    id: 'vanguard',
    number: '03',
    title: 'The Bloodbound Vanguard',
    blocks: [
      {
        type: 'p',
        text: 'Every mercenary is a mathematically unique, immutable onchain entity. Scars, kill counts, and fortunes dragged from the dirt are etched into their digital soul — and dictate their value on the black market.',
      },
      { type: 'h3', text: 'Disciplines of the Dark' },
      {
        type: 'ul',
        items: [
          'Rune Arcanist — Unmatched extraction; tears $RDAV from bedrock with forbidden magic.',
          'Breaker Paladin — The unyielding shield; absorbs crushing trauma so others may live.',
          'Ashen Rogue — Shadow-born luck; bypasses traps and sniffs out the highest Reliquaries.',
          'Vault Geomancer — Earth binder; unearths hidden veins and collapses caverns on the hunted.',
          'Sanity Warden — Shepherd of the mind; mends psyches and blunts the mental toll of the descent.',
        ],
      },
      { type: 'h3', text: 'The Anatomy of a Survivor' },
      {
        type: 'p',
        text: 'Six ruthless metrics: Mining, Power, Armor, Luck, Speed, and Sanity. Words do not measure worth — the ledger does.',
      },
      { type: 'h3', text: 'Psychological Scars' },
      {
        type: 'ul',
        items: [
          'Avaricious — More shards, but louder footsteps that invite ambush.',
          'Vigilant — Less loot, supernatural avoidance of fatal blows.',
          'Wrathful — Monstrous lethality bought with abandoned caution.',
          'Stoic — Walks through traps, collapses, and miasma unscathed.',
          'Reckless — Slashes expedition time; plunges in regardless of injury.',
        ],
      },
    ],
  },
  {
    id: 'toll',
    number: '04',
    title: 'The Toll of the Abyss',
    blocks: [
      {
        type: 'p',
        text: 'In the foundational phase there is no permanent death — but do not mistake mercy for safety. Failed expeditions inflict Mental Collapse: an onchain incapacitatedUntil timestamp. The broken cannot delve, equip, or sell until the timer ends, or until an Abyssal Elixir is paid in $RDAV.',
      },
      { type: 'h3', text: 'The Horizon of Blood' },
      {
        type: 'p',
        text: 'Future Abyssal PvP & Invasion Protocols will let Guilds snatch Reliquaries from rivals. In those lawless depths, fallen mercenaries may be burned from the ledger forever — Permadeath that turns veterans into heavily guarded assets.',
      },
    ],
  },
  {
    id: 'combat',
    number: '05',
    title: 'The Descent & The Colosseum',
    blocks: [
      { type: 'h3', text: 'PvE — The Sunken Depths' },
      {
        type: 'ol',
        items: [
          'The Sunken Tunnels — Rapid skirmishes for materials and trace shards.',
          'Dwarven Crystal Vaults — Maze of shadow goblins; Silver Reliquaries await.',
          'The Magma Crucible — Rivers of fire; Gilded Reliquaries demand heavy armor.',
          'The Void Abyss — Overnight siege of cosmic horror; mythic artifacts and massive $RDAV.',
        ],
      },
      {
        type: 'p',
        text: 'No Web2 grind servers. When your squad crosses the threshold, Solana smart contracts resolve Lethality, Resilience, and Luck against the zone matrix — and etch a Bloodstained Chronicle.',
      },
      { type: 'h3', text: 'The Ashen Colosseum (Upcoming PvP)' },
      {
        type: 'ul',
        items: [
          'Blood Wagers — Stake $RDAV. Winner takes all.',
          'Guild Supremacy — Climb gladiator boards for titles and Treasury tax cuts.',
          'The Ultimate Build Check — Gear, personality, and stats with nowhere to hide.',
        ],
      },
    ],
  },
  {
    id: 'bazaar',
    number: '06',
    title: "The Smuggler's Den",
    blocks: [
      {
        type: 'p',
        text: 'No NPCs buy your junk. The economy is peer to peer and dictated by player demand.',
      },
      {
        type: 'ul',
        items: [
          'Free Market Pricing — List idle, healthy, unequipped Delvers or artifacts in $RDAV.',
          'The Valuation of History — Lifetime stats travel with the blade; veterans command premiums.',
          'The Blood Tax — 3% of every sale flows into the onchain Abyssal Vault. The economy feeds itself.',
        ],
      },
    ],
  },
  {
    id: 'tokenomics',
    number: '07',
    title: 'Abyssal Vault Economics',
    blocks: [
      {
        type: 'p',
        text: '$RDAV rejects infinite GameFi inflation. Scarcity, transparency, and a closed loop flywheel.',
      },
      { type: 'h3', text: 'Pump.fun Fair Launch & Fixed Supply' },
      {
        type: 'p',
        text: 'Fair launched on pump.fun. Total supply is fixed and immutable. No inflation protocol. No endless printing for yields.',
      },
      { type: 'h3', text: 'The Genesis Injection' },
      {
        type: 'p',
        text: 'The Creator bought the initial allocation with their own SOL and injected 100% into the smart contract Treasury. No hidden developer bags. Vault tokens are earned only by braving the depths.',
      },
      { type: 'h3', text: 'The Closed Loop Flywheel' },
      {
        type: 'ul',
        items: [
          'Faucets — Expeditions, Reliquaries, and bounties draw $RDAV from the Vault.',
          'Sinks — Elixirs, Runic Imbuement, and the 3% Blood Tax return $RDAV to the Vault.',
        ],
      },
      { type: 'h3', text: 'Sustainable Operations' },
      {
        type: 'p',
        text: 'Development and infrastructure are funded by trading fees on pump.fun and DEXs — not by leeching the game ecosystem. We win only when $RDAV thrives.',
      },
    ],
  },
  {
    id: 'roadmap',
    number: '08',
    title: 'The Roadmap',
    blocks: [
      { type: 'h3', text: 'Phase 1 — The Descent (Devnet Sandbox)' },
      {
        type: 'p',
        text: 'Live on Solana Devnet. Public prototype testing, combat calibration, and injury math with early Vanguard testers.',
      },
      { type: 'h3', text: 'Phase 2 — The Blood Offering (Mainnet)' },
      {
        type: 'ol',
        items: [
          'Fair launch $RDAV on pump.fun.',
          'Deploy audited Anchor contracts to Solana Mainnet.',
          'Genesis Injection into the Abyssal Vault. Devnet resets. Real stakes begin.',
        ],
      },
      { type: 'h3', text: 'Phase 3 — The Ashen Colosseum' },
      {
        type: 'p',
        text: 'Onchain PvP duels, $RDAV stakes, and Permadeath that keeps elite blades rare.',
      },
      { type: 'h3', text: 'Phase 4 — Beyond the Web' },
      {
        type: 'p',
        text: 'Mobile and desktop clients synced through the ledger. Listings on Web3 aggregators and indie platforms.',
      },
      { type: 'h3', text: 'Phase 5 — The Infinite Depths' },
      {
        type: 'ul',
        items: [
          'Dungeon Node land NFTs with owner tax on visiting squads.',
          'Soul Forge breeding for hybrid Delver traits.',
          'Open API for trackers, markets, and community mini-games.',
        ],
      },
    ],
  },
]

# RuneDelve: Abyssal Vault (RDAV)

Web3 dark fantasy idle RPG — **Hi-Bit Dark Fantasy** UI with Sanctum map + immersive Gate.

---

## Current Phase

**Phase 5: Smuggler's Den**
- Injury is only `incapacitatedUntil`. When the clock passes, the mercenary can delve again
- `/shrine` is the beta altar: 10,000 $RDAV once an hour, and three paid summons an hour
- Devnet program `8cNry1rJa2WMJX9EdvcDPd346mTjoWWTw39HKshCN3eT` is live. `/town` is open to walk. Entering a building asks for a Phantom wallet on Solana Devnet, free test SOL, and a one-time vault open. No Mainnet SOL is required.
- Put your private RPC in `.env.local` as `VITE_SOLANA_RPC_URL` (see `.env.example`). Public Devnet RPC often times out when opening the vault.
- The same two clocks are in `solana_contract/lib.rs` (`claim_faucet` prints 10,000, summon cap is 3)
- Barracks cards bleed red while the timer runs. An Abyssal Elixir in the dossier clears it
- `/bazaar` is a $RDAV-only black market. Wounded or geared mercenaries cannot be listed
- Sales burn a 3% guild tax. Cancel returns the unsold asset

Prior: Phase 4 chronicles · Phase 3 depths scene

---

## Routes

| Path | Scene |
| --- | --- |
| `/` | Sanctuary Gate (interactive landing) |
| `/town` | Sanctum Overlook map hub |
| `/camp` | Vanguard Barracks — campfire rest yard + Armory Vault |
| `/expeditions` | Sunken Depths — cavern overlook, four mouths, summoning altar, minecart |
| `/bazaar` | Smuggler's Den — black market hall and your consignments |
| `/shrine` | Crimson altar — 10,000 $RDAV per hour, three mercenary offerings per hour |

---

## Open-source UI credits

| Pack | License | Use |
| --- | --- | --- |
| [Flare buttons](https://opengameart.org/content/flare-buttons) | CC0 | Hero `Enter the Sanctum` bar |
| [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | CC0 | Barracks yard props (crates / barrels / columns) |
| [Kenney Fantasy UI Borders](https://kenney.nl/assets/fantasy-ui-borders) | CC0 | Divider / ornament accents in vault modals |
| [LuizMelo on itch.io](https://luizmelo.itch.io/) — Warrior & Wizard packs | CC0 | All five job idle portraits (Muster / Dossier) |
| [Tiny RPG — Dark Dwellers GUI](https://opengameart.org/content/tiny-rpg-dark-dwellers-gui) | CC0 | Vault stat plates (9-slice frames) |
| [Tiny RPG — Dragon Regalia GUI](https://opengameart.org/content/tiny-rpg-dragon-regalia-gui) | CC0 | Modal shells, portrait frames, stash slots |
| [Kenney UI Pack RPG Expansion](https://kenney.nl/assets/ui-pack-rpg-expansion) | CC0 | Legacy panel sprites |
| [Misc. Dark Fantasy Scenery](https://opengameart.org/content/misc-dark-fantasy-scenery-sprites) (ETTiNGRiNDER) | CC0 | Dungeon chains reference under `public/assets/ui/seal/` |
| [Door Lock Sounds](https://opengameart.org/content/door-lock-sounds) (Cough-E) | CC0 | Seal unlock click |
| [100 CC0 metal/wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) (rubberduck) | CC0 | Lock open / chain fall / snap |

---

## Typography

| Font | Use |
| --- | --- |
| Pirata One | Brand, headings, seals, button labels |
| Cinzel | Body / UI copy |
| Silkscreen | Numbers only |

---

## Scripts

```bash
npm run dev
npm run build
```

`tsc -b` must pass.

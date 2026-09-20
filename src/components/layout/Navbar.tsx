/**
 * Navbar — brand rune seal. The sigil button opens a real Solana wallet.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useGame } from '../../context/GameContext'

/** Official X glyph — gold-tinted via currentColor in the HUD plate */
function XMarkIcon() {
  return (
    <svg className="game-hud-x-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function Navbar() {
  const { publicKey, connected, connecting, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { setWalletAddress, vaultMode, vaultNote } = useGame()

  // Keep the save's seller id in step with the connected wallet.
  useEffect(() => {
    setWalletAddress(publicKey ? publicKey.toBase58() : null)
  }, [publicKey, setWalletAddress])

  const handleWalletClick = () => {
    if (connected) {
      void disconnect()
      return
    }
    setVisible(true)
  }

  const walletLabel = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : connecting
      ? 'Opening…'
      : 'Bind Sigil'

  return (
    <header className="game-hud sticky top-0 z-50">
      <div className="game-hud-inner mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 md:px-6">
        <Link to="/town" className="game-hud-brand group" aria-label="RuneDelve sanctum map">
          <img
            src="/assets/ui/brand-rune-seal.png?v=3"
            alt=""
            className="game-hud-seal pixelated"
            draggable={false}
          />
          <span className="font-heading text-2xl tracking-wide text-[#f0d78c] transition-colors group-hover:text-[#ffe6a0] md:text-[1.65rem]">
            RuneDelve
          </span>
        </Link>

        <div className="flex items-center gap-3 md:gap-4">
          <Link to="/" className="game-hud-gate-link hidden sm:inline">
            Gate
          </Link>

          <Link to="/whitepaper" className="game-hud-gate-link hidden sm:inline" title="The Abyssal Codex">
            Codex
          </Link>

          <a
            href="https://x.com/AbyssalVault"
            target="_blank"
            rel="noopener noreferrer"
            className="game-hud-x-link"
            aria-label="Abyssal Vault on X"
            title="Abyssal Vault on X"
          >
            <XMarkIcon />
            <span className="game-hud-x-label hidden sm:inline">Herald</span>
          </a>

          <button
            type="button"
            className="sigil-bind-btn"
            onClick={handleWalletClick}
            aria-label={connected ? 'Disconnect wallet' : 'Connect a Solana wallet'}
          >
            <img
              src="/assets/ui/icon-sigil-key.png?v=2"
              alt=""
              className="sigil-bind-icon pixelated"
              draggable={false}
            />
            <span className={publicKey ? 'font-pixel text-[10px]' : 'font-body text-[11px] font-semibold tracking-wide'}>
              {walletLabel}
            </span>
            {vaultMode === 'live' && <span className="font-pixel text-[8px] text-runeflame">Devnet</span>}
          </button>
          {vaultNote && (
            <p className="max-w-[14rem] text-right font-body text-[10px] text-[#e07070]">{vaultNote}</p>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar

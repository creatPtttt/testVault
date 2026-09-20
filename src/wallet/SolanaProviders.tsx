/**
 * SolanaProviders — real wallet login on Devnet.
 * Uses Helius when VITE_SOLANA_RPC_URL is set in .env.local.
 * Public RPC is only the fallback and often times out on vault open.
 */

import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { SOLANA_RPC_URL } from '../config/gameConfig'

import '@solana/wallet-adapter-react-ui/styles.css'

export function SolanaProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => SOLANA_RPC_URL, [])
  // Empty list: installed standard wallets (Phantom, Solflare) register themselves.
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

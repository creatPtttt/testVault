import './polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameProvider } from './context/GameContext.tsx'
import { SolanaProviders } from './wallet/SolanaProviders.tsx'

// Wallet sits outside the save so a refresh can reconnect before the game reads the address.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProviders>
      <GameProvider>
        <App />
      </GameProvider>
    </SolanaProviders>
  </StrictMode>,
)

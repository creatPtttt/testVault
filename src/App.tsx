/**
 * App shell — Sanctum Overlook is open to walk.
 * Binding a Devnet wallet is only required when entering a building.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { PageTransition } from './components/layout/PageTransition'
import { SigilAwait } from './components/SigilAwait'
import { VaultBound } from './components/VaultBound'
import { GameCursor } from './components/GameCursor'
import { WalletGate } from './components/WalletGate'
import { GatePage } from './pages/GatePage'
import { CampPage } from './pages/CampPage'
import { ExpeditionsPage } from './pages/ExpeditionsPage'
import { BazaarPage } from './pages/BazaarPage'
import { ShrinePage } from './pages/ShrinePage'
import { TownHubPage } from './pages/TownHubPage'
import { WhitepaperPage } from './pages/WhitepaperPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-obsidian font-body text-white">
        <Navbar />
        <PageTransition />
        <GameCursor />
        <SigilAwait />
        <VaultBound />

        <Routes>
          <Route path="/" element={<GatePage />} />
          <Route path="/town" element={<TownHubPage />} />
          <Route path="/whitepaper" element={<WhitepaperPage />} />
          <Route
            path="/camp"
            element={
              <WalletGate place="the Barracks">
                <CampPage />
              </WalletGate>
            }
          />
          <Route
            path="/expeditions"
            element={
              <WalletGate place="the Depths">
                <ExpeditionsPage />
              </WalletGate>
            }
          />
          <Route
            path="/bazaar"
            element={
              <WalletGate place="the Smuggler's Den">
                <BazaarPage />
              </WalletGate>
            }
          />
          <Route
            path="/shrine"
            element={
              <WalletGate place="the Shrine">
                <ShrinePage />
              </WalletGate>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

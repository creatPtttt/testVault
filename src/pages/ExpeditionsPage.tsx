/**
 * /expeditions — immersive cavern, same shell as the Sanctum and Barracks.
 */

import { DepthsScene } from '../components/expeditions/DepthsScene'

export function ExpeditionsPage() {
  return (
    <main className="sanctum-immersive relative h-[calc(100vh-3.25rem)] w-full overflow-hidden bg-obsidian">
      <DepthsScene />
    </main>
  )
}

export default ExpeditionsPage

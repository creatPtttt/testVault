/**
 * CampPage — immersive Barracks hub (same shell language as /town).
 */

import { BarracksScene } from '../components/camp/BarracksScene'

export function CampPage() {
  return (
    <main className="sanctum-immersive relative h-[calc(100vh-3.25rem)] w-full overflow-hidden bg-obsidian">
      <BarracksScene />
    </main>
  )
}

export default CampPage

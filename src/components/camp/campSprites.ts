/**
 * Job portrait GIFs — LuizMelo CC0 idle strips under public/assets/camp/delvers/portraits/
 * Pack map:
 *   Medieval Warrior Pack 2 → Ashen Rogue
 *   Evil Wizard 3           → Rune Arcanist
 *   Wizard Pack             → Sanity Warden
 *   Evil Wizard 2           → Vault Geomancer
 *   Medieval Warrior Pack 3 → Breaker Paladin
 */

import type { JobClass } from '../../types/game'

export const JOB_PORTRAIT: Record<JobClass, string> = {
  'Breaker Paladin': '/assets/camp/delvers/portraits/paladin.gif',
  'Rune Arcanist': '/assets/camp/delvers/portraits/arcanist.gif',
  'Ashen Rogue': '/assets/camp/delvers/portraits/rogue.gif',
  'Vault Geomancer': '/assets/camp/delvers/portraits/geomancer.gif',
  'Sanity Warden': '/assets/camp/delvers/portraits/warden.gif?v=2',
}

/** @deprecated use JOB_PORTRAIT — kept for any strip-based callers */
export const JOB_SPRITE = JOB_PORTRAIT

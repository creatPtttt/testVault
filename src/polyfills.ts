/**
 * Browser shims for Solana packages that still expect Node globals.
 * Must be the first import in main.tsx so Buffer exists before SPL token loads.
 */

import { Buffer } from 'buffer'

const root = globalThis as typeof globalThis & { Buffer: typeof Buffer; global?: typeof globalThis }
root.Buffer = Buffer
root.global = root

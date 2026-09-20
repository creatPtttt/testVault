/**
 * FloatingEmbers — rising sparks across the Gate abyss (fixed layer).
 */

const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  delay: `${(i % 9) * 0.45}s`,
  size: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 4,
  duration: `${7 + (i % 5)}s`,
}))

export function FloatingEmbers() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      {EMBERS.map((ember) => (
        <span
          key={ember.id}
          className="ember-rise absolute bottom-0 rounded-full"
          style={{
            left: ember.left,
            width: ember.size,
            height: ember.size,
            animationDelay: ember.delay,
            animationDuration: ember.duration,
          }}
        />
      ))}
    </div>
  )
}

export default FloatingEmbers

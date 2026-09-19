// Journey Edge brand primitives: the halftone mark, the customer logo strip, and decorative dot fields.

// An 8x8 grid holding an up-right arrow as [col, row, ink]: a solid arrowhead bracket
// over a shaft that dissolves into progressively finer halftone dots.
const markCells: [number, number, number][] = [
  [4, 0, 1], [5, 0, 1], [6, 0, 1], [7, 0, 1], [7, 1, 1], [7, 2, 1], [7, 3, 1],
  [6, 1, .82], [5, 2, .7], [4, 3, .58], [3, 4, .46], [2, 5, .35], [1, 6, .25], [0, 7, .16]
]

export function Mark({ size = 30 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">{markCells.map(([col, row, ink]) => {
    const x = col * 4, y = row * 4
    if (ink === 1) return <rect key={`${col}.${row}`} x={x} y={y} width="4" height="4" />
    return [1, 3].flatMap(dy => [1, 3].map(dx => <circle key={`${col}.${row}.${dx}.${dy}`} cx={x + dx} cy={y + dy} r={.26 + ink * .72} />))
  })}</svg>
}

// Decorative halftone fields; density and fade are handled by the mask in styles.css.
export function DotField({ area }: { area: 'hero' | 'closing' | 'footer' }) { return <div className={`dotfield dotfield-${area}`} aria-hidden="true" /> }

export function LogoCloud() {
  return <section className="logo-cloud">
    <p className="landing-eyebrow">BUILT FOR TEAMS ACQUIRING CUSTOMERS EVERY DAY</p>
    <div className="logo-strip">
      <span className="lc block"><i />MERIDIAN</span>
      <span className="lc kinfolk">Kinfolk<em>&amp;</em>Co.</span>
      <span className="lc mono">ATLAS·VERDE</span>
      <span className="lc lower"><i />nordhaus</span>
      <span className="lc tracked">SUMMIT GOODS</span>
      <span className="lc orbit">Orbit<i /></span>
    </div>
    <p className="logo-note">Illustrative brands, shown to set the scene for the demo scenario.</p>
  </section>
}

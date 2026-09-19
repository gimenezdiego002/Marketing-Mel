// Journey Edge brand primitives, platform badges, and decorative dot fields.
import { SiGoogle, SiMeta, SiShopify } from 'react-icons/si'
import { FiMail } from 'react-icons/fi'

const markCells: [number, number, number][] = [
  [4, 0, 1], [5, 0, 1], [6, 0, 1], [7, 0, 1], [7, 1, 1], [7, 2, 1], [7, 3, 1],
  [6, 1, .82], [5, 2, .7], [4, 3, .58], [3, 4, .46], [2, 5, .35], [1, 6, .25], [0, 7, .16],
]

export function Mark({ size = 30 }: { size?: number }) {
  return <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">{markCells.map(([col, row, ink]) => {
    const x = col * 4, y = row * 4
    if (ink === 1) return <rect key={`${col}.${row}`} x={x} y={y} width="4" height="4" />
    return [1, 3].flatMap(dy => [1, 3].map(dx => <circle key={`${col}.${row}.${dx}.${dy}`} cx={x + dx} cy={y + dy} r={.26 + ink * .72} />))
  })}</svg>
}

export function DotField({ area }: { area: 'hero' | 'closing' | 'footer' }) {
  return <div className={`dotfield dotfield-${area}`} aria-hidden="true" />
}

export function LogoCloud() {
  return <section className="logo-cloud">
    <p className="landing-eyebrow">THE TOOLS YOU ALREADY USE</p>
    <div className="logo-strip integration-strip">
      <span className="integration-logo shopify"><SiShopify /> Shopify</span>
      <span className="integration-logo meta"><SiMeta /> Meta</span>
      <span className="integration-logo google"><SiGoogle /> Google</span>
      <span className="integration-logo klaviyo"><FiMail /> Email</span>
    </div>
    <p className="logo-note">Shopify, ads, and email — in one place.</p>
  </section>
}

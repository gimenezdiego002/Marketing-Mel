import type { ReactNode } from 'react'

// Familiarity stickers and atmospheric stages.
// Photos are die-cut product objects a Shopify coffee merchant already handles.
// UI fragments are the surfaces they live in every day (ads, orders, email) — not clipart.

export const img = {
  hero: '/visuals/texture-hero.png',
  working: '/visuals/texture-working.png',
  loop: '/visuals/texture-loop.png',
  bag: '/visuals/sticker-coffee-bag.png',
  cup: '/visuals/sticker-cup.png',
  mailer: '/visuals/sticker-mailer.png',
}

// Launch-film cast. Cards show the face — that’s who the shopper is. Full-body
// turnaround sheets stay in /visuals for the video render, not on the landing page.
export type CastMember = { id: string; face: string; role: string; note: string }

export const cast: CastMember[] = [
  { id: '01', face: '/visuals/cast-01-face.png?v=2', role: 'The first-time buyer', note: 'Sees the ad once, clicks it, and orders before the kettle boils.' },
  { id: '02', face: '/visuals/cast-02-face.png?v=2', role: 'The regular', note: 'Buys every month. Barely reads the ad any more — he already knows.' },
  { id: '03', face: '/visuals/cast-03-face.png?v=2', role: 'The one who scrolled past', note: 'Fourth time this week. His thumb keeps moving.' },
]

export function CastCard({ member }: { member: CastMember }) {
  return (
    <figure className="cast-card">
      <img src={member.face} alt={member.role} loading="lazy" />
      <figcaption>
        <span>SHOPPER {member.id}</span>
        <h3>{member.role}</h3>
        <p>{member.note}</p>
      </figcaption>
    </figure>
  )
}

export function PhotoSticker({ src, alt, className = '', rotate = 0 }: { src: string; alt: string; className?: string; rotate?: number }) {
  return (
    <figure className={`photo-sticker ${className}`} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden={alt === ''}>
      <img src={src} alt={alt} />
    </figure>
  )
}

export function MetaAdSticker({ creative = img.bag, name = 'Morning Ritual Blend', rotate = -4 }: { creative?: string; name?: string; rotate?: number }) {
  return (
    <article className="ui-sticker ad-sticker" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <header><i /> Sponsored · Facebook</header>
      <img src={creative} alt="" />
      <div>
        <strong>{name}</strong>
        <span>Shop now</span>
      </div>
    </article>
  )
}

export function ShopifyOrderSticker({ rotate = 3 }: { rotate?: number }) {
  return (
    <article className="ui-sticker shop-sticker" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <header><b>S</b> Shopify · New order</header>
      <strong>#1042 · Pour-over × 2</strong>
      <p>$48.00 paid · Ready to ship</p>
    </article>
  )
}

export function EmailSticker({ rotate = -2 }: { rotate?: number }) {
  return (
    <article className="ui-sticker mail-sticker" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <header>Welcome flow · Klaviyo</header>
      <strong>You’re in. Here’s 10% off your first bag.</strong>
      <p>Opened 42% · Clicked 1.3%</p>
    </article>
  )
}

export function GoogleAdSticker({ rotate = 2 }: { rotate?: number }) {
  return (
    <article className="ui-sticker search-sticker" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden="true">
      <span>Ad · brewandbloom.example</span>
      <strong>Brew & Bloom | Fresh roasted coffee</strong>
      <p>Small-batch beans, roasted to order. Free shipping over $40.</p>
    </article>
  )
}

export function ConceptCard({ tone, word, kicker, text, children }: { tone: 'spot' | 'explain' | 'approve'; word: string; kicker: string; text: string; children: ReactNode }) {
  return (
    <article className={`concept-card concept-${tone}`}>
      <p>{kicker}</p>
      <div className="concept-art">{children}</div>
      <h3>{word}</h3>
      <span>{text}</span>
    </article>
  )
}

export function Scene({ src, children, className = '' }: { src: string; children: ReactNode; className?: string }) {
  return (
    <div className={`scene ${className}`}>
      <img className="scene-photo" src={src} alt="" />
      <div className="scene-shade" />
      {children}
    </div>
  )
}

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`glass-card ${className}`}>{children}</div>
}

export function SpotArt() {
  return (
    <svg viewBox="0 0 220 160" aria-hidden="true">
      <path d="M20 140 C40 70 70 40 110 80" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M200 24 C160 40 140 90 110 80" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M176 148 C150 120 130 90 110 80" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <circle cx="110" cy="80" r="8" fill="#c45c3a" />
    </svg>
  )
}

export function ExplainArt() {
  return (
    <svg viewBox="0 0 220 160" aria-hidden="true">
      <circle cx="110" cy="86" r="54" fill="none" stroke="currentColor" strokeWidth="10" />
      <circle cx="110" cy="86" r="18" fill="#c45c3a" />
      <path d="M110 32 v18 M110 122 v18 M56 86 h-18 M182 86 h-18" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )
}

export function ApproveArt() {
  return (
    <svg viewBox="0 0 220 160" aria-hidden="true">
      <circle cx="40" cy="124" r="7" />
      <circle cx="68" cy="130" r="7" />
      <circle cx="96" cy="126" r="7" />
      <circle cx="124" cy="132" r="7" />
      <path d="M168 14c12 0 20 8 20 20v34l16 6-10 18-24-10v36h-22V78c-16 4-22-8-14-18 10-4 18-14 18-26 0-12 6-20 16-20z" fill="#c45c3a" />
    </svg>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DotField, LogoCloud, Mark } from '../brand'
import {
  ApproveArt, CastCard, ConceptCard, EmailSticker, ExplainArt, GlassCard, GoogleAdSticker,
  MetaAdSticker, PhotoSticker, Scene, ShopifyOrderSticker, SpotArt, cast, img,
} from '../visuals'

export default function Landing() {
  const navigate = useNavigate()
  const openDemo = () => { void navigate('/demo/overview') }
  const openApp = () => { void navigate('/app/overview') }
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <button className="journey-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Mark size={26} /> Journey Edge</button>
          <div className="header-actions">
            <nav className="pill-nav" aria-label="Site">
              <a href="#product">What it does</a>
              <a href="#workflow">How it works</a>
              <a href="#control">Control</a>
              <a href="#cast">The film</a>
              <button className="sign-in" onClick={() => openApp()}>Sign in</button>
              <button className="primary" onClick={() => openDemo()}>See the demo <b>→</b></button>
            </nav>
            <button type="button" className="landing-burger" aria-label="Open menu" onClick={() => setMenu(true)}>☰</button>
          </div>
        </div>
      </header>
      {menu && (
        <div className="landing-menu" role="dialog" aria-label="Menu">
          <div className="menu-head">
            <button className="journey-brand" onClick={() => setMenu(false)}><Mark size={26} /> Journey Edge</button>
            <button className="menu-close" onClick={() => setMenu(false)} aria-label="Close menu">✕</button>
          </div>
          <nav>
            <a href="#product" onClick={() => setMenu(false)}>What it does</a>
            <a href="#workflow" onClick={() => setMenu(false)}>How it works</a>
            <a href="#control" onClick={() => setMenu(false)}>Staying in control</a>
            <a href="#cast" onClick={() => setMenu(false)}>The film</a>
          </nav>
          <button className="secondary full" onClick={() => { setMenu(false); openApp() }}>Sign in</button>
          <button className="primary full" onClick={() => { setMenu(false); openDemo() }}>See the demo</button>
        </div>
      )}
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="landing-eyebrow">FOR PEOPLE WHO RUN A SHOPIFY STORE</p>
            <h1>Know what to fix.<br/><em>Understand why.</em><br/>Stay in control.</h1>
            <p>Journey Edge watches your ads and your sales, tells you in plain English what’s going wrong and why, and always asks before it changes anything. No jargon, no guesswork.</p>
            <div className="hero-actions">
              <button className="primary large" onClick={() => openDemo()}>See the demo <b>→</b></button>
              <a href="#workflow" className="watch-link">See how it works <span>↓</span></a>
            </div>
            <div className="source-row">
              <span><i>✓</i> Real sales from Shopify</span>
              <span><i>✓</i> Nothing changes without your yes</span>
            </div>
          </div>
          <HeroStage launch={openDemo} />
        </section>
        <LogoCloud />
        <section className="proof" id="product">
          <p className="landing-eyebrow">WHAT IT DOES FOR YOU</p>
          <h2>You shouldn’t need a marketing degree<br/>to know <em>what to do next.</em></h2>
          <div className="concept-grid">
            <ConceptCard tone="spot" word="Spot" kicker="Catches it early" text="Tells you which ads are slipping — and which are quietly doing well — before it costs you money."><SpotArt /></ConceptCard>
            <ConceptCard tone="explain" word="Explain" kicker="Plain words, real figures" text="Says why in everyday words, and shows you the numbers it read to get there."><ExplainArt /></ConceptCard>
            <ConceptCard tone="approve" word="Approve" kicker="Your yes, every time" text="Nothing that costs you money happens until you’ve seen it and agreed."><ApproveArt /></ConceptCard>
          </div>
        </section>
        <section className="workflow" id="workflow">
          <div className="workflow-heading">
            <p className="landing-eyebrow">A CALMER WAY TO WORK</p>
            <h2>From scattered numbers<br/>to <em>one clear next step.</em></h2>
            <p>You get a short list of things worth doing — not another dashboard to puzzle over.</p>
          </div>
          <div className="stage-stack">
            <div className="stage-copy">
              <h3>It reads the numbers first</h3>
              <p>Reads Shopify, Facebook, Google and email, then lines up what’s actually off — in the order that matters.</p>
            </div>
            <Scene src={img.working}>
              <GlassCard>
                <p className="glass-kicker">Journey Edge working…</p>
                <ul>
                  <li><i /> People are tired of your best ad <b>Reviewing</b></li>
                  <li><i /> One ad has room to grow <b>Up next</b></li>
                  <li><i /> Welcome email clicks dropped <b>Waiting</b></li>
                </ul>
              </GlassCard>
              <PhotoSticker className="scene-sticker bag" src={img.bag} alt="" rotate={-8} />
              <MetaAdSticker rotate={6} />
            </Scene>
            <div className="stage-arrow" aria-hidden="true">↓</div>
            <div className="stage-copy stage-copy-end">
              <h3>Keeps you in the loop</h3>
              <p>It finishes the reading, then asks you before the next step would spend money.</p>
            </div>
            <Scene src={img.loop} className="scene-end">
              <GlassCard>
                <p className="glass-kicker">Waiting for your OK</p>
                <p className="glass-title">Swap in two fresh images</p>
                <p>Same budget. Same audience. We’ll check whether clicks recover.</p>
                <div className="glass-bar"><span /></div>
              </GlassCard>
              <ShopifyOrderSticker rotate={-6} />
              <PhotoSticker className="scene-sticker cup" src={img.cup} alt="" rotate={7} />
            </Scene>
          </div>
        </section>
        <section className="control" id="control">
          <div>
            <p className="landing-eyebrow">HELPFUL, NEVER RECKLESS</p>
            <h2>Clever software.<br/><em>Your rules.</em></h2>
            <p>Three promises that don’t bend, even when we think we’ve found a good idea.</p>
          </div>
          <div className="control-list">
            <Control title="We never make numbers up" text="Every sentence we write points back to a real figure, a real date, and the account it came from." />
            <Control title="Nothing big happens behind your back" text="You set how much can be spent and what needs your say-so. We can’t go past either." />
            <Control title="A full record of every decision" text="What we suggested, why we suggested it, what you decided, and how it turned out." />
          </div>
        </section>
        <section className="story" id="story">
          <div className="story-label">
            <p className="landing-eyebrow">A WORKED EXAMPLE</p>
            <h2>Meet Brew<br/>& Bloom.</h2>
            <p>A coffee brand whose best ad had quietly started to wear out.</p>
            <span>Made-up data, for the demo</span>
            <div className="story-stickers">
              <PhotoSticker src={img.bag} alt="Brew & Bloom coffee bag" rotate={-6} />
              <PhotoSticker src={img.mailer} alt="Shipping mailer" rotate={8} />
            </div>
          </div>
          <div className="story-flow">
            <StoryCard step="What we noticed" title="Their best ad had gone stale" body="37% fewer people clicked it, while the same shoppers kept being shown it again and again." image={img.bag} />
            <div className="flow-arrow">↓</div>
            <StoryCard step="What we suggested" title="New images, same budget" body="Two fresh versions ready to go. Not a penny more in spend." image={img.cup} />
            <div className="flow-arrow">↓</div>
            <StoryCard step="Who decided" title="They did" body="They read the reason, checked the numbers behind it, and clicked yes." image={img.mailer} />
          </div>
        </section>
        <section className="cast" id="cast">
          <div className="cast-head">
            <p className="landing-eyebrow">THE PEOPLE IN THE FILM</p>
            <h2>Behind every number,<br/><em>someone scrolling.</em></h2>
            <p>Our launch film follows three shoppers who all meet the same Brew &amp; Bloom ad. What we call an ad wearing out, they just call “seen it.”</p>
          </div>
          <div className="cast-grid">
            {cast.map(member => <CastCard key={member.id} member={member} />)}
          </div>
        </section>
        <section className="familiar" id="familiar">
          <div>
            <p className="landing-eyebrow">THINGS YOU ALREADY LOOK AT</p>
            <h2>It reads the tools<br/>you already open.</h2>
            <p>Not another mystery dashboard. The same ads, orders, and emails you already check — lined up, and explained.</p>
          </div>
          <div className="familiar-board">
            <MetaAdSticker rotate={-5} />
            <ShopifyOrderSticker rotate={4} />
            <EmailSticker rotate={-3} />
            <GoogleAdSticker rotate={5} />
            <PhotoSticker src={img.cup} alt="" rotate={-7} />
          </div>
        </section>
        <section className="closing">
          <DotField area="closing" />
          <p className="landing-eyebrow">SPEND LESS TIME WONDERING</p>
          <h2>Stop digging through dashboards<br/>for an answer.</h2>
          <p>Get a short, clear list of what’s worth doing — and why.</p>
          <button className="primary large" onClick={() => openDemo()}>Try Journey Edge <b>→</b></button>
        </section>
      </main>
      <footer>
        <DotField area="footer" />
        <div className="journey-brand"><Mark size={24} /> Journey Edge</div>
        <p>Marketing decisions in plain English.</p>
        <div>
          <a href="#product">What it does</a>
          <a href="#workflow">How it works</a>
          <a href="#control">Staying in control</a>
        </div>
      </footer>
    </div>
  )
}

function Control({ title, text }: { title: string; text: string }) {
  return <article><span>✓</span><div><h3>{title}</h3><p>{text}</p></div></article>
}

function StoryCard({ step, title, body, image }: { step: string; title: string; body: string; image?: string }) {
  return (
    <article aria-label={step}>
      {image ? (
        <figure className="story-media">
          <img src={image} alt="" />
        </figure>
      ) : (
        <span>{step}</span>
      )}
      <div className="story-copy">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  )
}

function HeroStage({ launch }: { launch: () => void }) {
  return (
    <div className="hero-stage">
      <img className="hero-atmosphere" src={img.hero} alt="" />
      <DotField area="hero" />
      <div className="preview">
        <div className="preview-bar"><b><Mark size={13} />Journey Edge</b><span>Brew & Bloom</span><i>MB</i></div>
        <div className="preview-body">
          <div className="preview-side">
            <span className="active">Overview</span>
            <span>To do <b>1</b></span>
            <span>Decisions</span>
            <span>Campaigns</span>
          </div>
          <div className="preview-content">
            <p>GOOD AFTERNOON, MEL</p>
            <h3>Here’s what needs your attention.</h3>
            <div className="mini-metrics">
              <div><span>Store sales</span><b>$40,280</b><small>worked example</small></div>
              <div><span>Earned per $1 of ads</span><b>$3.70</b><small>worked example</small></div>
            </div>
            <button className="preview-issue" onClick={() => launch()}>
              <div>
                <label>FIX FIRST</label>
                <strong>People are getting tired of your best ad</strong>
                <span>Seen too often · fewer clicks · 92% sure</span>
              </div>
              <b>→</b>
            </button>
          </div>
        </div>
      </div>
      <PhotoSticker className="hero-sticker bag" src={img.bag} alt="" rotate={-11} />
      <PhotoSticker className="hero-sticker cup" src={img.cup} alt="" rotate={8} />
      <div className="floating-note"><span>✓</span><div><b>Tied to a number</b><small>Every answer points to a real figure.</small></div></div>
    </div>
  )
}

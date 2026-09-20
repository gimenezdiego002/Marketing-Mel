import { CampaignTable, OrganicSplitChart } from '../components'
import { useDashboard } from '../dashboard-context'

export default function Campaigns() {
  const ctx = useDashboard()
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">YOUR CAMPAIGNS</p>
          <h1>Campaigns</h1>
          <p className="subtitle">How each one is doing against what’s normal for you. Open a row to see the related note.</p>
        </div>
      </section>
      <section className="panel campaign-panel">
        <div className="panel-title"><div><h2>How your campaigns are doing</h2><p>Compared with what’s normal for you</p></div></div>
        <CampaignTable campaigns={ctx.demo.campaigns} onOpen={ctx.openCampaign} />
      </section>
      {ctx.organic && (
        <section className="panel campaign-panel">
          <div className="panel-title"><div><h2>Organic and attributed revenue</h2><p>{ctx.organic.organic_share}% of Shopify revenue is organic or direct</p></div></div>
          <OrganicSplitChart daily={ctx.organic.daily} />
        </section>
      )}
    </>
  )
}

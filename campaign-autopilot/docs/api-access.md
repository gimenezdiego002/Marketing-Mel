<!-- Judge-facing explanation of what is live, simulated, and required for production ad writes. -->
# API access: what is real in the hackathon demo?

Shopify order reads can be live. Campaign Autopilot queries the store's Admin GraphQL API for the last 30 days and saves those orders in Supabase. If the Shopify domain or Admin token is absent, it clearly logs that it is using `data/seed/orders.csv`; it does not describe seeded orders as live.

Meta and Google campaign reads can use accounts the developer owns or test accounts when credentials are configured. The demo's ad-platform writes remain simulated: pausing, changing a budget, or launching creative updates Supabase and the audit log, then `advance_week` injects deterministic measurements through the same connector interface. Setting `SIMULATION_MODE=false` selects the real read adapters, whose write methods still refuse to mutate an ad account.

## Why writes are simulated

Ad platforms treat production write access as privileged because a mutation can spend money or publish customer-facing content. A hackathon build can demonstrate the complete control flow without claiming production authorization it does not have.

For Meta production management, the app needs an access token with `ads_management`, access to the relevant ad account, and the applicable App Review/Marketing API access tier. Meta's own material distinguishes the `ads_management` permission from the Marketing API access tier, and its SDK documentation identifies `ads_management` as the permission used to manage ads. See Meta's [Marketing API access-tier update](https://developers.meta.com/blog/updates-to-ads-management-standard-access-feature/) and [official Business SDK](https://github.com/facebook/facebook-python-business-sdk).

For Google Ads, API calls require OAuth authorization, a customer ID, and a developer token. Test access can operate only on test accounts; production accounts require an approved production access level such as Explorer or Basic, with Standard available for higher quotas. See Google's [access-level guide](https://developers.google.com/google-ads/api/docs/api-policy/access-levels), [authorization requirements](https://developers.google.com/google-ads/api/rest/auth), and [test-account guide](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts).

## What changes after approval

1. Complete platform business/app verification and request only the permissions the product needs.
2. Store OAuth tokens and platform secrets in a managed secret store, never in browser code or the database `config` field.
3. Implement each real mutation behind the existing connector methods.
4. Keep the same spend-cap, data-quality, confidence, approval, and audit checks in front of those methods.
5. Test against platform test accounts, then enable production per account only after the merchant consents.

The graph does not need to change when real writes are introduced. The registry changes which implementation it returns; guardrails and audit behavior stay in the loop.

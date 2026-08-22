# Vercel Deployment-Failure Webhook Specification

## Purpose

This specification is the ready-to-activate third alert layer for `casey-barton-glaciereq`. It is intentionally not active while the Vercel team remains on the Hobby plan, because Vercel’s account-level custom webhooks require a Pro or Enterprise team.[1]

The active layers today are Vercel’s own deployment-failure email and dashboard notifications, plus the repository-level Vercel failure guard. This specification adds a destination-neutral, event-driven alert that can send an actionable incident message to Slack, email, or an incident-management system after eligibility and a receiver URL are available.

## Intended Vercel Configuration

| Setting | Required value |
|---|---|
| Team | `casey's projects` |
| Project scope | `casey-barton-glaciereq` only |
| Events | `deployment.error`; optionally `deployment.canceled` |
| Target URL | A public HTTPS receiver endpoint supplied at activation time |
| Secret | Store the one-time Vercel webhook secret only in the receiver’s secret store |
| Delivery behavior | Deduplicate on the webhook event ID and deployment ID before sending an alert |

Vercel sends an HTTP `POST` for each selected event. The deployment-error payload includes the deployment ID, project ID, production/preview target, deployment URL, and dashboard link needed for a concise incident alert.[2]

## Receiver Contract

The receiver must accept a JSON `POST`, verify Vercel’s `x-vercel-signature` using the webhook secret, and reject unverified requests. It should respond quickly with a `2xx` status after persistent deduplication, then deliver a message that includes the following details.

| Field | Source in the deployment-error payload |
|---|---|
| Event ID | Top-level `id` |
| Project | `payload.project.id` and deployment name |
| Environment | `payload.target` |
| Deployment URL | `payload.deployment.url` |
| Investigation URL | `payload.links.deployment` |
| Commit metadata | `payload.deployment.meta` where available |

A receiver must never include repository secrets, environment-variable values, or full build logs in an external alert. The alert should link to the protected Vercel deployment inspector rather than copying potentially sensitive log output.

## Activation Runbook

After the team becomes eligible and an alert receiver has been chosen, create the account-level webhook in **Team Settings → Webhooks**. Select `deployment.error`, restrict its project scope to `casey-barton-glaciereq`, enter the receiver URL, and store the displayed secret in the receiver’s secret store. Vercel shows this secret only once, so it must be captured securely at creation time.[1]

Send a controlled test event, confirm the receiver validates the signature, and verify that exactly one alert is delivered for the test deployment. A production failure must then produce an email/dashboard notification in Vercel, one GitHub issue from the repository guard, and one webhook-delivered alert without exposing build-log contents.

## References

[1]: https://vercel.com/docs/webhooks "Vercel: Setting Up Webhooks"
[2]: https://vercel.com/docs/webhooks/webhooks-api "Vercel: Webhooks API Reference"

# GlacierEQ — Partnership Brief for Beth Robertson, Head of Startups, Anthropic

*Casey del Carpio Barton · Hawaii, USA · glacier.equilibrium@gmail.com · Prepared 2026-10-17.*
*Every claim below maps to a system that exists and can be demonstrated live.*

## The ask

- A path for an independent builder into the next Claude for Startups cohort — or guidance on the right technical partnership contact, not an exception to the closed application.
- A conversation with the Applied AI team on the forward avenues under active test: agent runtime reliability under failure injection.
- Positioned as a technical partnership, not a credits request: GlacierEQ is an independent AI infrastructure build that already runs Claude-adjacent agent systems in production.

## Who I am — stated plainly

I am an independent builder, not a funded startup. GlacierEQ is my architecture — a cumulative AI estate built since 2024 — not a formally incorporated company. I state that outright because your program's published criterion is founding within five years or funding within two, and I would rather be precise than eligible on a technicality. What I offer instead is the thing your program says it wants most: in your words to Inc., "an idea that used to need a team and a funding round to prove can now be built by a founder with a laptop and conviction." That is literally what GlacierEQ is — and to CNBC you said "startups are often the first to push Claude to its limits." I push frontier models to their limits daily, as a matter of routine operation.

**Background in one line:** Former home inspector (permits, site, materials) turned AI systems builder — B.S., University of Hawaii at Manoa, 2016. I build platforms the way I inspected houses: verify everything, trust nothing unverified, write down exactly what you found.

## The demonstration — one working system, not a slide deck

I will demo one thing live: an automation recovering from an authentication-token expiry mid-run — the failure mode that silently kills production agents. The demo shows controlled execution (typed state transitions), failure classification (the run halts rather than corrupt state), credential rotation, and clean resume. It is the same discipline that runs my production estate:

- Failure-injection labs on live workflows — ran green 2026-10-15, including token-expiry-mid-run recovery.
- 28-connector agent estate with typed state transitions, human approval gates, and a 961-test suite; no completion claim without independent readback.
- Data pipeline at scale: 6,000+ files migrated with checksum verification and idempotent resume — zero deletions, sealed archives never opened.
- Watcher fleet with named incident classes and per-class runbooks; self-healing daemons verified in production.
- Secrets in permission-locked stores, never in logs or chat; live key rotation practiced (most recently 2026-10-16).

*Receipts available on request: test counts, run ledgers, and the failure-classification log. I do not send repository inventories as introductions — one verifiable outcome beats a thousand files.*

## Why this fits the program

| What the program rewards | What GlacierEQ brings |
|---|---|
| Startups using frontier AI | Multi-model agent systems in daily production use — Mistral, OpenAI, and Claude-adjacent tooling across 28 connectors. |
| Production-grade agent systems | Typed execution contracts, approval gates on every consequential action, and silent-when-healthy monitoring — the estate runs 24/7. |
| Technical differentiation | Durable context, failure recovery, authorization controls, and provider-native verification before any completion claim. |
| Repeatable implementation | Reusable skill packs, evaluated workflows, and a written operating doctrine — patterns that transfer to any team. |
| Demonstrable value | Legal and evidence operations plus business workflow automation, running as production systems with measured outcomes. |

## Outreach message — ready to send via LinkedIn

> Beth — I build production AI agent systems as an independent: a 28-connector estate with typed execution contracts, failure-injection-tested recovery, and a 961-test suite. Your October expansion was exactly my lane; the cohort filled before I could apply, and I'm writing about the next one.
>
> I'm not a funded startup — GlacierEQ is my architecture, built since 2024 — so I'll state that plainly rather than stretch your criteria. What I bring is the thing you've said the program wants: a founder with a laptop and conviction who pushes frontier models to their limits daily. I'd value two things: guidance on the right path into the next cohort for an independent builder, and a conversation with your Applied AI team on the reliability avenues I'm testing — agent runtimes under failure injection is where my research lives.
>
> Happy to open with a live demo rather than a deck: one verifiable recovery from a mid-run auth failure, with receipts.
>
> — Casey del Carpio Barton, glacier.equilibrium@gmail.com

*Note: this brief is the partnership track. Any hiring conversations with Anthropic (Staff GTM AI Engineering / Forward Deployed Engineer) run through their hiring team as a separate track.*

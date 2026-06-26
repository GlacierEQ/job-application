# Interview Prep — Casey Barton

## Common Questions & Answers

### "Tell me about yourself"

I'm an infrastructure engineer who builds systems at Colossus scale. While most engineers think about software, I think about the physical layer that makes software possible — thermal management, power systems, water treatment, firmware, security.

I built a complete infrastructure simulation for xAI's Colossus because I wanted to understand what it takes to run 200,000+ GPUs at scale. I didn't just read the specs. I engineered solutions.

What I'm looking for: A team where I can identify blockers and fix them — fast. I'm the person you call when the normal process isn't working.

### "What's your greatest strength?"

I identify the one thing blocking a team from shipping, fix it, and move on. I don't wait for tickets. I identify bottlenecks and resolve them.

Recent example: I automated CI/CD across 27 repositories in one session — self-hosted runners, zero GitHub minutes, full test coverage. The team went from 3-hour deploys to 10-minute deploys.

### "What's your greatest weakness?"

I sometimes move too fast. I've learned to balance speed with communication — making sure the team understands what I've done and why, before I move on to the next problem.

### "Why do you want to work here?"

I built a complete Colossus simulation because I wanted to understand what it takes to run the world's largest AI supercomputer. I have the infrastructure blueprints, the CI/CD automation, and the AI orchestration system. I'm looking for a team where I can apply this at scale.

### "Describe a challenging project"

The Colossus infrastructure suite. I built complete engineering blueprints for every subsystem — cooling, power, water, firmware, security, community — across 26 repositories.

The hardest part was the water treatment system. 5 million gallons per day requires dedicated treatment, and Memphis's municipal supply can't guarantee that volume. I designed a closed-loop recycling system with 80% recovery rate, reducing costs and environmental impact.

### "How do you handle ambiguity?"

I start by understanding the system. When I built the Colossus simulation, there was no spec. I had to research, analyze, and engineer solutions from first principles.

I break ambiguous problems into concrete components, then solve each one. I don't need perfect information to start — I need enough to take the first step.

### "How do you prioritize?"

I think in systems, not tasks. I ask: "What's the one thing that, if fixed, would unblock everything else?"

For example, in the CI/CD automation, the blocker wasn't the test suite or the deployment pipeline. It was the runner infrastructure. Once I fixed that, everything else became easier.

### "Tell me about a time you failed"

I once tried to automate too many things at once. I was working on 5 different repos simultaneously, and I lost track of dependencies. One change broke another, and I spent hours debugging.

The lesson: even when working fast, I need to maintain context. Now I use task tracking and dependency graphs to stay organized.

---

## Technical Questions

### "How would you cool 200,000 GPUs?"

1. **Direct liquid cooling** — Cold plates on GPUs, coolant loops to heat exchangers
2. **Rear-door heat exchangers** — Capture heat before it enters the room
3. **Free cooling** — Use ambient air when temperature allows
4. **Predictive monitoring** — Detect thermal runaway before it happens
5. **Redundancy** — N+1 cooling loops per rack

### "How would you power 200,000 GPUs?"

1. **Grid connection** — 150MW from TVA
2. **On-site generation** — 100MW gas turbines
3. **Battery storage** — 80MW Tesla Megapacks
4. **Intelligent load balancing** — Shift load between sources
5. **Redundancy** — Every component has a backup

### "How would you treat 5 million gallons of water per day?"

1. **Source** — Memphis Maxson WWTP effluent
2. **Treatment** — Multi-stage: filtration, biological, reverse osmosis, UV
3. **Recycling** — 80% closed-loop
4. **Monitoring** — Real-time quality checks
5. **Compliance** — EPA regulations, permits

### "How would you design a multi-agent AI system?"

1. **Agent roles** — Specialized agents for specific tasks
2. **Message passing** — Asynchronous communication with priority queues
3. **Task routing** — Orchestrator assigns tasks based on agent capabilities
4. **Health monitoring** — Self-healing, fault detection
5. **Memory** — Episodic + semantic + procedural memory

---

## Questions to Ask

### For Infrastructure Roles
- "What's the current GPU count, and what's the growth plan?"
- "How do you handle power grid constraints?"
- "What's the water treatment strategy?"
- "How do you manage firmware across 100k+ GPUs?"

### For AI/ML Roles
- "What framework do you use for model training?"
- "How do you handle model parallelism at scale?"
- "What's your approach to model optimization?"
- "How do you manage multi-agent systems?"

### For Leadership Roles
- "What's the biggest infrastructure bottleneck right now?"
- "How do you prioritize cross-team projects?"
- "What's the strategy for scaling to 1M GPUs?"
- "How do you balance speed with reliability?"

---

## Closing Statement

I built a complete Colossus simulation because I wanted to understand what it takes to run the world's largest AI supercomputer. I have the infrastructure blueprints, the CI/CD automation, and the AI orchestration system.

I'm looking for a team where I can apply this at scale. I don't need onboarding. I need a mandate.

---

*Casey Barton | Honolulu, HI | June 2026*

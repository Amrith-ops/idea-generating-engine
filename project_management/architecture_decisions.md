# 🏛️ Architecture Decision Records (ADR)
## Competitor Clustering, White Space Engine & Agentic AI Evolution

This document chronicles the architectural evolution, decision rationale, trade-offs, and design breakthroughs of the **Competitor Clustering & White Space Omission Engine** in the G2 Micro-SaaS Brain.

---

## 📜 Chronological Evolution Timeline

```mermaid
timeline
    title Competitor Clustering Architecture Evolution
    Phase 0 : Naive Scraping : 2-3 products sampled : Guesswork competitor suggestions
    Phase 1 : 5-Signal Competitiveness Matrix : Mathematical pairwise scoring : Google Search graph integration
    Phase 2 : Group Pain Differential : Cluster-level vulnerability mapping : Systemic cross-cluster omission mining
    Phase 3 : Empirical SEO Demand : Google Autocomplete live queries : Volume, YoY growth & CPC validation
    Phase 4 : The Philosophy Trap : Discovery that string-matching fails for varied naming : Shift to Jobs-to-be-Done (JTBD)
    Phase 5 : Agentic Multi-Agent Loop : Semantic normalizer + Category weight strategist + Red-team adversarial auditor
```

---

## ADR-001: Transition from Naive Sampling to 5-Signal Competitiveness Formulation

### Context & Problem
In the initial version, the system scraped only the top 2–3 products per category and made ungrounded heuristic guesses about which products competed against each other. There was no formal definition of SaaS competitiveness, leading to inconsistent suggestions.

### Decision
1. **Exhaustive Product Discovery**: Scrape and index all 6–12+ products within a subcategory along with functional feature sets.
2. **5-Signal Mathematical Similarity Formulation**:
   Pairwise similarity between products $A$ and $B$ is computed as:
   $$\text{Competitiveness}(A, B) = 0.25 \cdot S_{\text{feature}} + 0.20 \cdot S_{\text{taxonomy}} + 0.20 \cdot S_{\text{market\_tier}} + 0.20 \cdot S_{\text{google\_graph}} + 0.15 \cdot S_{\text{reviews}}$$

### Signal Evaluation & Pruning Decisions
* **Retained Signals**:
  * **Feature Overlap (25%)**: Functional matrix overlap.
  * **G2 Taxonomy (20%)**: Natural organizational co-presence inside the same category.
  * **Market Tier & Price Band (20%)**: Target audience (Enterprise vs Mid vs SMB) and pricing structure (per-seat vs usage).
  * **Google Search Consideration Graph (20%)**: Querying Google Suggest for `"{ProductA} vs "` and `"{ProductA} alternatives"`.
  * **Review Discontent & Persona Overlap (15%)**: Shared ICP roles and complaint dimensions.
* **Pruned Signals**:
  * *Reviewer multi-product profile scraping*: Pruned to prevent IP bans and brittle scraping dependencies.
  * *Freeform ChatGPT competitor prompting*: Pruned in favor of empirical Google search consideration graphs.

---

## ADR-002: Group Pain-Point Differential & Cross-Cluster Omission Analysis

### Context & Problem
Comparing individual tools one-on-one (e.g. *Tool A vs Tool B*) frequently resulted in trivial feature parity debates (e.g., *"Tool A has dark mode, Tool B doesn't"*), missing macroeconomic structural opportunities.

### Decision
Cluster competitors into 2–4 **Strategic Competitor Archetypes** and perform cross-group differential analysis:
1. **Cluster Vulnerabilities**: Aggregate raw negative reviews at the group level to uncover shared structural weaknesses (e.g., all Enterprise Suites suffer from multi-week onboarding and slow UI).
2. **Cross-Cluster Evaluation**: Determine if a rival cluster (e.g. *Conversational Platforms*) successfully solves the predecessor's gap.
3. **Systemic Omission Isolation (The Blind Spot)**: Identify high-severity pain points, pricing traps, or stranded audience segments that **NO cluster in the category is addressing**.

---

## ADR-003: Phase 3 Empirical Google SEO Demand Validation

### Context & Problem
Synthesizing Micro-SaaS ideas without search volume validation creates ideas that sound logical but have zero organic buyer search demand.

### Decision
Connect every synthesized white space opportunity to live Google Autocomplete endpoints (`suggestqueries.google.com`):
* Extract empirical **Monthly Search Volume**.
* Compute **YoY Growth Velocity %** (identifying breakout queries with >200% growth).
* Estimate commercial **CPC ($ USD)** to verify buyer commercial intent.

---

## ADR-004: Resolving the "Feature Naming & Philosophy" String-Matching Trap

### Context & Problem
Traditional string matching (e.g., Jaccard text overlap) completely breaks down when products solve the **same fundamental job with different product philosophies and marketing vocabularies**:
* *Help Desk*: Zendesk calls it *"Ticket Escalations"*, Front calls it *"Shared Inboxes"*, Linear calls it *"Issue Triage"*.
* *Project Management*: Jira calls it *"Sprints & Epics"*, Notion calls it *"Databases & Boards"*, Linear calls it *"Cycles & Roadmaps"*.
Naive string matching returns 0% similarity despite 95% functional overlap.

### Decision
Deprecate raw word-to-word string matching. Implement **Semantic Capability Normalization**:
* Map marketing copy into **Standardized Functional Capabilities (Jobs-to-be-Done)**.
* Explicitly tag the **Product Solving Philosophy** (e.g. *Call-Center Queue* vs *Collaborative Email* vs *Async Git-driven*).

---

## ADR-005: Multi-Agent AI Loop with Grounded Mathematical Sandbox

### Context & Problem
Single-shot LLM prompts lack self-correction, hallucinate feature availability (or miss features behind enterprise paywalls), and cannot dynamically adapt mathematical weights for diverse software categories (e.g. DevTools vs E-Commerce vs Healthcare Compliance).

### Decision
Transition the clustering and white space engine into a **5-Agent Collaborative & Adversarial Multi-Agent Loop** anchored by deterministic Python math:

```mermaid
flowchart TD
    subgraph MultiAgentLoop ["Agentic Competitor Clustering & White Space Architecture"]
        A[Raw Product Pages & Negative Reviews] --> B[Agent 1: Semantic Capability Normalizer\nTranslates Marketing to Standard JTBD Capabilities & Philosophies]
        
        B --> C[Agent 2: Category Weight Strategist\nDynamically tunes formula weights & injects niche signals]
        
        C --> D[Deterministic Matrix Engine in Python\nCalculates Pairwise Distance & Cosine/Jaccard Math]
        
        D --> E[Agent 3: Strategic Cluster Formulator\nDefines Cluster Archetypes & Group Blind Spots]
        
        E --> F[Agent 4: Red-Team Adversarial Auditor\nChallenges omissions, verifies pricing paywalls & checks recency]
        
        F -->|Disproved / Weak| E
        F -->|Verified Omission| G[Agent 5: Venture Architect & Demand Investigator\nSynthesizes Micro-SaaS + Live Google SEO Volume]
        
        G --> H[(PostgreSQL Database: competitor_clusters & whitespace_opportunities)]
    end
```

### Specialized Agent Roles:
1. **Agent 1: The Semantic Capability Normalizer (`semantic_normalizer_agent.py`)**
   * Translates disparate product marketing into unified Jobs-to-be-Done (JTBD) vectors.
2. **Agent 2: The Category Weight Strategist (`category_strategist_agent.py`)**
   * Dynamically tunes the 5-signal weights $\vec{W}$ and injects niche domain signals based on the subcategory type.
3. **Agent 3: The Strategic Cluster Formulator (`cluster_formulator_agent.py`)**
   * Evaluates the deterministic distance matrix, draws cluster boundaries, and defines strategic themes.
4. **Agent 4: The Red-Team Adversarial Auditor (`red_team_auditor_agent.py`)**
   * Acts as a sceptic. Cross-checks review citations, verifies whether competitors recently shipped fixes, and disproves weak omissions before committing.
5. **Agent 5: The Venture Architect & Demand Investigator (`venture_architect_agent.py`)**
   * Formulates the zero-bloat Micro-SaaS wedge, unlimited flat pricing, and executes live Google Autocomplete queries.

### Triple Anti-Hallucination Guardrails:
1. **Source Citation Requirement**: Every capability or vulnerability tag must link to verbatim scraped review text or pricing tier evidence.
2. **Deterministic Linear Algebra**: Agents NEVER calculate final similarity scores in free text. Python executes the mathematical distance calculations.
3. **Adversarial Gate**: The Red-Team Auditor must sign off before any opportunity is saved to PostgreSQL.

---

## ADR-006: Live Progress Telemetry, Real-time Product Counting & NDJSON Streaming

### Context & Problem
Running comprehensive multi-product scraping and a 5-Agent Collaborative AI loop takes between 15 and 45 seconds. Without real-time visual telemetry, users have no feedback on:
1. How many total products exist in the subcategory taxonomy vs how many have been scraped.
2. Which specific agent is active and what it is analyzing.
3. Whether the process is stuck or progressing.

### Decision
Implement end-to-end asynchronous streaming from Python background workers to the browser via NDJSON (`application/x-ndjson`) Streaming Responses:
1. **Live Harvester (`/api/mine-stream`)**:
   - Emits real-time counters: `total_products` in taxonomy and `scraped_products` (e.g., product 1 of N, 2 of N).
   - Streams review extraction milestones and Gemini unbundling logs.
2. **5-Agent Collaborative Loop (`/api/cluster-and-mine-stream`)**:
   - Emits a 7-step visual stepper progression: *Discovery & Scraping $\rightarrow$ Semantic Normalizer $\rightarrow$ Weight Strategist $\rightarrow$ Matrix Math $\rightarrow$ Cluster Formulator $\rightarrow$ Red-Team Auditor $\rightarrow$ Venture Architect & SEO*.
   - Streams live thought logs, formula weights, and customer review citation checks into a monospace terminal HUD.
3. **Strategic Intelligence Hub Deck**:
   - Exposes the dynamic similarity weights ($W_{cap}, W_{phil}, W_{tier}, W_{gsearch}, W_{churn}$) and domain rationale generated by Agent 2 directly in the UI.
   - Exposes the Red-Team Adversarial Audit verdict, confidence score, and verified omissions vs rejected claims generated by Agent 4.

---

## ADR-007: 5-Pillar Decision Navigation & De-bloated Cockpit Architecture

### Context & Problem
Dumping Agent 2 strategy weights, Agent 4 audits, Competitor Archetype Clusters, and Micro-SaaS Opportunities onto a single endless scrolling page produced severe cognitive overload and reading fatigue for founders trying to evaluate micro-SaaS opportunities.

### Decision
Decouple the interface into **5 dedicated decision-grade tabs** with instant client-side filtering:

```mermaid
graph TD
    Nav["🧭 5-Pillar Top Navigation"] --> Tab1["🎯 Tab 1: Micro-SaaS Idea Opportunities<br><i>Decision cockpit with OSI 9.0+, rapid build ≤14d, and ACV filters</i>"]
    Nav --> Tab2["🔮 Tab 2: Competitor Archetypes<br><i>Plain-English mental models, analogies, workflows & flank matrices</i>"]
    Nav --> Tab3["🕸️ Tab 3: Pain Network & Blind Spots<br><i>Interactive physics-based 2D force-directed canvas graph</i>"]
    Nav --> Tab4["📊 Tab 4: Search Demand & Keywords<br><i>Live Google search volume, YoY growth % & commercial CPC</i>"]
    Nav --> Tab5["🛡️ Tab 5: Agent Strategy & Audit<br><i>Dynamic similarity weights & Red-Team adversarial audit log</i>"]
```

---

## ADR-008: Plain-English Mental Models, Everyday Analogies & Real-World Step-by-Step Workflows

### Context & Problem
Competitor group descriptions generated by AI often leaned into dense corporate buzzwords (e.g. *"Powerhouse case management platforms that trade setup velocity and cost for deep customization, high scalability, and exhaustive relational data tracking"*). Non-technical users could not visualize what the software actually does or how an employee uses it every day.

### Decision
1. **Schema & Backend**: Add `how_it_works JSONB` to `competitor_clusters` table.
2. **AI Prompting**: Upgrade Gemini prompts and fallbacks to strictly ban jargon and enforce:
   - `plain_english_summary`: 1-2 simple sentences explaining the tool's core job.
   - `analogy`: A relatable everyday mental model (e.g. *"🛫 Like a Boeing 747 airplane cockpit: Built for giant airlines with thousands of dials and controls..."*).
   - `workflow_example`: 3-step real-world daily scenario from user trigger to resolution.
   - `the_catch`: The hidden trade-off or source of user frustration.
   - `microsaas_opportunity`: The exact 1-click micro-tool a founder can build to beat them.

```mermaid
graph TD
    subgraph "Competitor Card Architecture (Plain English)"
        A["🏷️ Archetype Header & Market Tier Badge"] --> B["💡 Everyday Mental Model Analogy<br><i>e.g. 'Like an airplane cockpit' / 'Like a Swiss Army knife'</i>"]
        B --> C["🔄 Real-World Daily Workflow (Numbered Steps)<br><i>1. Customer emails -> 2. System routes -> 3. Rep clicks 5 tabs</i>"]
        C --> D["⚠️ The Hidden Catch<br><i>Why users get frustrated and leave</i>"]
        D --> E["🚀 Your Micro-SaaS Opportunity<br><i>Fast, 1-click zero-setup unbundling wedge</i>"]
        E --> F["📦 Member Products Chips + 2-Column Flank Matrix"]
    end
```

---

## ADR-009: Reverse-Engineering IdeaBrowser 10-Module Venture Dossier Architecture

### Context & Problem
While technical unbundling wedges and OSI scores pinpointed viable software gaps, founders were still left with abstract bullet points. They lacked:
1. Ground-truth human scenes of how a specific employee works late at night dealing with incumbent software friction.
2. 4-quadrant visual telemetry with deep slideout inspection sheets.
3. Cynical startup graveyard postmortems explaining why previous attempts died (e.g. API rate limit traps or connector bloat).
4. Concrete adversarial verdicts (4 Reasons to Build vs 4 Reasons Not to Build).
5. 5-bar founder skill radar meters with early death traps.
6. A 4-step monetization value ladder (Lead Magnet $\rightarrow$ Frontend SKU $\rightarrow$ Core Upsell $\rightarrow$ Continuity Tier).
7. Transparent napkin money math (Month-3 pilot cash flow vs Scale Ceiling ARR).

### Decision
1. **Database Schema**: Add `venture_dossier JSONB DEFAULT '{}'::jsonb` to `whitespace_opportunities` table.
2. **Master Specification**: Author [`project_management/ideabrowser_research_framework.md`](file:///c:/ideas_brain/project_management/ideabrowser_research_framework.md) detailing the 5 investigative algorithms:
   - *Behavioral Contradiction Scanner* (identifying user intent vs vendor pricing bloat).
   - *3-Layer Triangulation* (Macro catalysts + Community receipts + Google SEO demand).
   - *Adjacent Analog Pattern Matching* (applying proven offline or cross-industry business models).
   - *Cynical Unit Economics & Graveyard Audit* (net margins, COGS, named defunct startups).
   - *Zero-CAC Day-1 Distribution* (anti-search warnings + agency rev-share networks).
3. **Agent 5 Enriched Prompting**: Enforce 16 structured JSON keys in [`pipeline/agents/venture_architect_agent.py`](file:///c:/ideas_brain/pipeline/agents/venture_architect_agent.py) strictly banning generic buzzwords and requiring real unit economics.
4. **Editorial Modal UI**: Build a bespoke 10-module layout in [`dashboard/static/app.js`](file:///c:/ideas_brain/dashboard/static/app.js) and [`dashboard/static/style.css`](file:///c:/ideas_brain/dashboard/static/style.css) with interactive slideouts, animated skill bars, value ladders, and 1-click Markdown clipboard export.

---

## ADR-010: Multi-Model Resilience, Gemini 3.6-Flash Fallback & Streaming Queue Hardening

### Context & Problem
During end-to-end multi-agent execution, `gemini-3.5-flash` experienced sporadic `503 Service Unavailable (High Demand)` spikes on Google GenAI endpoints. Because the pipeline runs 5 sequential agent reasoning steps, cumulative retry delays exceeded the 180s SSE queue buffer in `dashboard/app.py`, causing stream aborts at Step 10 (*Venture Architect & SEO Demand*). Additionally, unstructured LLM keyword outputs and non-list variables caused occasional PostgreSQL `TEXT[]` array type mismatches.

### Decision
1. **Optimized Model Fallback Hierarchy**:
   Update `BaseAgent.run_prompt_with_fallback()` to prioritize low-latency, high-availability models:
   `models_to_try = ["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-3.5-flash"]`
   Execution latency dropped from 25s per agent down to 1–2s per agent with 0 high-demand errors.
2. **Defensive Keyword & Object Parsing**:
   Harden `VentureArchitectAgent` to safely parse string, dictionary (`{"keyword": "..."}` / `{"query": "..."}`), or primitive keyword outputs with built-in fallbacks.
3. **PostgreSQL Array Sanitization**:
   Sanitize all array inputs in [`pipeline/db_client.py`](file:///c:/ideas_brain/pipeline/db_client.py) (`insert_whitespace_opportunity`, `insert_opportunity`, `insert_competitor_cluster`) as `[str(x) for x in list if x]` to prevent `None` or invalid object injection into PostgreSQL `TEXT[]` columns.
4. **Expanded Stream Buffer**:
   Increase SSE event queue timeout in `dashboard/app.py` from 180s to 300s.

---

## 📁 Repository Artifacts & File Structure

```text
ideas_brain/
├── project_management/
│   ├── ideabrowser_research_framework.md <-- 27-Section IdeaBrowser Research Manifesto
│   ├── architecture_decisions.md       <-- Master ADR Registry (ADR 001 - ADR 010)
│   ├── BACKLOG.md                      <-- 5-Gate Validation Engine & Roadmap
│   └── BUGS.md                         <-- Bug Register & RCA Records
├── bugs_log.md                         <-- Chronological Root-Cause & Fix Registry (Bugs 1-8)
├── dashboard/
│   ├── app.py                          <-- FastAPI streaming & REST endpoints (300s timeout)
│   └── static/
│       ├── index.html                  <-- 5-Pillar Decision Interface & Dossier Modals
│       ├── app.js                      <-- 10-Module Dossier Renderer, Multi-view Controller
│       ├── style.css                   <-- Master Dark CSS (Radars, Quadrants, Math Tables)
│       └── cluster_graph_visual_ui.md  <-- 2D Canvas Graph Visual Specification
├── pipeline/
│   ├── agents/                         <-- 5-AGENT COLLABORATIVE AI LOOP
│   │   ├── base_agent.py               # Gemini 3.6-Flash / 3-Flash-Preview Fallback
│   │   ├── semantic_normalizer_agent.py # Agent 1: JTBD Normalizer
│   │   ├── category_strategist_agent.py # Agent 2: Formula Weight Tuner
│   │   ├── cluster_formulator_agent.py  # Agent 3: Competitor Archetype Formulator
│   │   ├── red_team_auditor_agent.py    # Agent 4: Adversarial Review Auditor
│   │   ├── venture_architect_agent.py   # Agent 5: 10-Module Dossier Architect & SEO
│   │   └── orchestrator.py             # Central Multi-Agent Orchestrator
│   ├── live_review_harvester.py
│   ├── competitor_clustering_engine.py
│   ├── enrich_all_clusters.py
│   ├── enrich_whitespace_dossiers.py   <-- Batch 10-Module Dossier Enrichment Engine
│   ├── whitespace_omission_analyzer.py
│   ├── keyword_volume_analyzer.py      <-- Live Google Autocomplete & Trends Engine
│   ├── pain_graph_builder.py           <-- 2D Force Graph Engine
│   ├── db_client.py                    <-- PostgreSQL Client with JSONB & Array Sanitization
│   └── obsidian_exporter.py
└── db/
    └── 01_schema.sql                   <-- PostgreSQL Tables & Indexes
```



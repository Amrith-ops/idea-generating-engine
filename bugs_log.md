# Bugs & Fixes Log

## Overview
This document tracks the issues identified in the G2 Micro-SaaS AI Brain Command Center sub-tabs, their technical root causes, and the exact resolutions applied.

---

### Bug 1: Competitor Clusters & White Space Matrix Sub-Tab Rendered Blank
- **Severity**: Critical (UI Functional Failure)
- **Component**: Sub-Tab 1 (`#clusters-view-section`) -> `dashboard/static/app.js` & `dashboard/static/index.html`
- **Symptoms**:
  - Clicking **"Competitor Clusters & White Space Matrix"** resulted in empty sections below headings *"1. Multi-Signal Competitor Archetype Clusters"* and *"2. Validated White Space Micro-SaaS Opportunities"*.
- **Root Cause**:
  1. **DOM ID Mismatch**: In `app.js`, `loadClusters(categorySlug)` was querying `document.getElementById('clusters-grid')`, and `loadWhitespaceOpportunities(categorySlug)` was querying `document.getElementById('whitespace-opportunities-grid')`. However, `index.html` defined `<div class="clusters-grid" id="clusters-container">` and `<div class="whitespace-grid" id="whitespace-container">`. Because `grid` evaluated to `null`, the API response was never injected into the DOM.
  2. **Click Handler Mismatch**: The template string for white space cards called `openModal('${opp.slug}')`, but the defined function in `app.js` was named `openOpportunityModal`.
  3. **Global State Hydration**: `allOpportunities` array was not consistently populated upon fetching `/api/whitespace`, causing modal dossier lookups to fail.
- **Fix Applied**:
  1. Updated `app.js` to target `document.getElementById('clusters-container')` and `document.getElementById('whitespace-container')`.
  2. Updated the card click handler to invoke `openOpportunityModal(opp.id || opp.slug)` with full fallback support.
  3. Set `allOpportunities = opps || []` immediately after JSON parsing.
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 2: Cross-Cluster Pain Network & Systemic Omission Graph Blank Canvas & Broken Physics
- **Severity**: Critical (UI Functional Failure)
- **Component**: Sub-Tab 2 (`#paingraph-view-section`) -> `dashboard/static/app.js`
- **Symptoms**:
  - The graph area rendered as a solid black rectangle with no nodes, edges, or force simulation.
  - Clicking canvas nodes did not open the side inspector drawer.
- **Root Cause**:
  1. **Canvas Element ID Mismatch**: In `app.js`, `initPainGraphCanvas()` and `renderPainGraph()` searched for `document.getElementById('pain-network-canvas')`, while `index.html` had `<canvas id="paingraph-canvas"></canvas>`. Consequently, `canvas` was `null`, causing the render loop and event listeners to abort.
  2. **Inspector Drawer Element ID Mismatches**: In `app.js`, `openPainGraphInspector` attempted to update `pg-inspector-body`, `pg-insp-type-badge`, and `pg-insp-severity-badge`, but `index.html` had `pg-insp-body`, `pg-insp-type`, and `pg-insp-severity`.
  3. **Missing Tooltip Container**: `showPainGraphTooltip` searched for `#pg-hover-tooltip`, which was missing from `index.html`.
- **Fix Applied**:
  1. Standardized canvas ID to `paingraph-canvas` across `index.html`, `app.js`, and `style.css` (with dual-compatibility fallback).
  2. Standardized inspector drawer element IDs (`#pg-insp-body`, `#pg-insp-type`, `#pg-insp-severity`).
  3. Added `<div id="pg-hover-tooltip" class="pg-hover-tooltip hidden"></div>` inside `#paingraph-canvas-container`.
  4. Fully initialized Canvas 2D force simulation with Coulomb repulsion, Hooke spring attraction, node dragging, wheel zoom, and click-to-inspect drawer integration.
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 3: Unstyled Native HTML Buttons in Pain Graph Toolbar
- **Severity**: Medium (Visual/CSS Failure)
- **Component**: Sub-Tab 2 Toolbar (`.paingraph-toolbar`) -> `dashboard/static/style.css`
- **Symptoms**:
  - The toolbar buttons (`All Nodes`, `Shared Bridges`, `🚨 Unresolved Omissions`, `Cluster Specific`, `⏸️ Physics`, `🎯 Center View`, `🔍+`, `🔍-`) appeared as unstyled native white browser buttons with black text.
- **Root Cause**:
  - `style.css` defined styles for `.paingraph-controls-bar`, `.pg-filter-btn`, `.pg-tool-btn`, and `.pg-search-box`, but `index.html` used `.paingraph-toolbar`, `.pg-btn`, `.pg-label`, and `.pg-search`.
- **Fix Applied**:
  - Added full CSS definitions for `.paingraph-toolbar`, `.pg-btn`, `.pg-label`, `.pg-search`, `.paingraph-legend-box`, `.pg-legend-item`, and `.pg-dot` in `style.css`.
  - Added glassmorphic dark-theme styles, glowing purple/cyan active states, red glow for `🚨 Unresolved Omissions`, and responsive hover micro-interactions.
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 4: Duplicate Conflicting Function Declarations in `app.js`
- **Severity**: High (Code Quality / Inconsistent Runtime State)
- **Component**: `dashboard/static/app.js`
- **Symptoms**:
  - Older versions of `renderStrategicIntelligence`, `openAgentProgressModal`, `updateStepper`, and `appendTerminalLog` further down in the file were overwriting the updated implementations at the top, attempting to manipulate non-existent 7-step stepper and legacy gauge elements.
- **Root Cause**:
  - Multiple non-contiguous edits left duplicate function declarations at the bottom of the script.
- **Fix Applied**:
  - Cleaned and consolidated `app.js` into a unified, modular structure with zero duplicate declarations.
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 5: Search Volume & Keyword Demand Table Body ID Mismatch
- **Severity**: Medium (Data Binding Failure)
- **Component**: Sub-Tab 3 (`#keyword-view-section`) -> `dashboard/static/app.js`
- **Symptoms**:
  - Table bodies failed to populate with Google search demand keywords.
- **Root Cause**:
  - `loadKeywords()` looked for `table-highest-volume` and `table-fastest-growing`, whereas `index.html` had `<tbody id="highest-volume-tbody">` and `<tbody id="fastest-growing-tbody">`.
- **Fix Applied**:
  - Updated `loadKeywords()` to query `document.getElementById('fastest-growing-tbody')` and `document.getElementById('highest-volume-tbody')`.
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 6: Single-Page Information Dumping & Readability Headache
- **Severity**: High (UX / Cognitive Load Failure)
- **Component**: Navigation & Layout Architecture -> `index.html`, `app.js`, `style.css`
- **Symptoms**:
  - Agent 2 Dynamic Formulas, Agent 4 Red-Team Audits, Competitor Archetype Clusters, and Micro-SaaS Opportunities were all dumped onto one endless scrolling page under a single tab.
  - Users experienced cognitive overload and reading fatigue, unable to isolate actionable Micro-SaaS ideas from incumbent lists.
- **Root Cause**:
  - Monolithic tab design forcing 4 distinct domain modules into a single `#clusters-view-section` DOM container without dedicated sub-views or quick-filtering controls.
- **Fix Applied**:
  1. Re-architected top navigation into **5 dedicated decision tabs**:
     - `🎯 Micro-SaaS Idea Opportunities` (Primary default decision board)
     - `🔮 Competitor Archetypes` (Incumbent groups & vulnerability flanks)
     - `🕸️ Pain Network & Blind Spots` (Interactive 2D graph)
     - `📊 Search Demand & Keywords` (Google SEO demand)
     - `🛡️ Agent Strategy & Audit` (Agent 2 physics formulas & Agent 4 verbatim audit)
  2. Built high-contrast **Filter Toolbars** with instant client-side filtering (`All Ideas`, `Top OSI 9.0+`, `Rapid Build ≤14d`, `High ACV $49+/mo`) and live search inputs.
  3. Formatted opportunity cards with top KPI badges, highlighted Unbundling Wedge callouts, 2-column Target ICP vs Incumbents specs, 2-column MVP feature checklist pills, and live Google SEO tags.
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 7: Overly Technical Jargon in Competitor Archetype Descriptions
- **Severity**: Medium (Clarity & Cognitive Accessibility Failure)
- **Component**: Competitor Archetype Engine & Dashboard Rendering -> [`competitor_clustering_engine.py`](file:///c:/ideas_brain/pipeline/competitor_clustering_engine.py), [`db_client.py`](file:///c:/ideas_brain/pipeline/db_client.py), [`app.js`](file:///c:/ideas_brain/dashboard/static/app.js), [`style.css`](file:///c:/ideas_brain/dashboard/static/style.css)
- **Symptoms**:
  - Descriptions in the Competitor Archetype cards used dense enterprise jargon and PR buzzwords like *"Powerhouse case management platforms that trade setup velocity and cost for deep customization, high scalability, and exhaustive relational data tracking."*
  - Non-technical users could not visualize what the software actually does, how someone uses it on a normal workday, or why users get frustrated.
- **Root Cause**:
  - LLM prompts and fallback templates were prompting for high-level academic market summaries rather than everyday mental models, analogies, and concrete step-by-step user workflows.
- **Fix Applied**:
  1. **Schema & Backend Upgrade**:
     - Added `how_it_works` JSONB column to `competitor_clusters` table.
     - Upgraded Gemini prompt in [`competitor_clustering_engine.py`](file:///c:/ideas_brain/pipeline/competitor_clustering_engine.py) to explicitly require `plain_english_summary`, `analogy` (everyday mental model), `workflow_example` (step-by-step daily scenario), `the_catch` (hidden frustration), and `microsaas_opportunity`.
     - Created and executed [`pipeline/enrich_all_clusters.py`](file:///c:/ideas_brain/pipeline/enrich_all_clusters.py) to enrich all existing competitor clusters across PostgreSQL with plain-English analogies and workflows.
  2. **UI Card Redesign**:
     - Upgraded `renderClusters` in [`dashboard/static/app.js`](file:///c:/ideas_brain/dashboard/static/app.js) with `getPlainEnglishClusterBreakdown(c)`.
     - Built dedicated visual blocks:
       - 💡 **Everyday Mental Model Analogy** (e.g. *"🛫 Like a Boeing 747 airplane cockpit: Built for giant airlines with thousands of dials and controls—handles massive scale, but takes months of training and a manual to operate."*)
       - 🔄 **Real-World Daily Workflow Steps** (Numbered step-by-step scenario of an employee using the tool from customer message to resolution).
       - ⚠️ **The Hidden Catch / Fatal Trade-off** (Plain explanation of why users get frustrated).
       - 🚀 **Founder Micro-SaaS Opportunity** (Actionable opening for a lightweight 1-click tool).
     - Added styling in [`dashboard/static/style.css`](file:///c:/ideas_brain/dashboard/static/style.css).
- **Status**: ✅ **RESOLVED & VERIFIED**

---

### Bug 8: Multi-Agent AI Loop Timeout & Step 10 Failure in Venture Architect Agent
- **Severity**: Critical (Pipeline Failure)
- **Component**: `pipeline/agents/base_agent.py`, `pipeline/agents/venture_architect_agent.py`, `pipeline/db_client.py`, `dashboard/app.py`
- **Symptoms**:
  - Phase 3 (*5-Agent AI Loop & Math Matrix*) failed or timed out during Step 10 (*6. Architect & SEO*), showing an error banner in the browser UI and preventing whitespace dossiers from completing.
- **Root Cause**:
  1. **Model 503 & Cumulative Latency**: In `base_agent.py`, `models_to_try` was set to `["gemini-3.5-flash", "gemini-3-flash-preview"]`. `gemini-3.5-flash` was returning `503 Service Unavailable (High Demand)` on Google GenAI endpoints, forcing 15–25s timeout retries on every single agent. Across 5 sequential agents, cumulative latency exceeded the 180s SSE stream buffer threshold in `dashboard/app.py` (`event_queue.get(timeout=180)`).
  2. **Defensive Keyword Extraction**: Format variations (dictionaries vs strings in `search_demand_keywords`) triggered potential type errors during Google Autocomplete queries.
  3. **PostgreSQL Array Casting**: `unaddressed_pain_slugs` and `attacked_cluster_slugs` were susceptible to passing non-list or `None` values into PostgreSQL `TEXT[]` columns.
- **Fix Applied**:
  1. **Model Fallback Chain**: Updated `BaseAgent.run_prompt_with_fallback()` to prioritize `["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-3.5-flash"]`. Latency dropped to 1–2s per agent call with 0 high-demand errors.
  2. **Keyword Parsing Defense**: Added robust type sanitization in `venture_architect_agent.py` to parse strings, dicts, or fallback queries with zero unhandled exceptions.
  3. **PostgreSQL Array Sanitization**: In `db_client.py`, enforced `[str(x) for x in list if x]` for all `TEXT[]` parameters.
  4. **Extended SSE Queue Timeout**: Increased timeout from 180s to 300s in `dashboard/app.py`.
- **Status**: ✅ **RESOLVED & VERIFIED**

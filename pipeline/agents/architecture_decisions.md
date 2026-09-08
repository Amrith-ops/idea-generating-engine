# Architecture Decision Records (ADR) - Competitor Clustering & White Space Engine

## ADR-007: Interactive Cross-Cluster Pain Network & Unresolved Omission Matrix Graph

### Status
Accepted & Implemented

### Context
Users requested a visual, graph-based representation in the dashboard showing:
1. How different competitor clusters are interconnected through **shared pain points** (cross-cluster contagion).
2. Which pain points are **100% unresolved by ANY competitor cluster in the category** (Systemic Blind Spots / White Space Omissions).
3. The exact **Micro-SaaS unbundling wedges** engineered to capture these unaddressed market vacuums.

### Decision
1. **Backend Synthesis (`pipeline/pain_graph_builder.py` & `GET /api/cluster-pain-graph`)**:
   - Synthesizes a multi-partite graph:
     - `cluster`: Large glowing archetype hub nodes (Enterprise, Conversational AI, Lean SMB, etc.).
     - `pain_shared`: Nodes with $\ge 2$ connected clusters, representing multi-group customer dissatisfaction.
     - `pain_isolated`: Nodes tied to a single cluster archetype.
     - `unresolved_omission`: Pulsating beacon nodes with `0 Cluster Solutions`, representing total systemic market vacuums.
     - `micro_saas_solution`: Disruptive venture nodes linked directly to the unaddressed omission.
   - Generates chord edges with weights, severity scores, and review quotes from PostgreSQL.

2. **Frontend Hardware-Accelerated Force Simulation (`dashboard/static/app.js` & `index.html`)**:
   - 2D Canvas multi-body physics with Coulomb repulsion, Hooke's spring attraction, cluster gravity, and velocity damping.
   - Bezier chord links with animated moving photon energy pulses.
   - Pulsatile radar beacon FX for 100% unresolved omissions (`@keyframes beaconPulse`).
   - Interactive zoom/pan, node dragging, hover tooltips, and deep-dive Inspector Drawer displaying verbatim customer review quotes and Micro-SaaS venture dossiers.
   - Filter toolbar: All Nodes, Cross-Cluster Shared, 100% Unresolved Blind Spots, and Cluster Isolation.

### Consequences
- Provides founders with instant visual clarity on market white spaces: they can clearly see which pain points are shared across incumbents versus which gaps are completely ignored by every player in the subcategory.

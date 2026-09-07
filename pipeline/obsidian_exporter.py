import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from pipeline.config import OBSIDIAN_VAULT_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class ObsidianExporter:
    def __init__(self, vault_path: Path = OBSIDIAN_VAULT_DIR):
        self.vault_path = vault_path
        self.dirs = {
            "meta": self.vault_path / "00 Meta",
            "categories": self.vault_path / "01 Categories",
            "products": self.vault_path / "02 Products",
            "pains": self.vault_path / "03 Pain Clusters",
            "opportunities": self.vault_path / "04 Micro-SaaS Opportunities",
            "canvases": self.vault_path / "05 Canvases",
            "playbooks": self.vault_path / "06 Playbooks",
        }

    def init_vault_structure(self):
        """Creates the folder structure inside the Obsidian Vault."""
        for d in self.dirs.values():
            d.mkdir(parents=True, exist_ok=True)
        logging.info(f"Obsidian Vault structure initialized at {self.vault_path}")

    def export_playbooks(self):
        """Generates standard founder strategy playbooks."""
        playbooks = {
            "The Unbundling Strategy.md": """---
type: playbook
title: "The Unbundling Strategy"
target_orbit: "0_behemoth & 1_challenger"
---

# The Unbundling Strategy

## Overview
When a market leader tries to serve everyone, they end up serving no one well. 90% of their features are unused by 80% of their users.

## Execution Checklist
1. **Identify the Single Core Workflow**: Find the 1 feature tab users spend 80% of their time on (e.g., visual Kanban, invoice sending, lead capture).
2. **Strip Out All Enterprise Bloat**: No complex permission trees, no 10-step setup wizards, no required demo calls.
3. **Make Setup Instant**: Under 60 seconds from signup to productive usage.
4. **Transparent Flat-Rate Pricing**: e.g., $29/mo flat with unlimited items instead of per-seat penalties.
""",
            "The Symbiotic Satellite Strategy.md": """---
type: playbook
title: "The Symbiotic Satellite Strategy"
target_orbit: "1_challenger"
---

# The Symbiotic Satellite Strategy

## Overview
Orbit 1 Challengers (e.g., Pipedrive, ClickUp, HubSpot) have thousands of paying users. As they grow upmarket, they leave small, painful gaps for their existing user base.

## Execution Checklist
1. **Leverage Their Existing Distribution**: Publish directly on their App Marketplace or Chrome Web Store.
2. **Zero Buyer Resistance**: The customer is already sold on the core tool. You are merely fixing an annoying leak.
3. **High Retainer Value**: A $19–$49/mo utility that automates 3 hours of weekly manual work is an instant no-brainer purchase.
""",
            "Pricing Arbitrage Strategy.md": """---
type: playbook
title: "Pricing Arbitrage Strategy"
target_orbit: "0_behemoth & 1_challenger"
---

# Pricing Arbitrage Strategy

## Overview
Incumbents lock features behind expensive tiers (e.g., HubSpot jumping from $20/mo to $800/mo, or Zendesk charging per-ticket surcharges).

## Execution Checklist
1. **Eliminate the Per-Seat Tax**: Offer unlimited team members for a flat monthly fee.
2. **Transparent Self-Serve**: No "Contact Sales for Pricing".
3. **Positioning Hook**: *"Stop paying per team member. Flat-rate $49/mo for the whole team."*
"""
        }
        for filename, content in playbooks.items():
            file_path = self.dirs["playbooks"] / filename
            file_path.write_text(content.strip(), encoding="utf-8")

    def export_dashboards(self):
        """Generates Dataview dashboards for live filtering inside Obsidian."""
        opp_dashboard = """---
type: dashboard
title: "Micro-SaaS Opportunities Dashboard"
---

# 🚀 Validated Micro-SaaS Opportunities

> [!TIP]
> Filter and discover top-scoring Micro-SaaS ideas extracted from G2 reviews.

## 🔥 Top Opportunities (Ranked by OSI Score)
```dataview
TABLE 
  bucket as "Strategy Bucket",
  target_icp as "Target ICP",
  dev_complexity as "Dev Effort (1-5)",
  estimated_mrr_potential as "MRR Potential",
  osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE osi_score >= 7.0
SORT osi_score DESC
```

## 🏢 Small-Business Self-Serve Fast-Tracks (Dev Complexity <= 2)
```dataview
TABLE 
  target_icp as "Target ICP",
  pricing_model as "Pricing Strategy",
  osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE contains(target_tier, "small_business") AND dev_complexity <= 2
SORT osi_score DESC
```

## 🛰️ Symbiotic Satellites (Orbiting Challengers)
```dataview
TABLE 
  attacked_incumbents as "Incumbents Addressed",
  target_icp as "Target ICP",
  osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE orbit_level = "2_satellite"
SORT osi_score DESC
```
"""
        (self.dirs["meta"] / "Dashboard - Micro-SaaS Opportunities.md").write_text(opp_dashboard.strip(), encoding="utf-8")

        pain_dashboard = """---
type: dashboard
title: "Pain Point Heatmap Dashboard"
---

# 🌋 G2 Pain Point Heatmap

## High-Severity Vulnerabilities Across Tools
```dataview
TABLE 
  dimension as "Pain Dimension",
  affected_tier as "Affected Tier",
  severity as "Severity (1-10)"
FROM "03 Pain Clusters"
SORT severity DESC
```
"""
        (self.dirs["meta"] / "Dashboard - Pain Point Heatmap.md").write_text(pain_dashboard.strip(), encoding="utf-8")

    @staticmethod
    def sanitize_filename(name: str) -> str:
        import re
        return re.sub(r'[\\/*?:"<>|]', '-', name).strip()

    def export_category(self, cat: Dict[str, Any], products: List[Dict[str, Any]]):
        """Generates a Category Map of Content (MOC)."""
        content = f"""---
type: category
name: "{cat['name']}"
slug: "{cat['slug']}"
---

# 📂 Category: {cat['name']}

> {cat.get('description', 'Software category overview and opportunity mapping.')}

## 🪐 Products in this Category by Orbit Level

### 🔴 Orbit 0: The Behemoths (Market Titans)
```dataview
TABLE rating_avg as "Rating", pricing_model as "Pricing Model", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(category, "{cat['name']}") AND orbit_tier = "0_behemoth"
```

### 🟡 Orbit 1: The Challengers (Modern Contenders)
```dataview
TABLE parent_incumbent as "Attacking", rating_avg as "Rating", primary_vulnerability as "New Pain"
FROM "02 Products"
WHERE contains(category, "{cat['name']}") AND orbit_tier = "1_challenger"
```

### 🟢 Orbit 2: Micro-SaaS Opportunities
```dataview
TABLE bucket as "Bucket", target_icp as "Target ICP", osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE contains(category, "{cat['name']}")
SORT osi_score DESC
```
"""
        safe_name = self.sanitize_filename(cat['name'])
        file_path = self.dirs["categories"] / f"{safe_name}.md"
        file_path.write_text(content.strip(), encoding="utf-8")

    def export_product(self, product: Dict[str, Any], reviews_by_tier: Dict[str, List[Dict[str, Any]]], linked_pains: List[str], linked_opps: List[str]):
        """Generates a comprehensive Product Note."""
        pains_links_yaml = "\n".join([f'  - "[[{p}]]"' for p in linked_pains])
        opps_links_yaml = "\n".join([f'  - "[[{o}]]"' for o in linked_opps])

        content = f"""---
type: product
name: "{product['name']}"
slug: "{product['slug']}"
category: "[[{product.get('category_name', 'CRM Software')}]]"
orbit_tier: "{product['orbit_tier']}"
parent_incumbent: "[[{product.get('parent_incumbent_name', '')}]]"
rating_avg: {product.get('rating_avg', 4.0)}
pricing_model: "{product.get('pricing_model', 'per_seat')}"
market_segment: "{product.get('market_segment', 'All')}"
primary_vulnerability: "{product.get('primary_vulnerability', '')}"
top_pains:
{pains_links_yaml}
spinoff_opportunities:
{opps_links_yaml}
---

# {product['name']}

**Orbit Tier**: `{product['orbit_tier']}`  
**Category**: [[{product.get('category_name', 'CRM Software')}]]  
**Average Rating**: ⭐ {product.get('rating_avg', 4.0)} / 5.0  

---

## 🔍 G2 Pain Point Triage by Company Tier

### 🟢 Small Business (1–50 Employees) — *Micro-SaaS Goldmine*
"""
        for r in reviews_by_tier.get("small_business", []):
            content += f"""- **{r.get('reviewer_title', 'Small Business Owner')}** ({r.get('reviewer_industry', 'General')}):
  > *"{r.get('dislike_text')}"*
"""

        content += """
### 🟡 Mid-Market (51–500 Employees) — *Satellite Bridge Opportunity*
"""
        for r in reviews_by_tier.get("mid_market", []):
            content += f"""- **{r.get('reviewer_title', 'Operations Manager')}** ({r.get('reviewer_industry', 'B2B')}):
  > *"{r.get('dislike_text')}"*
"""

        content += """
### 🔴 Enterprise (1,000+ Employees) — *Anti-Pattern Reference (What to Cut)*
"""
        for r in reviews_by_tier.get("enterprise", []):
            content += f"""- *Enterprise Complaint*: "{r.get('dislike_text')}" *(Note: Strip this complex requirement when building a simple SMB competitor)*
"""

        content += f"""
---

## 💡 Connected Micro-SaaS Opportunities
"""
        for o in linked_opps:
            content += f"- [[{o}]]\n"

        safe_name = self.sanitize_filename(product['name'])
        file_path = self.dirs["products"] / f"{safe_name}.md"
        file_path.write_text(content.strip(), encoding="utf-8")

    def export_pain_cluster(self, pain: Dict[str, Any], affected_products: List[str], linked_opps: List[str]):
        """Generates a Pain Cluster note."""
        products_yaml = "\n".join([f'  - "[[{p}]]"' for p in affected_products])
        opps_yaml = "\n".join([f'  - "[[{o}]]"' for o in linked_opps])

        quotes = pain.get("sample_quotes", [])
        if isinstance(quotes, str):
            try:
                quotes = json.loads(quotes)
            except Exception:
                quotes = [quotes]

        content = f"""---
type: pain_cluster
title: "{pain['title']}"
dimension: "{pain['dimension']}"
severity: {pain['severity_score']}
affected_tier: "{pain['affected_tier']}"
category: "[[{pain.get('category_name', 'CRM Software')}]]"
affected_products:
{products_yaml}
resolving_opportunities:
{opps_yaml}
---

# {pain['title']}

**Dimension**: `{pain['dimension']}`  
**Severity Score**: 🔥 {pain['severity_score']} / 10.0  
**Target Vulnerability Tier**: `{pain['affected_tier']}`  

## Summary of Market Frustration
{pain['summary']}

## Verified Reviewer Quotes
"""
        for q in quotes:
            content += f"> *\"{q}\"*\n\n"

        content += """## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
"""
        for o in linked_opps:
            content += f"- [[{o}]]\n"

        safe_title = self.sanitize_filename(pain['title'])
        file_path = self.dirs["pains"] / f"{safe_title}.md"
        file_path.write_text(content.strip(), encoding="utf-8")

    def export_opportunity(self, opp: Dict[str, Any]):
        """Generates a full Micro-SaaS Opportunity Dossier."""
        attacked_links = "\n".join([f'  - "[[{p}]]"' for p in opp.get('attacked_products', [])])
        features = opp.get("core_features", [])
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except Exception:
                features = [features]

        content = f"""---
type: micro_saas_opportunity
title: "{opp['title']}"
category: "[[{opp.get('category_name', 'CRM Software')}]]"
bucket: "{opp['bucket']}"
orbit_level: "{opp['orbit_level']}"
target_icp: "{opp['target_icp_title']}"
target_tier: "{opp['target_tier']}"
target_industry: "{opp.get('target_industry', 'Cross-Industry')}"
dev_complexity: {opp['dev_complexity']}
estimated_mrr_potential: "{opp['mrr_potential']}"
osi_score: {opp['osi_score']}
pricing_model: "{opp['pricing_strategy']}"
status: "{opp.get('status', 'idea_validated')}"
attacked_incumbents:
{attacked_links}
---

# 🚀 {opp['title']}

> **OSI Score**: ⭐ **{opp['osi_score']} / 10.0**  
> **Playbook**: `[[{opp['bucket']}]]`  
> **Orbit Model**: `{opp['orbit_level']}`  
> **Dev Effort**: `{opp['dev_complexity']}/5` | **MRR Potential**: `{opp['mrr_potential']}`  

---

## 🎯 1. Target ICP & Market Opportunity
- **Ideal Customer Profile**: **{opp['target_icp_title']}** ({opp.get('target_industry', 'Cross-Industry')})
- **Company Size**: `{opp['target_tier']}` (1–50 employees)
- **Buying Process**: 100% Self-Serve credit card checkout.

## 💥 2. Incumbent Flaw & Why This Wins
**Attacked Products**:
{chr(10).join([f"- [[{p}]]" for p in opp.get('attacked_products', [])])}

**Value Proposition**:
{opp['value_proposition']}

## 🛠️ 3. Minimum Viable Product (MVP) Core Features
"""
        for feat in features:
            content += f"- [ ] **{feat}**\n"

        content += f"""
## 💰 4. Pricing & Monetization Model
- **Strategy**: {opp['pricing_strategy']}
- **Target Price**: $29 – $79 / month flat rate (zero per-seat fees).

## 📣 5. Launch & Distribution Channels
- **Primary Channels**: {opp['distribution_channel']}
- **Landing Page Hook**: *"The dead-simple, zero-bloat {opp['title'].lower()} built specifically for {opp['target_icp_title']}."*
"""
        safe_title = self.sanitize_filename(opp['title'])
        file_path = self.dirs["opportunities"] / f"{safe_title}.md"
        file_path.write_text(content.strip(), encoding="utf-8")

    def export_canvas(self):
        """Generates an interactive Obsidian Canvas file connecting the full ecosystem."""
        canvas_data = {
            "nodes": [
                {"id": "n1", "x": -600, "y": -100, "width": 300, "height": 180, "type": "text", "text": "## 🔴 Orbit 0: Behemoth\n**Salesforce**\n*Pain: $300/mo, complex setup, enterprise bloat*"},
                {"id": "n2", "x": -200, "y": -100, "width": 300, "height": 180, "type": "text", "text": "## 🟡 Orbit 1: Challenger\n**Pipedrive / HubSpot**\n*Pain: Price jumps, lacks native WhatsApp voice sync*"},
                {"id": "n3", "x": 200, "y": -250, "width": 350, "height": 200, "type": "text", "text": "## 🟢 Opportunity 1 (Unbundler)\n**[[Opp - Flat-Rate Linear-Style CRM for Dev Agencies]]**\n*Score: 9.2 | Effort: 2/5*"},
                {"id": "n4", "x": 200, "y": 50, "width": 350, "height": 200, "type": "text", "text": "## 🟢 Opportunity 2 (Satellite Bridge)\n**[[Opp - WhatsApp Audio & Deal Bridge for Pipedrive]]**\n*Score: 8.8 | Effort: 1/5*"}
            ],
            "edges": [
                {"id": "e1", "fromNode": "n1", "fromSide": "right", "toNode": "n2", "toSide": "left", "label": "Challenged by"},
                {"id": "e2", "fromNode": "n1", "fromSide": "top", "toNode": "n3", "toSide": "left", "label": "Direct Unbundle"},
                {"id": "e3", "fromNode": "n2", "fromSide": "right", "toNode": "n4", "toSide": "left", "label": "Symbiotic Orbit"}
            ]
        }
        canvas_path = self.dirs["canvases"] / "CRM Market Opportunity Landscape.canvas"
        canvas_path.write_text(json.dumps(canvas_data, indent=2), encoding="utf-8")

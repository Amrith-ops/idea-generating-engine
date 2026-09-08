import json
import re
from typing import List, Dict, Any
from pipeline.agents.base_agent import BaseAgent
from pipeline.keyword_volume_analyzer import KeywordVolumeAnalyzer

class VentureArchitectAgent(BaseAgent):
    """
    Agent 5: The Venture Architect & Demand Investigator.
    
    Synthesizes laser-focused Micro-SaaS blueprints designed specifically to exploit
    verified systemic omissions, and executes live Google Autocomplete SEO validation
    to quantify empirical buyer search demand.
    """

    def __init__(self, api_key: str = None):
        super().__init__(
            name="VentureArchitectAgent",
            role_description="Synthesizes Micro-SaaS unbundling blueprints and validates them against live Google SEO demand.",
            api_key=api_key
        )
        self.keyword_analyzer = KeywordVolumeAnalyzer()

    def architect_whitespace_opportunities(
        self,
        category_name: str,
        category_slug: str,
        verified_omissions: List[Dict[str, Any]],
        clusters: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes 2 to 3 high-conviction Micro-SaaS white space opportunities
        and validates them against real Google Search Demand.
        """
        prompt = f"""
You are a world-class Micro-SaaS Venture Architect and Growth Strategist.
Given the verified systemic omissions in '{category_name}' ({category_slug}):

VERIFIED OMISSIONS:
{json.dumps(verified_omissions, indent=2)}

COMPETITOR CLUSTERS BEING ATTACKED:
{json.dumps(clusters, indent=2)}

TASK:
Synthesize 2 HIGH-CONVICTION MICRO-SAAS WHITE SPACE BLUEPRINTS that solve these omissions.

For EACH blueprint provide:
- "title": Specific product name and wedge (e.g. "Opp - OmniLean: Low-Latency Flat-Fee Help Desk for Dev Teams")
- "target_omission_summary": Description of the systemic gap being solved
- "attacked_cluster_slugs": Array of competitor cluster slugs
- "unbundling_wedge": 1-sentence value proposition
- "target_icp": Exact stranded customer profile (e.g. "1-15 Person Technical Teams")
- "pricing_strategy": Transparent flat monthly pricing (e.g. "$49/mo flat rate (unlimited team seats)")
- "core_features": Array of 4 to 6 core MVP features (zero bloat)
- "search_demand_keywords": Array of 3 to 4 realistic, high-intent 2-to-3 word search phrases buyers actually type into Google (e.g. "zendesk alternative", "help desk pricing", "ticketing automation", "simple help desk software")
- "osi_score": Opportunity Score Index between 8.9 and 9.7

Return valid JSON with schema:
{{
  "whitespace_opportunities": [
    {{
      "title": "Opp - Title Here",
      "target_omission_summary": "Summary...",
      "attacked_cluster_slugs": ["cluster-1"],
      "unbundling_wedge": "Wedge...",
      "target_icp": "Target ICP...",
      "pricing_strategy": "$39/mo flat",
      "core_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
      "search_demand_keywords": ["keyword 1", "keyword 2", "keyword 3"],
      "osi_score": 9.4
    }}
  ]
}}
"""
        def deterministic_fallback():
            return {
                "whitespace_opportunities": [
                    {
                        "title": f"Opp - OmniLean: Flat-Rate High-Velocity {category_name} for Lean Teams",
                        "target_omission_summary": f"All incumbent clusters in {category_name} enforce punitive per-seat pricing models and slow bloated UIs.",
                        "attacked_cluster_slugs": [c.get("cluster_slug", "") for c in clusters[:2]],
                        "unbundling_wedge": f"Extracts essential {category_name} workflows into a blazing fast, keyboard-first client with zero seat limits.",
                        "target_icp": "1-15 Person Technical & Digital-First Teams",
                        "pricing_strategy": "$39/month flat rate (unlimited team seats)",
                        "core_features": [
                            "Sub-50ms instant search and lightning navigation",
                            "Unlimited team seats with no per-user tier penalties",
                            "Direct Slack, GitHub, and Discord bi-directional sync",
                            "One-click migration from legacy suites in under 5 minutes"
                        ],
                        "search_demand_keywords": [
                            f"{category_name.lower()} alternative",
                            f"simple {category_name.lower()}",
                            f"{category_name.lower()} pricing"
                        ],
                        "osi_score": 9.4
                    },
                    {
                        "title": f"Opp - NicheFlow: Verticalized Zero-Bloat {category_name} Engine",
                        "target_omission_summary": f"Incumbents treat all industries identically, forcing niche businesses to buy expensive middleware plugins.",
                        "attacked_cluster_slugs": [c.get("cluster_slug", "") for c in clusters[:2]],
                        "unbundling_wedge": f"A turnkey, zero-setup {category_name} engineered specifically for specialized modern operators.",
                        "target_icp": "Boutique Agencies & Specialized Operators",
                        "pricing_strategy": "$49 - $89/month flat rate",
                        "core_features": [
                            "Pre-built industry taxonomy and workflow templates",
                            "Automated client portal with zero configuration needed",
                            "Instant webhook bridges to Stripe, Shopify, and Webflow",
                            "Embedded self-service resolution widgets"
                        ],
                        "search_demand_keywords": [
                            f"{category_name.lower()} software",
                            f"{category_name.lower()} for small business",
                            f"open source {category_name.lower()}"
                        ],
                        "osi_score": 9.2
                    }
                ]
            }

        result = self.run_prompt_with_fallback(prompt, fallback_data_fn=deterministic_fallback)
        raw_opps = result.get("whitespace_opportunities", deterministic_fallback()["whitespace_opportunities"])

        # Validate with live Google Search Demand
        validated_opps = []
        for opp in raw_opps:
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', opp["title"].lower()).strip('-')
            opp["slug"] = slug
            opp["category_slug"] = category_slug

            seed_kws = opp.get("search_demand_keywords", [])
            enriched_kws = []
            for kw_item in seed_kws[:4]:
                kw_str = kw_item if isinstance(kw_item, str) else kw_item.get("keyword", "")
                if kw_str:
                    stats = self.keyword_analyzer.analyze_keyword_demand(kw_str, category_slug)
                    enriched_kws.append(stats)

            opp["search_demand_keywords"] = enriched_kws
            validated_opps.append(opp)

        return validated_opps

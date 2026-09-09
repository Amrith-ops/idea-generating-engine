import json
from typing import List, Dict, Any
from pipeline.agents.base_agent import BaseAgent

class SemanticNormalizerAgent(BaseAgent):
    """
    Agent 1: The Semantic Capability Normalizer.
    
    Eliminates the 'Feature Naming & Philosophy Trap' where products solving the same
    job with different vocabularies (e.g., Zendesk 'Ticket Queue' vs Front 'Shared Inbox'
    vs Linear 'Issue Triage') fail naive word-for-word string matching.
    
    Translates raw marketing copy into canonical Jobs-to-be-Done (JTBD) capabilities
    and tags each product's underlying architectural philosophy.
    """

    def __init__(self, api_key: str = None):
        super().__init__(
            name="SemanticNormalizerAgent",
            role_description="Translates marketing feature copy into canonical JTBD capability vectors and product philosophies.",
            api_key=api_key
        )

    def normalize_product_capabilities(
        self,
        category_name: str,
        products: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Processes a list of raw products and returns normalized capability vectors and solving philosophies.
        """
        prompt = f"""
You are an expert SaaS Software Architect and Jobs-to-be-Done (JTBD) Normalizer.
Analyze the following products in the category '{category_name}':

PRODUCTS & RAW FEATURES:
{json.dumps([{
    'slug': p['slug'],
    'name': p['name'],
    'market_segment': p.get('market_segment', 'Mid-Market'),
    'pricing_model': p.get('pricing_model', 'per_seat'),
    'raw_features': p.get('features', [])
} for p in products], indent=2)}

TASK:
1. Translate disparate marketing buzzwords into a standardized set of 6 to 10 CANONICAL JOBS-TO-BE-DONE (JTBD) capability slugs (e.g. "core_inquiry_routing", "sla_automation", "custom_reporting", "bi_sync", "omnichannel_dispatch", "self_service_portal").
2. For each product, assign the boolean presence of these canonical capabilities.
3. Identify each product's core "solving_philosophy" (e.g. "Legacy Queue & Escalation Dispatch", "Collaborative Shared Inbox", "Modern AI-First Conversational Bot", "Lightweight Keyboard-Driven Client").

Return valid JSON with the schema:
{{
  "canonical_capabilities_dictionary": ["slug_1", "slug_2", ...],
  "normalized_products": [
    {{
      "slug": "product-slug",
      "name": "Product Name",
      "solving_philosophy": "Description of philosophy",
      "canonical_capabilities": ["slug_1", "slug_3", ...],
      "gated_enterprise_capabilities": ["slug_advanced_reporting"]
    }}
  ]
}}
"""
        def deterministic_fallback():
            # Standard heuristic capability mapper
            dictionary = [
                "core_workflow_routing", "analytics_reporting", "team_collaboration",
                "third_party_integrations", "automation_rules", "customer_portal"
            ]
            normalized = []
            for p in products:
                features = p.get("features", [])
                caps = ["core_workflow_routing", "automation_rules"]
                if any("report" in str(f).lower() for f in features):
                    caps.append("analytics_reporting")
                if any("chat" in str(f).lower() or "team" in str(f).lower() for f in features):
                    caps.append("team_collaboration")
                if any("api" in str(f).lower() or "sync" in str(f).lower() for f in features):
                    caps.append("third_party_integrations")

                normalized.append({
                    "slug": p["slug"],
                    "name": p["name"],
                    "solving_philosophy": f"Standard {p.get('market_segment', 'Mid-Market')} approach to {category_name}",
                    "canonical_capabilities": caps,
                    "gated_enterprise_capabilities": ["analytics_reporting"] if p.get("orbit_tier") == "0_behemoth" else []
                })
            return {
                "canonical_capabilities_dictionary": dictionary,
                "normalized_products": normalized
            }

        result = self.run_prompt_with_fallback(prompt, fallback_data_fn=deterministic_fallback)
        return result.get("normalized_products", deterministic_fallback()["normalized_products"])

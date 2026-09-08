import json
from typing import Dict, Any, List
from pipeline.agents.base_agent import BaseAgent

class CategoryStrategistAgent(BaseAgent):
    """
    Agent 2: The Category Weight Strategist.
    
    Dynamically tunes the mathematical similarity weights based on the macroeconomic
    nature of the sub-category (e.g., boosting CLI/API signals for DevTools,
    boosting GMV/app store signals for E-Commerce, boosting compliance for HR/Security).
    """

    def __init__(self, api_key: str = None):
        super().__init__(
            name="CategoryStrategistAgent",
            role_description="Dynamically tunes mathematical similarity weights and injects niche category signals.",
            api_key=api_key
        )

    def determine_category_weights(
        self,
        category_name: str,
        category_slug: str,
        sample_products: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyzes the category domain and returns a dynamically tuned weight vector that sums to 1.0.
        """
        prompt = f"""
You are a strategic SaaS venture mathematician.
Analyze the SaaS sub-category '{category_name}' ({category_slug}) with products: {[p.get('name') for p in sample_products[:5]]}.

Determine the relative importance of similarity signals when assessing true competitiveness in this domain:
- "weight_capabilities": How much functional capability overlap matters (0.15 - 0.35)
- "weight_philosophy": How much architectural philosophy alignment matters (0.10 - 0.25)
- "weight_market_tier": How much audience tier & pricing structure matters (0.15 - 0.30)
- "weight_google_graph": How much real buyer consideration search co-query matters (0.15 - 0.25)
- "weight_review_discontent": How much shared customer pain points matter (0.10 - 0.20)

RULES:
1. The 5 weights MUST sum to EXACTLY 1.0.
2. Provide a clear 1-sentence "rationale" explaining why this domain requires these specific weights.
3. Identify 1 or 2 "niche_domain_signals" critical for this vertical (e.g. "Shopify App Store Ecosystem Depth" or "SOC2 / HIPAA Compliance Gating").

Return valid JSON with schema:
{{
  "weights": {{
    "weight_capabilities": 0.25,
    "weight_philosophy": 0.20,
    "weight_market_tier": 0.20,
    "weight_google_graph": 0.20,
    "weight_review_discontent": 0.15
  }},
  "rationale": "Explanation for weight distribution",
  "niche_domain_signals": ["Signal 1", "Signal 2"]
}}
"""
        def deterministic_fallback():
            return {
                "weights": {
                    "weight_capabilities": 0.25,
                    "weight_philosophy": 0.20,
                    "weight_market_tier": 0.20,
                    "weight_google_graph": 0.20,
                    "weight_review_discontent": 0.15
                },
                "rationale": f"Balanced baseline 5-signal weighting optimized for {category_name}.",
                "niche_domain_signals": ["Ecosystem API Extensibility", "Pricing Model Transparency"]
            }

        result = self.run_prompt_with_fallback(prompt, fallback_data_fn=deterministic_fallback)
        weights = result.get("weights", deterministic_fallback()["weights"])
        
        # Normalize weights to strictly guarantee sum == 1.0
        total = sum(weights.values())
        if total > 0:
            for k in weights:
                weights[k] = round(weights[k] / total, 3)

        return {
            "weights": weights,
            "rationale": result.get("rationale", deterministic_fallback()["rationale"]),
            "niche_domain_signals": result.get("niche_domain_signals", deterministic_fallback()["niche_domain_signals"])
        }

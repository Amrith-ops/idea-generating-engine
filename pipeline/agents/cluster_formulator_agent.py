import json
import re
from typing import List, Dict, Any
from pipeline.agents.base_agent import BaseAgent

class ClusterFormulatorAgent(BaseAgent):
    """
    Agent 3: The Strategic Cluster Formulator.
    
    Evaluates the deterministic pairwise mathematical similarity matrix,
    identifies cluster boundaries, and defines the strategic archetype identity,
    common group vulnerabilities, and unaddressed gaps for each cluster.
    """

    def __init__(self, api_key: str = None):
        super().__init__(
            name="ClusterFormulatorAgent",
            role_description="Transforms mathematical similarity matrices into cohesive competitor cluster archetypes.",
            api_key=api_key
        )

    def formulate_clusters(
        self,
        category_name: str,
        category_slug: str,
        normalized_products: List[Dict[str, Any]],
        pairwise_similarity_matrix: Dict[str, Dict[str, float]],
        reviews: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Synthesizes 2 to 4 distinct strategic competitor clusters.
        """
        prompt = f"""
You are an expert SaaS Positioning & Market Clustering Strategist.
Analyze the following products, their normalized capabilities, and the pairwise similarity matrix for '{category_name}':

NORMALIZED PRODUCTS:
{json.dumps(normalized_products, indent=2)}

MATHEMATICAL SIMILARITY MATRIX:
{json.dumps(pairwise_similarity_matrix, indent=2)}

CUSTOMER REVIEWS SAMPLE ({len(reviews)} mined citations):
{json.dumps([{
    'product': r.get('product_name'),
    'rating': r.get('star_rating'),
    'dislike': r.get('dislike_text'),
    'persona': r.get('extracted_icp') or r.get('reviewer_title')
} for r in reviews[:15]], indent=2)}

TASK:
Group these products into 2 to 4 distinct strategic COMPETITOR CLUSTERS based on high pairwise similarity and shared architectural philosophy.

For EACH cluster provide:
- "cluster_slug": URL slug (e.g. "legacy-enterprise-suites", "next-gen-conversational-bots")
- "cluster_name": Clear human title
- "cluster_theme": 1-sentence strategic summary
- "target_tier": "Enterprise", "Mid-Market", or "Small Business"
- "product_slugs": Array of product slugs belonging to this cluster
- "common_pains": Array of 2-3 specific pain points shared by this entire cluster
- "unaddressed_gaps": Array of 2-3 feature/pricing needs that this cluster FAILS to solve or deliberately ignores

Return valid JSON with schema:
{{
  "clusters": [
    {{
      "cluster_slug": "slug-here",
      "cluster_name": "Cluster Title",
      "cluster_theme": "1-sentence theme",
      "target_tier": "Mid-Market",
      "product_slugs": ["slug-1", "slug-2"],
      "common_pains": ["Pain 1", "Pain 2"],
      "unaddressed_gaps": ["Gap 1", "Gap 2"]
    }}
  ]
}}
"""
        def deterministic_fallback():
            prods = [p["slug"] for p in normalized_products]
            half = max(1, len(prods) // 2)
            return {
                "clusters": [
                    {
                        "cluster_slug": f"enterprise-heavyweights-{category_slug}",
                        "cluster_name": f"Enterprise All-in-One {category_name} Suites",
                        "cluster_theme": "Comprehensive enterprise platforms with deep customization but high onboarding friction and per-seat taxes.",
                        "target_tier": "Enterprise",
                        "product_slugs": prods[:half],
                        "common_pains": ["Rigid multi-week onboarding", "Punitive per-seat pricing tiers", "Bloated navigation"],
                        "unaddressed_gaps": ["Flat-rate pricing", "Zero-config fast setup for lean teams", "Simple clean UI"]
                    },
                    {
                        "cluster_slug": f"modern-specialists-{category_slug}",
                        "cluster_name": f"Modern & Specialized {category_name} Platforms",
                        "cluster_theme": "Modern workflow-focused solutions that still suffer from steep usage-based add-on costs or limited native integrations.",
                        "target_tier": "Mid-Market",
                        "product_slugs": prods[half:],
                        "common_pains": ["Aggressive usage overage pricing", "Fragmented analytics across channels", "Complex custom webhook configurations"],
                        "unaddressed_gaps": ["Transparent unlimited usage model", "Native lightweight API bridges", "Self-hosted / BYOK privacy options"]
                    }
                ]
            }

        result = self.run_prompt_with_fallback(prompt, fallback_data_fn=deterministic_fallback)
        clusters = result.get("clusters", deterministic_fallback()["clusters"])

        # Ensure slugs and formatting
        for cl in clusters:
            if not cl.get("cluster_slug"):
                cl["cluster_slug"] = re.sub(r'[^a-zA-Z0-9]+', '-', cl["cluster_name"].lower()).strip('-')
            cl["category_slug"] = category_slug

        return clusters

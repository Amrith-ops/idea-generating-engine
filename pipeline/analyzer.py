import logging
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class PainAnalyzer:
    """
    Analyzes raw G2 reviews using the Satellite Orbit Model,
    filters by company size tier (Small Business, Mid-Market, Enterprise anti-patterns),
    and synthesizes actionable Micro-SaaS opportunity dossiers.
    """

    @staticmethod
    def calculate_osi(severity: float, wtp_multiplier: float, dev_complexity: int) -> float:
        """
        Calculates Opportunity Score Index (OSI) from 1.0 to 10.0:
        High severity + High WTP + Low dev complexity = High Score.
        """
        raw_score = (severity * wtp_multiplier) / max(1, dev_complexity)
        return round(min(10.0, max(1.0, raw_score * 1.8)), 1)

    @staticmethod
    def triage_reviews_by_tier(reviews: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Separates reviews into actionable tiers:
        - small_business: 1-50 employees (Top priority for unbundling and flat-rate tools)
        - mid_market: 51-500 employees (High priority for symbiotic satellites & sync bridges)
        - enterprise: 1000+ employees (Used strictly as anti-patterns: features to strip out)
        """
        triaged = {
            "small_business": [],
            "mid_market": [],
            "enterprise": []
        }
        for r in reviews:
            tier = r.get("company_size_tier", "small_business")
            if tier in triaged:
                triaged[tier].append(r)
        return triaged

    @staticmethod
    def synthesize_orbit_lineage(product: Dict[str, Any], challengers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Determines if an opportunity is an attack on a Behemoth (Level 0)
        or a Satellite orbiting a Challenger (Level 1).
        """
        orbit = product.get("orbit_tier", "0_behemoth")
        if orbit == "0_behemoth":
            return {
                "opportunity_type": "The Generational Unbundler",
                "orbit_recommendation": "Build a dead-simple, zero-bloat standalone tool for SMBs."
            }
        elif orbit == "1_challenger":
            return {
                "opportunity_type": "The Symbiotic Satellite",
                "orbit_recommendation": "Build a focused plugin/sync layer on top of the challenger's marketplace."
            }
        return {
            "opportunity_type": "Niche Micro-SaaS",
            "orbit_recommendation": "Target under-served vertical niche."
        }

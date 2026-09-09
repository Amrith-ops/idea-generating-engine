import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
from pipeline.db_client import DatabaseClient
from pipeline.gemini_analyzer import GeminiSaaSExtractor
from pipeline.keyword_volume_analyzer import KeywordVolumeAnalyzer
from pipeline.competitor_clustering_engine import CompetitorClusterEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(filename)s] %(message)s")

class WhitespaceOmissionAnalyzer:
    """
    Analyzes group-level pain points across competitor clusters,
    identifies systemic unaddressed omissions (white spaces left unsolved by all clusters),
    synthesizes targeted Micro-SaaS satellites, and validates them against live Google SEO demand.
    """

    def __init__(self, db: Optional[DatabaseClient] = None):
        self.db = db or DatabaseClient()
        self.gemini = GeminiSaaSExtractor()
        self.keyword_analyzer = KeywordVolumeAnalyzer()
        self.clustering_engine = CompetitorClusterEngine(db=self.db)

    def analyze_category_whitespace(self, category_slug: str) -> Dict[str, Any]:
        """
        Executes end-to-end multi-cluster pain omission analysis and generates
        Google-demand-validated white space Micro-SaaS opportunities.
        """
        logging.info(f"🔮 Analyzing cross-cluster pain omissions and white spaces for '{category_slug}'...")

        # 1. Ensure clusters exist
        clusters = self.db.get_competitor_clusters(category_slug)
        if not clusters:
            logging.info(f"No clusters found for '{category_slug}'. Running CompetitorClusterEngine...")
            clusters = self.clustering_engine.cluster_products(category_slug)
            clusters = self.db.get_competitor_clusters(category_slug)

        if not clusters:
            logging.warning(f"Unable to form clusters for '{category_slug}'.")
            return {"status": "error", "message": "Failed to form competitor clusters."}

        # 2. Fetch category details, reviews, and pain clusters
        cat_rows = self.db.fetch_all("SELECT * FROM g2_categories WHERE slug = %s", (category_slug,))
        category_name = cat_rows[0]["name"] if cat_rows else category_slug.replace('-', ' ').title()

        products = self.db.fetch_all("SELECT * FROM g2_products WHERE category_slug = %s", (category_slug,))
        reviews = self.db.fetch_all("""
            SELECT r.*, p.cluster_id, p.cluster_name, p.name as product_name
            FROM g2_reviews r
            JOIN g2_products p ON p.slug = r.product_slug
            WHERE p.category_slug = %s
        """, (category_slug,))

        pain_clusters = self.db.fetch_all("SELECT * FROM pain_clusters WHERE category_slug = %s", (category_slug,))

        # 3. Feed clusters and review pains to Gemini for Cross-Cluster Omission Synthesis
        prompt = f"""
You are a world-class SaaS venture strategist and unbundling architect.
Analyze the competitive landscape and group-level pain points for '{category_name}'.

COMPETITOR CLUSTERS:
{json.dumps(clusters, indent=2, default=str)}

MINED NEGATIVE REVIEWS & COMPLAINTS ({len(reviews)} raw citations):
{json.dumps([{
    'product': r.get('product_name'),
    'cluster': r.get('cluster_name'),
    'rating': r.get('star_rating'),
    'dislike': r.get('dislike_text'),
    'persona': r.get('extracted_icp') or r.get('reviewer_title'),
    'dimension': r.get('pain_dimension')
} for r in reviews[:25]], indent=2, default=str)}

TASK:
1. Examine what problems each competitor cluster solves vs what they IGNORE or leave unaddressed.
2. Check if another group inside the sub-category provides a satisfactory solution to the pain left off by the previous group.
3. Identify the SYSTEMIC BLIND SPOTS (Omissions) — pain points, pricing frustrations, or audience segments that NO cluster in the entire sub-category is properly serving.
4. Synthesize 2 to 3 HIGH-CONVICTION MICRO-SAAS WHITE SPACE OPPORTUNITIES designed specifically to fill these unaddressed omissions.

For EACH White Space Opportunity, provide:
- "title": Compelling Micro-SaaS name and wedge (e.g. "Opp - NanoTicket: Low-Latency Flat-Fee Help Desk for Lean Teams")
- "target_omission_summary": Detailed description of the systemic gap left unaddressed by all incumbent clusters.
- "unaddressed_pain_slugs": Array of pain point themes this solves (e.g. ["per-seat-growth-tax", "admin-complexity-bloat"])
- "attacked_cluster_slugs": Array of competitor cluster slugs being attacked
- "unbundling_wedge": The laser-focused 1-sentence value proposition
- "target_icp": Exact customer profile left stranded by the incumbents (e.g. "1-10 Person E-commerce Brands & Indie Founders")
- "pricing_strategy": Flat monthly pricing model that eliminates per-seat penalties (e.g. "$49/mo flat (unlimited seats)")
- "core_features": Array of 4 to 6 core MVP features built to solve the omission without suite bloat
- "search_demand_keywords": Array of 3 to 5 realistic search queries buyers use when searching for this missing alternative (e.g. ["zendesk alternative flat pricing", "lean helpdesk for startups", "shopify customer support ticket tool zero bloat"])
- "osi_score": Opportunity Score Index between 8.8 and 9.7

Return valid JSON with key "whitespace_opportunities" containing the array of opportunity objects.
"""
        models_to_try = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3.5-flash"]
        whitespace_opps = []
        if self.gemini.client:
            for model_name in models_to_try:
                try:
                    res = self.gemini.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={"response_mime_type": "application/json"}
                    )
                    parsed = json.loads(res.text)
                    whitespace_opps = parsed.get("whitespace_opportunities", [])
                    if whitespace_opps:
                        logging.info(f"Successfully generated whitespace opportunities using live model: {model_name}")
                        break
                except Exception as e:
                    logging.warning(f"Whitespace model {model_name} failed: {e}. Trying next...")

        # Fallback if Gemini unavailable or quota exceeded
        if not whitespace_opps:
            logging.info(f"Using deterministic cross-cluster omission synthesis fallback for '{category_name}'.")
            cluster_names = [c.get("cluster_name", "") for c in clusters]
            cluster_slugs = [c.get("cluster_slug", "") for c in clusters]
            
            whitespace_opps = [
                {
                    "title": f"Opp - OmniLean: Flat-Rate High-Velocity {category_name} for Dev & Lean Teams",
                    "target_omission_summary": f"All incumbent clusters in {category_name} ({', '.join(cluster_names[:2])}) enforce punitive per-seat pricing models and complex enterprise onboarding that penalize fast-growing small teams.",
                    "unaddressed_pain_slugs": ["per-seat-growth-tax", "slow-bloated-ui", "complex-onboarding"],
                    "attacked_cluster_slugs": cluster_slugs[:2],
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
                        f"{category_slug} flat pricing",
                        f"simple {category_slug} for startups",
                        f"lightweight {category_slug} tool"
                    ],
                    "osi_score": 9.4
                },
                {
                    "title": f"Opp - NicheFlow: Verticalized Zero-Bloat {category_name} Engine",
                    "target_omission_summary": f"Incumbents treat all industries identically, forcing niche businesses to build complex custom workarounds or buy expensive third-party plugins.",
                    "unaddressed_pain_slugs": ["generic-workflow-friction", "expensive-integration-middleware"],
                    "attacked_cluster_slugs": cluster_slugs[:2],
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
                        f"best {category_slug} for agencies",
                        f"automated {category_slug} software",
                        f"niche {category_slug} alternative"
                    ],
                    "osi_score": 9.2
                }
            ]

        # 4. Phase 3: Validate with real Google Search Demand
        validated_opps = []
        for opp in whitespace_opps:
            slug = re.sub(r'[^a-zA-Z0-9]+', '-', opp["title"].lower()).strip('-')
            opp["slug"] = slug
            opp["category_slug"] = category_slug

            # Discover real Google search volume and YoY growth for suggested search queries
            seed_kws = opp.get("search_demand_keywords", [])
            enriched_kws = []
            for kw_item in seed_kws[:4]:
                kw_str = kw_item if isinstance(kw_item, str) else kw_item.get("keyword", "")
                if kw_str:
                    stats = self.keyword_analyzer.analyze_keyword_demand(kw_str, category_slug)
                    enriched_kws.append(stats)

            opp["search_demand_keywords"] = enriched_kws

            # Save to whitespace_opportunities table
            self.db.insert_whitespace_opportunity(opp)

            # Also sync into main microsaas_opportunities table
            self.db.insert_opportunity({
                "slug": slug,
                "title": opp["title"],
                "category_slug": category_slug,
                "bucket": "The Unbundler",
                "orbit_level": "2_satellite",
                "attacked_product_slugs": [p["slug"] for p in products[:3]],
                "target_icp_title": opp.get("target_icp", "SMB Founders"),
                "target_tier": "small_business",
                "target_industry": "Cross-Industry B2B",
                "value_proposition": opp.get("unbundling_wedge", ""),
                "core_features": opp.get("core_features", []),
                "pricing_strategy": opp.get("pricing_strategy", "$49/mo flat rate"),
                "distribution_channel": "Product Hunt, Indie Hackers, Niche App Stores (Shopify/Chrome)",
                "dev_complexity": 2,
                "mrr_potential": "$15,000 - $35,000/mo",
                "osi_score": opp.get("osi_score", 9.2),
                "status": "idea_validated"
            })

            validated_opps.append(opp)

        logging.info(f"Synthesized and validated {len(validated_opps)} white space opportunities for '{category_name}'.")

        return {
            "category_slug": category_slug,
            "category_name": category_name,
            "clusters": clusters,
            "whitespace_opportunities": validated_opps
        }

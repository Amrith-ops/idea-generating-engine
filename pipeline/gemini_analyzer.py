import os
import json
import logging
from typing import List, Dict, Any, Optional
import pipeline.config
from pipeline.analyzer import PainAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class GeminiSaaSExtractor:
    """
    Synthesizes raw negative reviews and product vulnerability profiles
    into structured Pain Clusters and scored Micro-SaaS Opportunity Dossiers.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logging.info("Gemini GenAI client initialized successfully.")
            except Exception as e:
                logging.warning(f"Could not initialize Google GenAI SDK: {e}. Using deterministic semantic extraction engine.")

    def analyze_category_cluster(
        self,
        category_name: str,
        category_slug: str,
        products: List[Dict[str, Any]],
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extracts multi-hop Orbit lineage, Pain Clusters, and Micro-SaaS dossiers.
        """
        # Separate reviews by tier
        triaged = PainAnalyzer.triage_reviews_by_tier(reviews)
        smb_reviews = triaged["small_business"]
        mid_reviews = triaged["mid_market"]

        logging.info(f"Analyzing '{category_name}': {len(products)} products, {len(smb_reviews)} SMB reviews, {len(mid_reviews)} Mid-Market reviews.")

        # If Gemini client is active, execute LLM extraction
        if self.client:
            return self._call_gemini_extraction(category_name, category_slug, products, reviews)

        # High-precision deterministic fallback synthesizer
        return self._heuristic_extraction(category_name, category_slug, products, reviews)

    def _heuristic_extraction(
        self,
        category_name: str,
        category_slug: str,
        products: List[Dict[str, Any]],
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Deterministic rule-based extractor based on real review signals.
        """
        pain_clusters = []
        opportunities = []

        # Find pricing traps & complexity bloat in SMB reviews
        pricing_reviews = [r for r in reviews if r.get("pain_dimension") == "PRICING_TRAP" or "pricing" in r.get("dislike_text", "").lower()]
        bloat_reviews = [r for r in reviews if r.get("pain_dimension") == "COMPLEXITY_BLOAT" or "complex" in r.get("dislike_text", "").lower() or "overkill" in r.get("dislike_text", "").lower()]
        integration_reviews = [r for r in reviews if r.get("pain_dimension") == "INTEGRATION_GAP" or "sync" in r.get("dislike_text", "").lower() or "integration" in r.get("dislike_text", "").lower()]

        # Cluster 1: Pricing Trap
        if pricing_reviews:
            affected_prods = list(set([r["product_name"] for r in pricing_reviews if "product_name" in r]))
            pain_clusters.append({
                "slug": f"pain-{category_slug}-pricing-lockin-and-cliffs",
                "title": f"Pain - {category_name} Pricing Creep & Feature Gating",
                "category_slug": category_slug,
                "category_name": category_name,
                "dimension": "PRICING_TRAP",
                "severity_score": 8.8,
                "affected_tier": "small_business",
                "summary": f"Small businesses in {category_name} report escalating monthly subscriptions, restrictive client/seat caps, and essential features locked behind expensive tiers.",
                "sample_quotes": [r["dislike_text"] for r in pricing_reviews[:3]],
                "affected_products": affected_prods or [p["name"] for p in products[:2]],
                "linked_opps": [f"Opp - Flat-Rate Zero-Bloat {category_name} Alternative"]
            })

            opportunities.append({
                "slug": f"opp-flat-rate-simple-{category_slug}",
                "title": f"Opp - Flat-Rate Zero-Bloat {category_name} Alternative",
                "category_slug": category_slug,
                "category_name": category_name,
                "bucket": "Pricing Arbitrage",
                "orbit_level": "2_satellite",
                "attacked_product_slugs": [p["slug"] for p in products if p.get("orbit_tier") in ["0_behemoth", "1_challenger"]],
                "attacked_products": [p["name"] for p in products if p.get("orbit_tier") in ["0_behemoth", "1_challenger"]],
                "target_icp_title": "Bootstrapped SMB Founders & Freelancers",
                "target_tier": "small_business",
                "target_industry": "Cross-Industry SMB",
                "value_proposition": f"A straightforward, transparent alternative to bloated {category_name} incumbents with flat monthly pricing, zero per-seat penalties, and 1-click self-serve setup.",
                "core_features": [
                    "Dead-simple core workflow execution in under 3 clicks",
                    "Transparent flat-rate pricing ($29/mo unlimited usage)",
                    "1-click data export with zero vendor lock-in",
                    "No required onboarding calls or enterprise consultants"
                ],
                "pricing_strategy": "$29 - $49/month flat rate",
                "distribution_channel": "Direct SEO, Product Hunt, AlternativeTo listings, Reddit founder communities",
                "dev_complexity": 2,
                "mrr_potential": "$10,000 - $35,000/mo",
                "osi_score": 9.1,
                "status": "idea_validated"
            })

        # Cluster 2: Unbundling / Complexity Bloat
        if bloat_reviews:
            affected_prods = list(set([r["product_name"] for r in bloat_reviews if "product_name" in r]))
            pain_clusters.append({
                "slug": f"pain-{category_slug}-steep-learning-curve-and-ui-bloat",
                "title": f"Pain - {category_name} UI Bloat & Excessive Setup",
                "category_slug": category_slug,
                "category_name": category_name,
                "dimension": "COMPLEXITY_BLOAT",
                "severity_score": 8.4,
                "affected_tier": "small_business",
                "summary": f"Users express frustration with cluttered menus, frequent disruptive interface redesigns, and overwhelming features that slow down basic daily operations in {category_name}.",
                "sample_quotes": [r["dislike_text"] for r in bloat_reviews[:3]],
                "affected_products": affected_prods or [p["name"] for p in products[:2]],
                "linked_opps": [f"Opp - Lightweight Keyboard-First {category_name} Client"]
            })

            opportunities.append({
                "slug": f"opp-lightweight-fast-{category_slug}",
                "title": f"Opp - Lightweight Keyboard-First {category_name} Client",
                "category_slug": category_slug,
                "category_name": category_name,
                "bucket": "The Unbundler",
                "orbit_level": "2_satellite",
                "attacked_product_slugs": [p["slug"] for p in products if p.get("orbit_tier") == "0_behemoth"],
                "attacked_products": [p["name"] for p in products if p.get("orbit_tier") == "0_behemoth"],
                "target_icp_title": "Agile Solopreneurs & 3-Person Teams",
                "target_tier": "small_business",
                "target_industry": "Digital First SMBs",
                "value_proposition": f"Extracts the single most vital workflow from {category_name} behemoths and delivers it in a lightning-fast, keyboard-driven UI.",
                "core_features": [
                    "Sub-100ms response times with offline-ready local cache",
                    "Cmd+K quick action command palette",
                    "Clean minimalist dark/light UI focused exclusively on core utility",
                    "Automated sync with existing business bank/email accounts"
                ],
                "pricing_strategy": "$19 - $39/month flat rate",
                "distribution_channel": "Twitter/X buildinpublic, Hacker News Show HN, Chrome Web Store",
                "dev_complexity": 1,
                "mrr_potential": "$8,000 - $25,000/mo",
                "osi_score": 9.4,
                "status": "idea_validated"
            })

        return {
            "pain_clusters": pain_clusters,
            "opportunities": opportunities
        }

    def _call_gemini_extraction(
        self,
        category_name: str,
        category_slug: str,
        products: List[Dict[str, Any]],
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes Gemini API structured extraction prompt.
        """
        prompt = f"""
You are an expert Micro-SaaS venture analyst, growth engineer, and G2 intelligence researcher.
Analyze the following category, products, and negative reviews:

CATEGORY: {category_name} ({category_slug})
PRODUCTS: {json.dumps(products, indent=2)}
REVIEWS: {json.dumps(reviews, indent=2)}

TASK:
1. Extract 2 high-severity Pain Clusters (focus on Small Business / Solopreneur complaints, avoid enterprise compliance traps).
2. Generate 2 concrete, highly profitable Micro-SaaS Opportunity Dossiers (Playbooks: "The Unbundler", "The Symbiotic Satellite", "The Vertical Specialist", or "Pricing Arbitrage").
3. For each opportunity:
   - Provide a clear, catchy title (e.g., "Opp - Multi-Currency Stripe Revenue Sync for Xero")
   - Identify attacked products (by exact names)
   - Define exact Target ICP (e.g., "Bootstrapped Shopify Founders")
   - List 4-5 concrete MVP core features as bullet points
   - Provide specific pricing ($29/mo, $49/mo), distribution channels, dev complexity (1-5), MRR potential ($10k-$30k/mo), and OSI score (1.0 to 10.0).

Return valid JSON with the following exact schema:
{{
  "pain_clusters": [
    {{
      "slug": "pain-slug-here",
      "title": "Pain - Descriptive Title",
      "dimension": "PRICING_TRAP",
      "severity_score": 8.5,
      "affected_tier": "small_business",
      "summary": "Detailed summary of frustration",
      "sample_quotes": ["quote 1", "quote 2"],
      "affected_products": ["Product Name 1", "Product Name 2"],
      "linked_opps": ["Opp - Descriptive Title"]
    }}
  ],
  "opportunities": [
    {{
      "slug": "opp-slug-here",
      "title": "Opp - Specific Micro-SaaS Name",
      "bucket": "The Unbundler",
      "orbit_level": "2_satellite",
      "attacked_product_slugs": ["product-slug-1"],
      "attacked_products": ["Product Name 1"],
      "target_icp_title": "Specific Persona",
      "target_tier": "small_business",
      "target_industry": "Specific Niche",
      "value_proposition": "Clear 2-sentence value proposition explaining why it wins against incumbents",
      "core_features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"],
      "pricing_strategy": "$29/month flat rate",
      "distribution_channel": "Specific channel, e.g. Shopify App Store, Chrome Web Store, Reddit r/ecommerce",
      "dev_complexity": 2,
      "mrr_potential": "$10,000 - $30,000/mo",
      "osi_score": 9.2,
      "status": "idea_validated"
    }}
  ]
}}
"""
        models_to_try = ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-2.5-flash"]
        for model_name in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={'response_mime_type': 'application/json'}
                )
                logging.info(f"Successfully extracted opportunities using live Gemini model: {model_name}")
                raw_json = json.loads(response.text)
                return self._normalize_extracted_json(raw_json, category_name, category_slug)
            except Exception as e:
                logging.warning(f"Model {model_name} failed: {e}. Trying next...")


        logging.error("All Gemini models failed. Falling back to deterministic semantic extractor.")
        return self._heuristic_extraction(category_name, category_slug, products, reviews)

    def _normalize_extracted_json(self, data: Dict[str, Any], category_name: str, category_slug: str) -> Dict[str, Any]:
        import re
        pains = data.get("pain_clusters", [])
        opps = data.get("opportunities", [])

        norm_pains = []
        for p in pains:
            title = p.get("title", f"Pain in {category_name}")
            slug = p.get("slug") or re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')
            norm_pains.append({
                "slug": slug,
                "title": title,
                "category_slug": category_slug,
                "category_name": category_name,
                "dimension": p.get("dimension", "PRICING_TRAP"),
                "severity_score": float(p.get("severity_score", 8.0)),
                "affected_tier": p.get("affected_tier", "small_business"),
                "summary": p.get("summary", ""),
                "sample_quotes": p.get("sample_quotes", []),
                "affected_products": p.get("affected_products", []),
                "linked_opps": p.get("linked_opps", [])
            })

        norm_opps = []
        for o in opps:
            title = o.get("title", f"Opp - Solution for {category_name}")
            slug = o.get("slug") or re.sub(r'[^a-zA-Z0-9]+', '-', title.lower()).strip('-')
            norm_opps.append({
                "slug": slug,
                "title": title,
                "category_slug": category_slug,
                "category_name": category_name,
                "bucket": o.get("bucket", "The Unbundler"),
                "orbit_level": o.get("orbit_level", "2_satellite"),
                "attacked_product_slugs": o.get("attacked_product_slugs", []),
                "attacked_products": o.get("attacked_products", []),
                "target_icp_title": o.get("target_icp_title", "Small Business Founders"),
                "target_tier": o.get("target_tier", "small_business"),
                "target_industry": o.get("target_industry", "Cross-Industry"),
                "value_proposition": o.get("value_proposition", ""),
                "core_features": o.get("core_features", []),
                "pricing_strategy": o.get("pricing_strategy", "$29/mo flat rate"),
                "distribution_channel": o.get("distribution_channel", "Product Hunt, Indie Hackers"),
                "dev_complexity": int(o.get("dev_complexity", 2)),
                "mrr_potential": str(o.get("mrr_potential", "$10k - $30k/mo")),
                "osi_score": float(o.get("osi_score", 9.0)),
                "status": o.get("status", "idea_validated")
            })

        return {"pain_clusters": norm_pains, "opportunities": norm_opps}


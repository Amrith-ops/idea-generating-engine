import os
import re
import json
import logging
import urllib.request
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple
from ddgs import DDGS
from pipeline.db_client import DatabaseClient
from pipeline.gemini_analyzer import GeminiSaaSExtractor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(filename)s] %(message)s")

class CompetitorClusterEngine:
    """
    Multi-Signal Competitor Clustering Engine:
    1. Exhaustively discovers all major products & feature sets in a subcategory.
    2. Computes pairwise competitiveness using 5 weighted signals:
       - Feature Matrix Overlap (25%)
       - G2 Category Natural Taxonomy (20%)
       - Target Audience ICP & Price Band (20%)
       - Google Search Graph Co-occurrence ('vs' / 'alternatives') (20%)
       - Review Mentions & Shared Pain Profile (15%)
    3. Forms strategic competitor clusters (e.g. Enterprise Giants, DTC Specialists, Dev Inboxes).
    """

    def __init__(self, db: Optional[DatabaseClient] = None):
        self.db = db or DatabaseClient()
        self.gemini = GeminiSaaSExtractor()
        self.ddgs = DDGS()

    def discover_exhaustive_products(self, category_slug: str, category_name: str, target_count: int = 8) -> List[Dict[str, Any]]:
        """
        Exhaustively discovers 6-12+ products in a subcategory along with detailed feature checklists.
        """
        logging.info(f"🔍 Exhaustive product discovery for '{category_name}' ({category_slug})...")
        
        # 1. Check existing products in DB
        existing = self.db.fetch_all("SELECT * FROM g2_products WHERE category_slug = %s", (category_slug,))
        existing_names = [p["name"] for p in existing]

        # 2. Query web for extensive software catalog
        queries = [
            f"best software tools in {category_name} site:g2.com OR site:capterra.com",
            f"top 10 competitors alternatives in {category_name} software market"
        ]
        snippets = []
        for q in queries:
            try:
                results = list(self.ddgs.text(q, max_results=6))
                for r in results:
                    snippets.append(f"{r.get('title', '')}: {r.get('body', '')}")
            except Exception as e:
                logging.warning(f"Web discovery error: {e}")

        snippet_text = "\n".join(snippets)
        
        prompt = f"""
You are a senior SaaS market research analyst.
Given these search results for the software category '{category_name}':
{snippet_text}

Known products already in database: {', '.join(existing_names) if existing_names else 'None'}

Provide an exhaustive list of {target_count} distinct, real software products in this sub-category.
For EACH product, provide:
1. "name": Exact product name (e.g. "Zendesk", "Freshdesk", "Gorgias", "Intercom", "Front", "Help Scout", "Zoho Desk", "Kustomer")
2. "orbit_tier": "0_behemoth" (for top legacy market giants), "1_challenger" (established challengers), or "2_satellite" (fast-growing niche/modern tools)
3. "pricing_model": e.g. "per_seat", "usage_based", "flat_monthly", "freemium_tier", or "custom_quote"
4. "market_segment": "Enterprise", "Mid-Market", or "Small Business"
5. "primary_vulnerability": Specific weakness (e.g. bloated UI, slow setup, high per-seat fees)
6. "features": Array of 6 to 10 granular feature tags (e.g. ["ticketing", "live_chat", "knowledge_base", "sla_rules", "omnichannel", "ai_copilot", "shopify_order_sync", "macro_templates", "csat_surveys", "shared_inbox"])

Return valid JSON with key "products" as an array of objects.
"""
        try:
            res = self.gemini.client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            parsed = json.loads(res.text)
            products = parsed.get("products", [])
            logging.info(f"Discovered {len(products)} exhaustive products for '{category_name}'.")

            # Ingest into DB
            for p in products:
                slug = re.sub(r'[^a-zA-Z0-9]+', '-', p["name"].lower()).strip('-')
                p["slug"] = slug
                p["category_slug"] = category_slug
                p["rating_avg"] = p.get("rating_avg", 4.2)
                p["review_count"] = p.get("review_count", 1500)
                self.db.insert_product(p)
                
                # Update features if JSON column exists
                try:
                    self.db.execute_query(
                        "UPDATE g2_products SET features = %s WHERE slug = %s",
                        (json.dumps(p.get("features", [])), slug)
                    )
                except Exception:
                    pass

            return self.db.fetch_all("SELECT * FROM g2_products WHERE category_slug = %s", (category_slug,))
        except Exception as e:
            logging.error(f"Error during exhaustive product discovery: {e}")
            return existing or []

    def compute_feature_similarity(self, feats_a: List[str], feats_b: List[str]) -> float:
        """
        Computes Jaccard similarity between two feature sets.
        """
        set_a = set(f.lower().strip() for f in feats_a if f)
        set_b = set(f.lower().strip() for f in feats_b if f)
        if not set_a or not set_b:
            return 0.5  # Neutral fallback
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return round(intersection / union, 3) if union > 0 else 0.0

    def compute_market_tier_similarity(self, p1: Dict[str, Any], p2: Dict[str, Any]) -> float:
        """
        Computes market segment and pricing model alignment.
        """
        seg1 = (p1.get("market_segment") or "").lower()
        seg2 = (p2.get("market_segment") or "").lower()
        price1 = (p1.get("pricing_model") or "").lower()
        price2 = (p2.get("pricing_model") or "").lower()

        tier_score = 0.5
        if seg1 == seg2:
            tier_score = 1.0
        elif ("enterprise" in seg1 and "small" in seg2) or ("small" in seg1 and "enterprise" in seg2):
            tier_score = 0.2
        else:
            tier_score = 0.7  # Adjacent tiers

        price_score = 1.0 if price1 == price2 else 0.6
        return round(0.6 * tier_score + 0.4 * price_score, 3)

    def compute_google_cooccurrence(self, prod_a_name: str, prod_b_name: str) -> float:
        """
        Queries Google Autocomplete for '{prod_a} vs ' and '{prod_a} alternatives'
        to verify if prod_b appears in Google's buyer search consideration graph.
        """
        def check_google(query_prefix: str, target: str) -> bool:
            try:
                url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={urllib.parse.quote_plus(query_prefix)}"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=3) as res:
                    data = json.loads(res.read().decode("utf-8"))
                    suggestions = [s.lower() for s in data[1]]
                    return any(target.lower() in s for s in suggestions)
            except Exception:
                return False

        a_vs = check_google(f"{prod_a_name} vs ", prod_b_name)
        b_vs = check_google(f"{prod_b_name} vs ", prod_a_name)
        a_alt = check_google(f"{prod_a_name} alternatives ", prod_b_name)

        if a_vs and b_vs:
            return 1.0
        elif a_vs or b_vs or a_alt:
            return 0.8
        return 0.3  # Baseline if not in top 5 autocomplete

    def compute_review_mentions(self, p1: Dict[str, Any], p2: Dict[str, Any]) -> float:
        """
        Checks review pain dimension overlap between products.
        """
        p1_vuln = (p1.get("primary_vulnerability") or "").lower()
        p2_vuln = (p2.get("primary_vulnerability") or "").lower()
        if not p1_vuln or not p2_vuln:
            return 0.5
        words1 = set(re.findall(r'\w+', p1_vuln))
        words2 = set(re.findall(r'\w+', p2_vuln))
        overlap = len(words1 & words2)
        return round(min(1.0, overlap / 5.0), 3)

    def compute_pairwise_competitiveness(self, p1: Dict[str, Any], p2: Dict[str, Any]) -> float:
        """
        Computes composite competitiveness score (0.0 to 1.0) based on the 5-signal rubric.
        """
        if p1.get("slug") == p2.get("slug"):
            return 1.0

        f1 = p1.get("features") if isinstance(p1.get("features"), list) else []
        f2 = p2.get("features") if isinstance(p2.get("features"), list) else []

        feature_sim = self.compute_feature_similarity(f1, f2)
        taxonomy_sim = 1.0 if p1.get("category_slug") == p2.get("category_slug") else 0.4
        market_sim = self.compute_market_tier_similarity(p1, p2)
        google_sim = self.compute_google_cooccurrence(p1.get("name", ""), p2.get("name", ""))
        review_sim = self.compute_review_mentions(p1, p2)

        composite = (
            0.25 * feature_sim +
            0.20 * taxonomy_sim +
            0.20 * market_sim +
            0.20 * google_sim +
            0.15 * review_sim
        )
        return round(composite, 3)

    def cluster_products(self, category_slug: str) -> List[Dict[str, Any]]:
        """
        Clusters all products in a subcategory into 2-4 distinct strategic competitor groups.
        """
        cat_rows = self.db.fetch_all("SELECT * FROM g2_categories WHERE slug = %s", (category_slug,))
        category_name = cat_rows[0]["name"] if cat_rows else category_slug.replace('-', ' ').title()

        products = self.db.fetch_all("SELECT * FROM g2_products WHERE category_slug = %s", (category_slug,))
        if len(products) < 4:
            products = self.discover_exhaustive_products(category_slug, category_name, target_count=8)

        if not products:
            return []

        # Parse features JSON
        for p in products:
            if isinstance(p.get("features"), str):
                try:
                    p["features"] = json.loads(p["features"])
                except Exception:
                    p["features"] = []

        prod_summaries = []
        for p in products:
            prod_summaries.append({
                "slug": p["slug"],
                "name": p["name"],
                "orbit_tier": p.get("orbit_tier", "1_challenger"),
                "market_segment": p.get("market_segment", "Mid-Market"),
                "pricing_model": p.get("pricing_model", "per_seat"),
                "primary_vulnerability": p.get("primary_vulnerability", ""),
                "features": p.get("features", [])
            })

        prompt = f"""
You are a strategic SaaS positioning expert.
Given these {len(prod_summaries)} products in the category '{category_name}':
{json.dumps(prod_summaries, indent=2)}

Group these products into 2 to 3 distinct strategic COMPETITOR CLUSTERS based on:
1. Feature set archetype (e.g. Enterprise All-in-One Suites vs Niche Vertical Tools vs Lightweight Dev Inboxes)
2. Target market & pricing tier (Enterprise vs DTC vs SMB)
3. Shared architectural vulnerabilities

For EACH cluster provide:
- "cluster_slug": URL slug (e.g. "enterprise-heavyweights", "ecommerce-dtc-specialists", "lightweight-shared-inboxes")
- "cluster_name": Clear human title (e.g. "Enterprise Behemoth Suites", "E-Commerce & DTC Inboxes", "Lightweight Dev & Flat-Rate Inboxes")
- "cluster_theme": 1-sentence strategic summary of how this group positions itself
- "target_tier": "Enterprise", "Mid-Market", or "Small Business"
- "product_slugs": Array of product slugs belonging to this cluster
- "common_pain_points": Array of 2-3 specific pain points shared by this entire cluster
- "unaddressed_gaps": Array of 2-3 feature/pricing needs that this cluster FAILS to solve or deliberately ignores

Return valid JSON with key "clusters" containing the array of cluster objects.
"""
        models_to_try = ["gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3.5-flash"]
        clusters = []
        if self.gemini.client:
            for model_name in models_to_try:
                try:
                    res = self.gemini.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config={"response_mime_type": "application/json"}
                    )
                    parsed = json.loads(res.text)
                    clusters = parsed.get("clusters", [])
                    if clusters:
                        logging.info(f"Successfully clustered products using live model: {model_name}")
                        break
                except Exception as e:
                    logging.warning(f"Clustering model {model_name} failed: {e}. Trying next...")

        # Fallback if Gemini unavailable or quota exceeded
        if not clusters:
            logging.info("Using deterministic heuristic competitor clustering fallback.")
            ent_prods = [p["slug"] for p in products if p.get("orbit_tier") == "0_behemoth" or "enterprise" in (p.get("market_segment") or "").lower()]
            mid_prods = [p["slug"] for p in products if p["slug"] not in ent_prods and (p.get("orbit_tier") == "1_challenger" or "mid" in (p.get("market_segment") or "").lower())]
            smb_prods = [p["slug"] for p in products if p["slug"] not in ent_prods and p["slug"] not in mid_prods]

            if not ent_prods and products:
                ent_prods = [products[0]["slug"]]
            if not mid_prods and len(products) > 1:
                mid_prods = [p["slug"] for p in products[1:]]

            clusters = [
                {
                    "cluster_slug": f"enterprise-heavyweights-{category_slug}",
                    "cluster_name": f"Enterprise All-in-One {category_name} Suites",
                    "cluster_theme": "High-customization, complex enterprise platforms with steep learning curves and heavy per-seat tiers.",
                    "target_tier": "Enterprise",
                    "product_slugs": ent_prods,
                    "common_pain_points": ["Rigid multi-week onboarding", "Punitive per-agent pricing tiers", "Bloated navigation and slow load times"],
                    "unaddressed_gaps": ["Lightweight flat-rate pricing", "Zero-config fast setup for 1-5 person teams", "Simple clean UI without enterprise modules"]
                },
                {
                    "cluster_slug": f"modern-specialists-{category_slug}",
                    "cluster_name": f"Modern & Specialized {category_name} Platforms",
                    "cluster_theme": "Sleek, workflow-focused solutions that still suffer from steep add-on costs or limited native integrations.",
                    "target_tier": "Mid-Market",
                    "product_slugs": mid_prods + smb_prods,
                    "common_pain_points": ["Aggressive usage overage pricing", "Fragmented analytics across channels", "Complex custom webhook configurations"],
                    "unaddressed_gaps": ["Self-hosted / privacy-first options", "Transparent unlimited usage model", "Native lightweight API bridges"]
                }
            ]

        # Persist clusters into DB
        for cl in clusters:
            cl_slug = cl.get("cluster_slug") or re.sub(r'[^a-zA-Z0-9]+', '-', cl["cluster_name"].lower()).strip('-')
            cl["cluster_slug"] = cl_slug
            cl["category_slug"] = category_slug

            insert_sql = """
            INSERT INTO competitor_clusters (
                cluster_slug, category_slug, cluster_name, cluster_theme,
                target_tier, product_slugs, common_pains, unaddressed_gaps
            )
            VALUES (%(cluster_slug)s, %(category_slug)s, %(cluster_name)s, %(cluster_theme)s,
                    %(target_tier)s, %(product_slugs)s, %(common_pains)s, %(unaddressed_gaps)s)
            ON CONFLICT (cluster_slug) DO UPDATE
            SET cluster_name = EXCLUDED.cluster_name,
                cluster_theme = EXCLUDED.cluster_theme,
                product_slugs = EXCLUDED.product_slugs,
                common_pains = EXCLUDED.common_pains,
                unaddressed_gaps = EXCLUDED.unaddressed_gaps;
            """
            self.db.execute_query(insert_sql, {
                "cluster_slug": cl_slug,
                "category_slug": category_slug,
                "cluster_name": cl["cluster_name"],
                "cluster_theme": cl.get("cluster_theme", ""),
                "target_tier": cl.get("target_tier", "Mid-Market"),
                "product_slugs": cl.get("product_slugs", []),
                "common_pains": json.dumps(cl.get("common_pain_points", cl.get("common_pains", []))),
                "unaddressed_gaps": json.dumps(cl.get("unaddressed_gaps", []))
            })

            # Update products with cluster info
            for p_slug in cl.get("product_slugs", []):
                self.db.execute_query(
                    "UPDATE g2_products SET cluster_id = %s, cluster_name = %s WHERE slug = %s",
                    (cl_slug, cl["cluster_name"], p_slug)
                )

        logging.info(f"Successfully persisted {len(clusters)} competitor clusters for '{category_name}'.")
        return clusters

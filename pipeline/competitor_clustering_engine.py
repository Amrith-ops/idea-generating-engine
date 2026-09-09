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
You are a strategic SaaS market research analyst and master communicator who explains complex software systems in simple, everyday English.
Given these {len(prod_summaries)} products in the category '{category_name}':
{json.dumps(prod_summaries, indent=2)}

Group these products into 2 to 3 distinct strategic COMPETITOR ARCHETYPE GROUPS based on:
1. Feature set archetype (e.g. Enterprise All-in-One Suites vs Modern Automated Messengers vs Lightweight Team Inboxes)
2. Target market & pricing tier (Enterprise vs Mid-Market / E-Commerce vs Small Business)
3. Shared architectural weaknesses & real-world customer frustrations

CRITICAL INSTRUCTION FOR CLARITY:
Avoid all corporate buzzwords and technical jargon (do NOT use vague phrases like "exhaustive relational data tracking", "powerhouse case management", "trade setup velocity", "omnichannel lifecycle engines", or "pricing cliffs").
Explain everything so simply that someone with zero software background can immediately visualize what the software does, how someone uses it on a normal workday, and why customers get frustrated.

For EACH cluster provide:
- "cluster_slug": URL slug (e.g. "enterprise-heavyweights", "modern-chat-automation", "simple-team-inbox")
- "cluster_name": Clear, human title (e.g. "Enterprise All-in-One Giants", "Modern Website Chat & Automation", "Simple Shared Inboxes for Small Teams")
- "cluster_theme": 1-2 plain-English sentences summarizing what this software does in simple everyday words
- "target_tier": "Enterprise", "Mid-Market", or "Small Business"
- "product_slugs": Array of product slugs belonging to this cluster
- "common_pain_points": Array of 2-3 specific, plain-English pain points shared by this entire cluster
- "unaddressed_gaps": Array of 2-3 feature/pricing needs that this cluster fails to solve or ignores
- "how_it_works": Object with:
    * "plain_english_summary": "1-2 sentences in simple human English explaining what this software does."
    * "analogy": "An everyday real-world analogy (e.g. '🛫 Like an airplane cockpit: Built for giant airlines with thousands of dials, but takes 6 months of training to use.' or '💬 Like WhatsApp with smart automated replies for online stores.')"
    * "workflow_example": [
        "Step 1: A customer sends a support message or order question.",
        "Step 2: The system tags the message and assigns it to a team queue.",
        "Step 3: An agent opens multiple screens to check customer history and send a reply."
      ]
    * "the_catch": "1 sentence on why users feel overwhelmed or frustrated (the hidden trade-off)."
    * "microsaas_opportunity": "1 sentence on the exact focused, 1-click tool you can build to beat them."

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
                    "cluster_name": f"Enterprise All-in-One {category_name} Giants",
                    "cluster_theme": "Massive, all-in-one software suites built for corporations with thousands of staff, packed with hundreds of settings and compliance controls.",
                    "target_tier": "Enterprise",
                    "product_slugs": ent_prods,
                    "common_pain_points": [
                        "Takes 3 to 6 months of IT setup and expensive consultants before your team can even use it",
                        "Punitive per-seat pricing ($150+/user/month) that penalizes team growth",
                        "Cluttered, slow user interface with dozens of menus that slow down everyday work"
                    ],
                    "unaddressed_gaps": [
                        "Zero-config setup ready in under 5 minutes for small teams",
                        "Predictable flat-rate pricing with unlimited team seats",
                        "Clean, single-screen UI focused on doing one job fast"
                    ],
                    "how_it_works": {
                        "plain_english_summary": "Heavy-duty software built for giant corporations to log, track, and manage complex customer interactions across dozens of global departments.",
                        "analogy": "🛫 Like a commercial airplane cockpit: It can track thousands of flights at once and has a switch for everything, but requires certified pilots, months of training, and a manual to operate.",
                        "workflow_example": [
                            "Step 1: A customer emails with an issue. The system generates Ticket #9482, assigns an SLA timer, and routes it through 10 corporate approval rules.",
                            "Step 2: An agent opens 4 different browser tabs to look up account details and check compliance checklists.",
                            "Step 3: The agent fills out 8 required fields just to write and send a 2-sentence response."
                        ],
                        "the_catch": "Because it tries to please corporate executives and IT auditors, everyday employees spend more time navigating menus than solving customer problems.",
                        "microsaas_opportunity": "Build a fast, 1-click micro-tool that lets teams resolve this exact workflow in 10 seconds without any enterprise bloat."
                    }
                },
                {
                    "cluster_slug": f"modern-specialists-{category_slug}",
                    "cluster_name": f"Modern Automated & Conversational Platforms",
                    "cluster_theme": "Sleek, real-time messaging and automation tools built to chat with website visitors and resolve questions instantly.",
                    "target_tier": "Mid-Market",
                    "product_slugs": mid_prods + smb_prods,
                    "common_pain_points": [
                        "Unpredictable usage fees and surprise overage charges at the end of each month",
                        "Fragmented customer data across multiple disconnected tools",
                        "Complicated bot builders that break when customers ask unexpected questions"
                    ],
                    "unaddressed_gaps": [
                        "Transparent, predictable billing with zero surprise usage spikes",
                        "Privacy-first data storage with simple 1-click export",
                        "Lightweight, no-code integrations that connect in 60 seconds"
                    ],
                    "how_it_works": {
                        "plain_english_summary": "Website chat bubbles and automated bots designed to engage shoppers in real time, answer common FAQs, and hand off chats to support staff.",
                        "analogy": "💬 Like WhatsApp or iMessage on steroids for online businesses: When visitors land on your site, an automated assistant greets them and helps them find answers instantly.",
                        "workflow_example": [
                            "Step 1: A shopper visits a website and clicks the chat widget asking 'How do I return my item?'.",
                            "Step 2: An automated bot checks store policies and suggests the return portal link within 3 seconds.",
                            "Step 3: If the customer needs a human, the chat notifies a support rep on Slack or mobile to take over."
                        ],
                        "the_catch": "As soon as your website traffic grows, usage-based fees can cause your monthly bill to jump from $100 to over $1,500 without warning.",
                        "microsaas_opportunity": "Offer a simple, fixed-fee tool with transparent pricing and foolproof automation that never surprises users on their invoice."
                    }
                }
            ]

        # Persist clusters into DB
        for cl in clusters:
            cl_slug = cl.get("cluster_slug") or re.sub(r'[^a-zA-Z0-9]+', '-', cl["cluster_name"].lower()).strip('-')
            cl["cluster_slug"] = cl_slug
            cl["category_slug"] = category_slug

            how_it_works_data = cl.get("how_it_works", {})
            if isinstance(how_it_works_data, str):
                try:
                    how_it_works_data = json.loads(how_it_works_data)
                except Exception:
                    how_it_works_data = {}

            insert_sql = """
            INSERT INTO competitor_clusters (
                cluster_slug, category_slug, cluster_name, cluster_theme,
                target_tier, product_slugs, common_pains, unaddressed_gaps, how_it_works
            )
            VALUES (%(cluster_slug)s, %(category_slug)s, %(cluster_name)s, %(cluster_theme)s,
                    %(target_tier)s, %(product_slugs)s, %(common_pains)s, %(unaddressed_gaps)s, %(how_it_works)s)
            ON CONFLICT (cluster_slug) DO UPDATE
            SET cluster_name = EXCLUDED.cluster_name,
                cluster_theme = EXCLUDED.cluster_theme,
                product_slugs = EXCLUDED.product_slugs,
                common_pains = EXCLUDED.common_pains,
                unaddressed_gaps = EXCLUDED.unaddressed_gaps,
                how_it_works = EXCLUDED.how_it_works;
            """
            self.db.execute_query(insert_sql, {
                "cluster_slug": cl_slug,
                "category_slug": category_slug,
                "cluster_name": cl["cluster_name"],
                "cluster_theme": cl.get("cluster_theme", ""),
                "target_tier": cl.get("target_tier", "Mid-Market"),
                "product_slugs": cl.get("product_slugs", []),
                "common_pains": json.dumps(cl.get("common_pain_points", cl.get("common_pains", []))),
                "unaddressed_gaps": json.dumps(cl.get("unaddressed_gaps", [])),
                "how_it_works": json.dumps(how_it_works_data)
            })

            # Update products with cluster info
            for p_slug in cl.get("product_slugs", []):
                self.db.execute_query(
                    "UPDATE g2_products SET cluster_id = %s, cluster_name = %s WHERE slug = %s",
                    (cl_slug, cl["cluster_name"], p_slug)
                )

        logging.info(f"Successfully persisted {len(clusters)} competitor clusters for '{category_name}'.")
        return clusters

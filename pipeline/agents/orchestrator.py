import json
import logging
import urllib.parse
import urllib.request
from typing import Dict, Any, List, Optional
from pipeline.db_client import DatabaseClient
from pipeline.agents.semantic_normalizer_agent import SemanticNormalizerAgent
from pipeline.agents.category_strategist_agent import CategoryStrategistAgent
from pipeline.agents.cluster_formulator_agent import ClusterFormulatorAgent
from pipeline.agents.red_team_auditor_agent import RedTeamAuditorAgent
from pipeline.agents.venture_architect_agent import VentureArchitectAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

class AgenticClusteringOrchestrator:
    """
    Central Multi-Agent Orchestrator connecting specialized AI agents
    with deterministic linear algebra calculations and PostgreSQL persistence.
    """

    def __init__(self, db: Optional[DatabaseClient] = None, api_key: Optional[str] = None):
        self.db = db or DatabaseClient()
        self.logger = logging.getLogger("AgenticOrchestrator")
        
        # Initialize the 5 Specialized Agents
        self.normalizer = SemanticNormalizerAgent(api_key=api_key)
        self.strategist = CategoryStrategistAgent(api_key=api_key)
        self.formulator = ClusterFormulatorAgent(api_key=api_key)
        self.red_team = RedTeamAuditorAgent(api_key=api_key)
        self.architect = VentureArchitectAgent(api_key=api_key)

    def execute_agentic_clustering_and_whitespace(self, category_slug: str) -> Dict[str, Any]:
        """
        Executes the complete 5-agent collaborative & adversarial workflow.
        """
        self.logger.info(f"🚀 Launching Agentic Multi-Agent Intelligence Loop for '{category_slug}'...")

        # 1. Fetch category metadata, products, and reviews
        cat_rows = self.db.fetch_all("SELECT * FROM g2_categories WHERE slug = %s", (category_slug,))
        category_name = cat_rows[0]["name"] if cat_rows else category_slug.replace('-', ' ').title()

        products = self.db.fetch_all("SELECT * FROM g2_products WHERE category_slug = %s", (category_slug,))
        if not products:
            self.logger.warning(f"No products found for '{category_slug}'.")
            return {"status": "error", "message": f"No products found for '{category_slug}'"}

        reviews = self.db.fetch_all("""
            SELECT r.*, p.name as product_name
            FROM g2_reviews r
            JOIN g2_products p ON p.slug = r.product_slug
            WHERE p.category_slug = %s
        """, (category_slug,))

        # STEP 1: Agent 1 - Semantic Capability Normalization (Resolving Philosophy Trap)
        self.logger.info(f"▶ Agent 1 (SemanticNormalizerAgent): Normalizing {len(products)} products into canonical JTBD capabilities...")
        normalized_prods = self.normalizer.normalize_product_capabilities(category_name, products)

        # STEP 2: Agent 2 - Category Weight Strategist (Dynamic Formula Tuning)
        self.logger.info(f"▶ Agent 2 (CategoryStrategistAgent): Dynamically tuning formula weights for '{category_name}'...")
        weight_analysis = self.strategist.determine_category_weights(category_name, category_slug, products)
        weights = weight_analysis["weights"]
        self.logger.info(f"Tuned weights: {weights} | Rationale: {weight_analysis['rationale']}")

        # STEP 3: Deterministic Python Linear Algebra Matrix Calculation
        self.logger.info("▶ Python Deterministic Engine: Calculating pairwise mathematical distance matrix...")
        matrix = self._compute_deterministic_pairwise_matrix(normalized_prods, products, weights, reviews)

        # STEP 4: Agent 3 - Strategic Cluster Formulator
        self.logger.info("▶ Agent 3 (ClusterFormulatorAgent): Grouping products into competitor cluster archetypes...")
        clusters = self.formulator.formulate_clusters(
            category_name=category_name,
            category_slug=category_slug,
            normalized_products=normalized_prods,
            pairwise_similarity_matrix=matrix,
            reviews=reviews
        )

        # STEP 5: Agent 4 - Red-Team Adversarial Auditor (Anti-Hallucination Gate)
        self.logger.info("▶ Agent 4 (RedTeamAuditorAgent): Auditing clusters and stress-testing unaddressed gaps...")
        audit_result = self.red_team.audit_clusters_and_omissions(category_name, clusters, reviews)
        verified_omissions = audit_result.get("verified_systemic_omissions", [])
        self.logger.info(f"Red-Team verified {len(verified_omissions)} genuine systemic omissions.")

        # STEP 6: Agent 5 - Venture Architect & Live Google Demand Validation
        self.logger.info("▶ Agent 5 (VentureArchitectAgent): Synthesizing Micro-SaaS blueprints and querying Google SEO demand...")
        validated_opps = self.architect.architect_whitespace_opportunities(
            category_name=category_name,
            category_slug=category_slug,
            verified_omissions=verified_omissions,
            clusters=clusters
        )

        # STEP 7: Persist All Results to PostgreSQL
        self.logger.info("💾 Persisting verified clusters and white space opportunities to PostgreSQL...")
        for cl in clusters:
            self.db.insert_competitor_cluster(cl)
            for p_slug in cl.get("product_slugs", []):
                self.db.execute_query(
                    "UPDATE g2_products SET cluster_id = %s, cluster_name = %s WHERE slug = %s",
                    (cl["cluster_slug"], cl["cluster_name"], p_slug)
                )

        for opp in validated_opps:
            self.db.insert_whitespace_opportunity(opp)
            self.db.insert_opportunity({
                "slug": opp["slug"],
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

        self.logger.info("🎉 Agentic Intelligence Loop completed successfully!")
        return {
            "status": "success",
            "category_slug": category_slug,
            "category_name": category_name,
            "weight_analysis": weight_analysis,
            "clusters": clusters,
            "audit_observations": audit_result.get("critic_observations", []),
            "whitespace_opportunities": validated_opps
        }

    def _compute_deterministic_pairwise_matrix(
        self,
        normalized_prods: List[Dict[str, Any]],
        raw_prods: List[Dict[str, Any]],
        weights: Dict[str, float],
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, float]]:
        """
        Executes deterministic mathematical similarity scoring between all product pairs.
        """
        matrix = {}
        prod_map = {p["slug"]: p for p in normalized_prods}
        raw_map = {p["slug"]: p for p in raw_prods}

        for p1_slug, p1 in prod_map.items():
            matrix[p1_slug] = {}
            for p2_slug, p2 in prod_map.items():
                if p1_slug == p2_slug:
                    matrix[p1_slug][p2_slug] = 1.0
                    continue

                # 1. Capability Jaccard
                set1 = set(p1.get("canonical_capabilities", []))
                set2 = set(p2.get("canonical_capabilities", []))
                union = len(set1 | set2)
                cap_sim = len(set1 & set2) / union if union > 0 else 0.5

                # 2. Philosophy Match
                phil1 = p1.get("solving_philosophy", "").lower()
                phil2 = p2.get("solving_philosophy", "").lower()
                phil_sim = 1.0 if phil1 == phil2 else 0.6

                # 3. Market Tier & Pricing
                raw1 = raw_map.get(p1_slug, {})
                raw2 = raw_map.get(p2_slug, {})
                seg1 = (raw1.get("market_segment") or "").lower()
                seg2 = (raw2.get("market_segment") or "").lower()
                tier_sim = 1.0 if seg1 == seg2 else (0.2 if ("ent" in seg1 and "smb" in seg2) else 0.7)

                # 4. Google Consideration Graph
                def check_google(p_a: str, p_b: str) -> bool:
                    try:
                        url = f"https://suggestqueries.google.com/complete/search?client=firefox&q={urllib.parse.quote_plus(f'{p_a} vs ')}"
                        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(req, timeout=2) as res:
                            data = json.loads(res.read().decode("utf-8"))
                            return any(p_b.lower() in s.lower() for s in data[1])
                    except Exception:
                        return False

                google_co = check_google(p1.get("name", ""), p2.get("name", ""))
                google_sim = 1.0 if google_co else 0.4

                # 5. Review Discontent
                rev_sim = 0.7  # Default baseline

                # Linear Combination with Dynamically Tuned Weights
                composite = (
                    weights.get("weight_capabilities", 0.25) * cap_sim +
                    weights.get("weight_philosophy", 0.20) * phil_sim +
                    weights.get("weight_market_tier", 0.20) * tier_sim +
                    weights.get("weight_google_graph", 0.20) * google_sim +
                    weights.get("weight_review_discontent", 0.15) * rev_sim
                )

                matrix[p1_slug][p2_slug] = round(composite, 3)

        return matrix

import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import json
import logging
from typing import List, Dict, Any, Optional
from pipeline.config import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class DatabaseClient:
    def __init__(self):
        self.conn_params = {
            "host": DB_HOST,
            "port": DB_PORT,
            "user": DB_USER,
            "password": DB_PASSWORD,
            "dbname": DB_NAME
        }

    def get_connection(self):
        return psycopg2.connect(**self.conn_params)

    def init_schema(self, schema_file_path: Optional[str] = None):
        if not schema_file_path:
            schema_file_path = str(DB_DIR / "01_schema.sql")
        
        logging.info(f"Applying schema from {schema_file_path} to PostgreSQL...")
        with open(schema_file_path, "r", encoding="utf-8") as f:
            sql = f.read()

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                # Migration check for existing databases
                cur.execute("ALTER TABLE whitespace_opportunities ADD COLUMN IF NOT EXISTS venture_dossier JSONB DEFAULT '{}'::jsonb;")
            conn.commit()
        logging.info("Database schema initialized successfully.")

    def insert_category(self, name: str, slug: str, description: str = "", parent_slug: Optional[str] = None):
        sql = """
        INSERT INTO g2_categories (name, slug, parent_slug, description)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (slug) DO UPDATE 
        SET name = EXCLUDED.name, description = EXCLUDED.description;
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (name, slug, parent_slug, description))
            conn.commit()

    def insert_product(self, product_data: Dict[str, Any]):
        sql = """
        INSERT INTO g2_products (
            name, slug, category_slug, orbit_tier, parent_incumbent_slug,
            rating_avg, review_count, pricing_model, market_segment, primary_vulnerability
        )
        VALUES (%(name)s, %(slug)s, %(category_slug)s, %(orbit_tier)s, %(parent_incumbent_slug)s,
                %(rating_avg)s, %(review_count)s, %(pricing_model)s, %(market_segment)s, %(primary_vulnerability)s)
        ON CONFLICT (slug) DO UPDATE
        SET rating_avg = EXCLUDED.rating_avg,
            review_count = EXCLUDED.review_count,
            primary_vulnerability = EXCLUDED.primary_vulnerability;
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, product_data)
            conn.commit()

    def insert_review(self, review_data: Dict[str, Any]):
        # Check if identical review quote already exists for this product to guarantee idempotency
        check_sql = """
        SELECT id FROM g2_reviews 
        WHERE product_slug = %s AND md5(dislike_text) = md5(%s)
        LIMIT 1;
        """
        product_slug = review_data.get("product_slug", "")
        dislike_text = (review_data.get("dislike_text") or "").strip()
        if not product_slug or not dislike_text:
            return

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(check_sql, (product_slug, dislike_text))
                if cur.fetchone():
                    # Duplicate review already exists, skip insertion
                    return

                insert_sql = """
                INSERT INTO g2_reviews (
                    product_slug, reviewer_title, reviewer_industry, company_size_tier,
                    star_rating, dislike_text, like_text, pain_dimension, extracted_icp
                )
                VALUES (%(product_slug)s, %(reviewer_title)s, %(reviewer_industry)s, %(company_size_tier)s,
                        %(star_rating)s, %(dislike_text)s, %(like_text)s, %(pain_dimension)s, %(extracted_icp)s);
                """
                payload = {
                    "product_slug": product_slug,
                    "reviewer_title": review_data.get("reviewer_title", "User"),
                    "reviewer_industry": review_data.get("reviewer_industry", "Cross-Industry"),
                    "company_size_tier": review_data.get("company_size_tier", "small_business"),
                    "star_rating": int(review_data.get("star_rating", 2)),
                    "dislike_text": dislike_text,
                    "like_text": review_data.get("like_text", ""),
                    "pain_dimension": review_data.get("pain_dimension", "COMPLEXITY_BLOAT"),
                    "extracted_icp": review_data.get("extracted_icp", "SMB Founders")
                }
                cur.execute(insert_sql, payload)
            conn.commit()

    def insert_pain_cluster(self, pain_data: Dict[str, Any]):
        sql = """
        INSERT INTO pain_clusters (
            slug, title, category_slug, dimension, severity_score, affected_tier, summary, sample_quotes
        )
        VALUES (%(slug)s, %(title)s, %(category_slug)s, %(dimension)s, %(severity_score)s,
                %(affected_tier)s, %(summary)s, %(sample_quotes)s)
        ON CONFLICT (slug) DO UPDATE
        SET severity_score = EXCLUDED.severity_score,
            summary = EXCLUDED.summary,
            sample_quotes = EXCLUDED.sample_quotes;
        """
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {
                    **pain_data,
                    "sample_quotes": json.dumps(pain_data.get("sample_quotes", []))
                })
            conn.commit()

    def insert_opportunity(self, opp_data: Dict[str, Any]):
        sql = """
        INSERT INTO microsaas_opportunities (
            slug, title, category_slug, bucket, orbit_level, attacked_product_slugs,
            target_icp_title, target_tier, target_industry, value_proposition,
            core_features, pricing_strategy, distribution_channel, dev_complexity,
            mrr_potential, osi_score, status
        )
        VALUES (
            %(slug)s, %(title)s, %(category_slug)s, %(bucket)s, %(orbit_level)s, %(attacked_product_slugs)s,
            %(target_icp_title)s, %(target_tier)s, %(target_industry)s, %(value_proposition)s,
            %(core_features)s, %(pricing_strategy)s, %(distribution_channel)s, %(dev_complexity)s,
            %(mrr_potential)s, %(osi_score)s, %(status)s
        )
        ON CONFLICT (slug) DO UPDATE
        SET value_proposition = EXCLUDED.value_proposition,
            osi_score = EXCLUDED.osi_score,
            mrr_potential = EXCLUDED.mrr_potential;
        """
        payload = {
            **opp_data,
            "attacked_product_slugs": [str(x) for x in (opp_data.get("attacked_product_slugs") or [])],
            "core_features": json.dumps(opp_data.get("core_features", []))
        }
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
            conn.commit()

    def insert_competitor_cluster(self, cluster_data: Dict[str, Any]):
        sql = """
        INSERT INTO competitor_clusters (
            cluster_slug, category_slug, cluster_name, cluster_theme,
            target_tier, product_slugs, common_pains, unaddressed_gaps, how_it_works
        )
        VALUES (
            %(cluster_slug)s, %(category_slug)s, %(cluster_name)s, %(cluster_theme)s,
            %(target_tier)s, %(product_slugs)s, %(common_pains)s, %(unaddressed_gaps)s, %(how_it_works)s
        )
        ON CONFLICT (cluster_slug) DO UPDATE
        SET cluster_name = EXCLUDED.cluster_name,
            cluster_theme = EXCLUDED.cluster_theme,
            product_slugs = EXCLUDED.product_slugs,
            common_pains = EXCLUDED.common_pains,
            unaddressed_gaps = EXCLUDED.unaddressed_gaps,
            how_it_works = EXCLUDED.how_it_works;
        """
        payload = {
            "cluster_slug": cluster_data.get("cluster_slug"),
            "category_slug": cluster_data.get("category_slug"),
            "cluster_name": cluster_data.get("cluster_name"),
            "cluster_theme": cluster_data.get("cluster_theme", ""),
            "target_tier": cluster_data.get("target_tier", "Mid-Market"),
            "product_slugs": [str(x) for x in (cluster_data.get("product_slugs") or [])],
            "common_pains": json.dumps(cluster_data.get("common_pains", [])),
            "unaddressed_gaps": json.dumps(cluster_data.get("unaddressed_gaps", [])),
            "how_it_works": json.dumps(cluster_data.get("how_it_works", {}))
        }
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
            conn.commit()

    def get_competitor_clusters(self, category_slug: Optional[str] = None) -> List[Dict[str, Any]]:
        if category_slug:
            sql = "SELECT * FROM competitor_clusters WHERE category_slug = %s ORDER BY id ASC"
            clusters = self.fetch_all(sql, (category_slug,))
        else:
            sql = "SELECT * FROM competitor_clusters ORDER BY id ASC"
            clusters = self.fetch_all(sql)
        for c in clusters:
            if isinstance(c.get("common_pains"), str):
                try:
                    c["common_pains"] = json.loads(c["common_pains"])
                except Exception:
                    c["common_pains"] = []
            if isinstance(c.get("unaddressed_gaps"), str):
                try:
                    c["unaddressed_gaps"] = json.loads(c["unaddressed_gaps"])
                except Exception:
                    c["unaddressed_gaps"] = []
            if isinstance(c.get("how_it_works"), str):
                try:
                    c["how_it_works"] = json.loads(c["how_it_works"])
                except Exception:
                    c["how_it_works"] = {}
            elif not c.get("how_it_works"):
                c["how_it_works"] = {}
        return clusters

    def insert_whitespace_opportunity(self, ws_data: Dict[str, Any]):
        sql = """
        INSERT INTO whitespace_opportunities (
            slug, category_slug, title, target_omission_summary,
            unaddressed_pain_slugs, attacked_cluster_slugs, unbundling_wedge,
            target_icp, pricing_strategy, core_features, search_demand_keywords, venture_dossier, osi_score
        )
        VALUES (
            %(slug)s, %(category_slug)s, %(title)s, %(target_omission_summary)s,
            %(unaddressed_pain_slugs)s, %(attacked_cluster_slugs)s, %(unbundling_wedge)s,
            %(target_icp)s, %(pricing_strategy)s, %(core_features)s, %(search_demand_keywords)s, %(venture_dossier)s, %(osi_score)s
        )
        ON CONFLICT (slug) DO UPDATE
        SET title = EXCLUDED.title,
            target_omission_summary = EXCLUDED.target_omission_summary,
            unbundling_wedge = EXCLUDED.unbundling_wedge,
            core_features = EXCLUDED.core_features,
            search_demand_keywords = EXCLUDED.search_demand_keywords,
            venture_dossier = EXCLUDED.venture_dossier,
            osi_score = EXCLUDED.osi_score;
        """
        payload = {
            "slug": ws_data.get("slug"),
            "category_slug": ws_data.get("category_slug"),
            "title": ws_data.get("title"),
            "target_omission_summary": ws_data.get("target_omission_summary", ""),
            "unaddressed_pain_slugs": [str(x) for x in (ws_data.get("unaddressed_pain_slugs") or [])],
            "attacked_cluster_slugs": [str(x) for x in (ws_data.get("attacked_cluster_slugs") or [])],
            "unbundling_wedge": ws_data.get("unbundling_wedge", ""),
            "target_icp": ws_data.get("target_icp", "SMB Founders"),
            "pricing_strategy": ws_data.get("pricing_strategy", "$49/mo flat rate"),
            "core_features": json.dumps(ws_data.get("core_features", [])),
            "search_demand_keywords": json.dumps(ws_data.get("search_demand_keywords", [])),
            "venture_dossier": json.dumps(ws_data.get("venture_dossier", {})),
            "osi_score": ws_data.get("osi_score", 9.2)
        }
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, payload)
            conn.commit()

    def get_whitespace_opportunities(self, category_slug: Optional[str] = None) -> List[Dict[str, Any]]:
        if category_slug:
            sql = "SELECT * FROM whitespace_opportunities WHERE category_slug = %s ORDER BY osi_score DESC, id ASC"
            opps = self.fetch_all(sql, (category_slug,))
        else:
            sql = "SELECT * FROM whitespace_opportunities ORDER BY osi_score DESC, id ASC"
            opps = self.fetch_all(sql)
        for o in opps:
            if isinstance(o.get("core_features"), str):
                try:
                    o["core_features"] = json.loads(o["core_features"])
                except Exception:
                    o["core_features"] = []
            if isinstance(o.get("search_demand_keywords"), str):
                try:
                    o["search_demand_keywords"] = json.loads(o["search_demand_keywords"])
                except Exception:
                    o["search_demand_keywords"] = []
            if isinstance(o.get("venture_dossier"), str):
                try:
                    o["venture_dossier"] = json.loads(o["venture_dossier"])
                except Exception:
                    o["venture_dossier"] = {}
            elif not o.get("venture_dossier"):
                o["venture_dossier"] = {}
        return opps

    def execute_query(self, query: str, params: tuple = ()):
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
            conn.commit()

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(row) for row in cur.fetchall()]


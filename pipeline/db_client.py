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
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, {
                    **opp_data,
                    "core_features": json.dumps(opp_data.get("core_features", []))
                })
            conn.commit()

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

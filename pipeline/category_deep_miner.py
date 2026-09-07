import logging
import argparse
from typing import List, Dict, Any
from pipeline.db_client import DatabaseClient
from pipeline.obsidian_exporter import ObsidianExporter
from pipeline.gemini_analyzer import GeminiSaaSExtractor
from pipeline.analyzer import PainAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Pre-packaged verified dataset for foundational SaaS categories
CATEGORY_DATASETS = {
    "accounting": {
        "category_name": "Accounting Software",
        "category_slug": "accounting",
        "description": "General ledger, invoicing, expense tracking, and financial reconciliation software.",
        "products": [
            {
                "name": "QuickBooks Online",
                "slug": "quickbooks-online",
                "category_slug": "accounting",
                "category_name": "Accounting Software",
                "orbit_tier": "0_behemoth",
                "parent_incumbent_slug": None,
                "parent_incumbent_name": "",
                "rating_avg": 4.0,
                "review_count": 29800,
                "pricing_model": "per_month_price_creep",
                "market_segment": "SMB to Mid-Market",
                "primary_vulnerability": "Predatory price creep once data is locked in; essential features locked behind advanced tiers; intrusive AI addons."
            },
            {
                "name": "Xero",
                "slug": "xero",
                "category_slug": "accounting",
                "category_name": "Accounting Software",
                "orbit_tier": "1_challenger",
                "parent_incumbent_slug": "quickbooks-online",
                "parent_incumbent_name": "QuickBooks Online",
                "rating_avg": 4.3,
                "review_count": 6400,
                "pricing_model": "tiered_subscription",
                "market_segment": "Small Business",
                "primary_vulnerability": "Steep setup configuration; custom financial reporting exports require tedious manual adjustments."
            },
            {
                "name": "FreshBooks",
                "slug": "freshbooks",
                "category_slug": "accounting",
                "category_name": "Accounting Software",
                "orbit_tier": "1_challenger",
                "parent_incumbent_slug": "quickbooks-online",
                "parent_incumbent_name": "QuickBooks Online",
                "rating_avg": 4.5,
                "review_count": 4500,
                "pricing_model": "client_count_cap",
                "market_segment": "Freelancers & Micro-SMB",
                "primary_vulnerability": "Penalizes growing freelancers with strict client-count caps; immediate loss of access to historical invoice records upon cancellation."
            }
        ],
        "reviews": [
            {
                "product_slug": "quickbooks-online",
                "product_name": "QuickBooks Online",
                "reviewer_title": "E-Commerce Founder",
                "reviewer_industry": "Retail & E-Commerce",
                "company_size_tier": "small_business",
                "star_rating": 2,
                "dislike_text": "QuickBooks steadily increases their subscription price every 8 months. Once your historical ledger is inside, it feels like predatory lock-in. Furthermore, basic automated inventory reconciliation requires their most expensive tier.",
                "like_text": "Bank feed integrations are standard.",
                "pain_dimension": "PRICING_TRAP",
                "extracted_icp": "Shopify Store Founders"
            },
            {
                "product_slug": "quickbooks-online",
                "product_name": "QuickBooks Online",
                "reviewer_title": "Consulting Agency Owner",
                "reviewer_industry": "Management Consulting",
                "company_size_tier": "small_business",
                "star_rating": 3,
                "dislike_text": "The UI updates have made simple invoice creation cluttered with AI suggestions and upsells. We just want a fast way to send a bill and get paid without navigating 12 sub-menus.",
                "like_text": "Accountant access is easy.",
                "pain_dimension": "COMPLEXITY_BLOAT",
                "extracted_icp": "Solo Consultants"
            },
            {
                "product_slug": "freshbooks",
                "product_name": "FreshBooks",
                "reviewer_title": "Freelance UI/UX Designer",
                "reviewer_industry": "Design & Tech",
                "company_size_tier": "small_business",
                "star_rating": 2,
                "dislike_text": "Charging by the number of active clients is absurd for freelancers who work with 30 small clients a year. If you cancel or pause your plan in a slow month, they immediately lock you out of your historical invoice PDFs.",
                "like_text": "Invoices look clean.",
                "pain_dimension": "PRICING_TRAP",
                "extracted_icp": "Freelance Creatives"
            },
            {
                "product_slug": "xero",
                "product_name": "Xero",
                "reviewer_title": "Head of Finance",
                "reviewer_industry": "B2B SaaS",
                "company_size_tier": "mid_market",
                "star_rating": 3,
                "dislike_text": "Custom reporting is frustratingly rigid. Pulling multi-currency Stripe revenue breakdowns into customized investor spreadsheets requires hours of CSV cleanup.",
                "like_text": "Good bank rules engine.",
                "pain_dimension": "INTEGRATION_GAP",
                "extracted_icp": "Startup Finance Leads"
            },
            {
                "product_slug": "quickbooks-online",
                "product_name": "QuickBooks Online",
                "reviewer_title": "Corporate Controller",
                "reviewer_industry": "Manufacturing",
                "company_size_tier": "enterprise",
                "star_rating": 3,
                "dislike_text": "Lacks multi-subsidiary automated intercompany eliminations and consolidated audit trails required for enterprise GAAP compliance.",
                "like_text": "Enterprise tax filing support.",
                "pain_dimension": "COMPLIANCE_RESTRICTION",
                "extracted_icp": "Enterprise Controllers"
            }
        ]
    }
}

def mine_category(category_slug: str):
    db = DatabaseClient()
    exporter = ObsidianExporter()
    extractor = GeminiSaaSExtractor()

    dataset = CATEGORY_DATASETS.get(category_slug)
    if not dataset:
        logging.warning(f"No local preset found for '{category_slug}'. Querying database metadata...")
        cat_rows = db.fetch_all("SELECT name, slug, description FROM g2_categories WHERE slug = %s", (category_slug,))
        if not cat_rows:
            logging.error(f"Category slug '{category_slug}' does not exist in database.")
            return
        cat = cat_rows[0]
        dataset = {
            "category_name": cat["name"],
            "category_slug": cat["slug"],
            "description": cat["description"] or f"G2 category {cat['name']}",
            "products": [],
            "reviews": []
        }

    category_name = dataset["category_name"]
    products = dataset["products"]
    reviews = dataset["reviews"]

    logging.info(f"🚀 Starting deep mining & AI extraction for: '{category_name}' ({category_slug})")

    # Step 1: Insert Products into PostgreSQL
    for p in products:
        db.insert_product(p)

    # Step 2: Insert Raw Reviews into PostgreSQL
    for r in reviews:
        db.insert_review(r)

    # Step 3: Run AI & Orbit Extraction Engine
    extracted_data = extractor.analyze_category_cluster(
        category_name=category_name,
        category_slug=category_slug,
        products=products,
        reviews=reviews
    )

    pain_clusters = extracted_data.get("pain_clusters", [])
    opportunities = extracted_data.get("opportunities", [])

    logging.info(f"✨ AI Extraction Complete: {len(pain_clusters)} Pain Clusters, {len(opportunities)} Micro-SaaS Opportunities.")

    # Step 4: Persist Pain Clusters & Export to Obsidian
    for pc in pain_clusters:
        db.insert_pain_cluster(pc)
        exporter.export_pain_cluster(pc, pc.get("affected_products", []), pc.get("linked_opps", []))

    # Step 5: Persist Opportunities & Export to Obsidian
    for opp in opportunities:
        db.insert_opportunity(opp)
        exporter.export_opportunity(opp)

    # Step 6: Export Product Notes with Triaged Reviews
    for p in products:
        p_reviews = [r for r in reviews if r["product_slug"] == p["slug"]]
        triaged = PainAnalyzer.triage_reviews_by_tier(p_reviews)
        linked_p = [pc["title"] for pc in pain_clusters if p["name"] in pc.get("affected_products", [])]
        linked_o = [opp["title"] for opp in opportunities if p["name"] in opp.get("attacked_products", [])]
        exporter.export_product(p, triaged, linked_p, linked_o)

    # Step 7: Update Category Map of Content (MOC)
    exporter.export_category({"name": category_name, "slug": category_slug, "description": dataset.get("description")}, products)

    logging.info(f"🎉 Successfully mined and updated Obsidian notes for '{category_name}'!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Deep Category Miner for G2 Micro-SaaS Intelligence")
    parser.add_argument("--category", type=str, default="accounting", help="Category slug to mine (e.g. accounting)")
    args = parser.parse_args()
    mine_category(args.category)

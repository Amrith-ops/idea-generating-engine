import logging
from pipeline.db_client import DatabaseClient
from pipeline.obsidian_exporter import ObsidianExporter
from pipeline.analyzer import PainAnalyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def run_seed():
    db = DatabaseClient()
    exporter = ObsidianExporter()

    logging.info("Step 1: Initializing Database Schema...")
    db.init_schema()

    logging.info("Step 2: Initializing Obsidian Vault Folders & Playbooks...")
    exporter.init_vault_structure()
    exporter.export_playbooks()
    exporter.export_dashboards()
    exporter.export_canvas()

    logging.info("Step 3: Seeding G2 Categories...")
    category = {
        "name": "CRM Software",
        "slug": "crm-software",
        "description": "Customer Relationship Management platforms for managing leads, deals, pipelines, and customer communication.",
        "parent_slug": None
    }
    db.insert_category(category["name"], category["slug"], category["description"])

    logging.info("Step 4: Seeding Products across Orbit Levels...")
    products = [
        {
            "name": "Salesforce Sales Cloud",
            "slug": "salesforce",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "orbit_tier": "0_behemoth",
            "parent_incumbent_slug": None,
            "parent_incumbent_name": "",
            "rating_avg": 4.1,
            "review_count": 18450,
            "pricing_model": "per_seat_annual",
            "market_segment": "Enterprise",
            "primary_vulnerability": "Extreme complexity bloat, steep learning curve, requires dedicated admin consultants."
        },
        {
            "name": "HubSpot Sales Hub",
            "slug": "hubspot",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "orbit_tier": "1_challenger",
            "parent_incumbent_slug": "salesforce",
            "parent_incumbent_name": "Salesforce Sales Cloud",
            "rating_avg": 4.4,
            "review_count": 11200,
            "pricing_model": "freemium_to_enterprise_cliff",
            "market_segment": "Mid-Market / SMB",
            "primary_vulnerability": "Sudden pricing cliff ($20/mo starter jumps to $800/mo pro); features locked behind enterprise gates."
        },
        {
            "name": "Pipedrive",
            "slug": "pipedrive",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "orbit_tier": "1_challenger",
            "parent_incumbent_slug": "salesforce",
            "parent_incumbent_name": "Salesforce Sales Cloud",
            "rating_avg": 4.2,
            "review_count": 5100,
            "pricing_model": "per_seat_monthly",
            "market_segment": "Small Business",
            "primary_vulnerability": "Lacks native mobile messaging (WhatsApp/Telegram) and audio note transcriptions for international sales reps."
        }
    ]

    for p in products:
        db.insert_product(p)

    logging.info("Step 5: Seeding Triaged G2 Reviews (Small Business vs Mid-Market vs Enterprise)...")
    reviews = [
        # Salesforce Small Business Pain
        {
            "product_slug": "salesforce",
            "reviewer_title": "Founder & CEO",
            "reviewer_industry": "Software Agency",
            "company_size_tier": "small_business",
            "star_rating": 2,
            "dislike_text": "Salesforce is total overkill for our 6-person agency. We only wanted to track 15 active client deals, but spent $5,000 on an external consultant just to customize our fields. The interface is slow, cluttered, and confusing.",
            "like_text": "Customizable reports if you know how to write queries.",
            "pain_dimension": "COMPLEXITY_BLOAT",
            "extracted_icp": "B2B Boutique Agency Founders"
        },
        # Salesforce Enterprise (Anti-Pattern)
        {
            "product_slug": "salesforce",
            "reviewer_title": "VP of Enterprise Systems",
            "reviewer_industry": "Financial Services",
            "company_size_tier": "enterprise",
            "star_rating": 3,
            "dislike_text": "Audit log exports take over 24 hours to generate and the SOC2 automated compliance reporting lacks multi-region replication controls.",
            "like_text": "Massive ecosystem and enterprise SSO governance.",
            "pain_dimension": "COMPLIANCE_RESTRICTION",
            "extracted_icp": "Fortune 500 IT Directors"
        },
        # HubSpot Small Business Pain
        {
            "product_slug": "hubspot",
            "reviewer_title": "Marketing Director",
            "reviewer_industry": "E-Commerce",
            "company_size_tier": "small_business",
            "star_rating": 2,
            "dislike_text": "The starter plan for $20 was great until we needed 1 basic automated email sequence and a custom reporting filter. Suddenly we were forced to upgrade to the $800/month Pro tier. The pricing jumps are predatory.",
            "like_text": "Clean user interface and good email templates.",
            "pain_dimension": "PRICING_TRAP",
            "extracted_icp": "Bootstrapped E-Commerce Store Owners"
        },
        # Pipedrive Small Business Pain
        {
            "product_slug": "pipedrive",
            "reviewer_title": "Real Estate Broker",
            "reviewer_industry": "Real Estate",
            "company_size_tier": "small_business",
            "star_rating": 3,
            "dislike_text": "Our agents close 90% of deals over WhatsApp and voice notes. Pipedrive forces us to manually type meeting summaries on desktop. There is no native WhatsApp audio note transcription into deal timelines.",
            "like_text": "Great visual Kanban pipeline.",
            "pain_dimension": "INTEGRATION_GAP",
            "extracted_icp": "Real Estate Agents & Brokers"
        }
    ]

    for r in reviews:
        db.insert_review(r)

    logging.info("Step 6: Seeding Pain Clusters...")
    pain_clusters = [
        {
            "slug": "pain-excessive-per-seat-pricing-and-tier-cliffs",
            "title": "Pain - Hostile Per-Seat Pricing & Tier Cliffs",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "dimension": "PRICING_TRAP",
            "severity_score": 8.5,
            "affected_tier": "small_business",
            "summary": "Small business users feel blindsided by massive price jumps between basic and pro tiers (e.g. $20/mo jumping directly to $800/mo) and per-seat taxes that penalize team growth.",
            "sample_quotes": [
                "Suddenly we were forced to upgrade to the $800/month Pro tier for one basic automation.",
                "Per-seat pricing means we have to share logins, which breaks accountability."
            ],
            "affected_products": ["HubSpot Sales Hub", "Salesforce Sales Cloud"],
            "linked_opps": ["Opp - Flat-Rate Linear-Style CRM for 5-Person Dev Agencies"]
        },
        {
            "slug": "pain-missing-whatsapp-voice-note-sync",
            "title": "Pain - CRM WhatsApp Audio Note Sync Deficit",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "dimension": "INTEGRATION_GAP",
            "severity_score": 9.0,
            "affected_tier": "small_business",
            "summary": "Modern sales reps in high-velocity niches (Real Estate, Auto, LATAM/EU commerce) communicate via WhatsApp voice notes, but CRMs require tedious desktop manual text typing.",
            "sample_quotes": [
                "Our agents close 90% of deals over WhatsApp voice notes. There is no automated sync into deal timelines.",
                "Typing notes at the end of the day leads to lost client data."
            ],
            "affected_products": ["Pipedrive", "HubSpot Sales Hub"],
            "linked_opps": ["Opp - WhatsApp Audio & Deal Bridge for Pipedrive"]
        }
    ]

    for pc in pain_clusters:
        db.insert_pain_cluster(pc)
        exporter.export_pain_cluster(pc, pc["affected_products"], pc["linked_opps"])

    logging.info("Step 7: Seeding Scored Micro-SaaS Opportunities...")
    opportunities = [
        {
            "slug": "opp-flat-rate-linear-style-crm-for-dev-agencies",
            "title": "Opp - Flat-Rate Linear-Style CRM for 5-Person Dev Agencies",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "bucket": "The Unbundler",
            "orbit_level": "2_satellite",
            "attacked_product_slugs": ["salesforce", "hubspot"],
            "attacked_products": ["Salesforce Sales Cloud", "HubSpot Sales Hub"],
            "target_icp_title": "B2B Software & Design Agency Founders",
            "target_tier": "small_business",
            "target_industry": "Digital Agencies & Dev Shops",
            "value_proposition": "A keyboard-first, zero-bloat pipeline manager designed like Linear. No setup consultants, no enterprise bloat, and a flat $49/mo for up to 10 team members.",
            "core_features": [
                "Keyboard-shortcut driven visual deal pipeline (Cmd+K navigation)",
                "Instant client proposal & Stripe deposit link generator",
                "Automated Gmail/Google Workspace deal thread tracking",
                "Flat-rate pricing ($49/mo unlimited seats)"
            ],
            "pricing_strategy": "$49/month flat rate (unlimited team seats)",
            "distribution_channel": "Product Hunt, Indie Hackers, Twitter/X agency community, GitHub README sponsorships",
            "dev_complexity": 2,
            "mrr_potential": "$15,000 - $40,000/mo",
            "osi_score": 9.2,
            "status": "idea_validated"
        },
        {
            "slug": "opp-whatsapp-audio-and-deal-bridge-for-pipedrive",
            "title": "Opp - WhatsApp Audio & Deal Bridge for Pipedrive",
            "category_slug": "crm-software",
            "category_name": "CRM Software",
            "bucket": "The Bridge & Sync",
            "orbit_level": "2_satellite",
            "attacked_product_slugs": ["pipedrive"],
            "attacked_products": ["Pipedrive"],
            "target_icp_title": "Real Estate Brokers & WhatsApp Sales Teams",
            "target_tier": "small_business",
            "target_industry": "Real Estate & High-Ticket B2C",
            "value_proposition": "A WhatsApp Web extension that automatically transcribes voice notes using AI and logs structured meeting summaries and deal stages directly into Pipedrive.",
            "core_features": [
                "WhatsApp Web Chrome extension with 1-click Pipedrive widget",
                "AI voice note speech-to-text with auto-summary extraction",
                "Instant Pipedrive deal creation from WhatsApp chat contact",
                "Two-way message logging on deal timeline"
            ],
            "pricing_strategy": "$29/month per agent or $99/mo team pass",
            "distribution_channel": "Pipedrive App Marketplace, Chrome Web Store, Real Estate agent Facebook groups",
            "dev_complexity": 1,
            "mrr_potential": "$10,000 - $25,000/mo",
            "osi_score": 8.8,
            "status": "idea_validated"
        }
    ]

    for opp in opportunities:
        db.insert_opportunity(opp)
        exporter.export_opportunity(opp)

    logging.info("Step 8: Exporting Category & Product Notes...")
    exporter.export_category(category, products)

    # Group reviews and export products
    for p in products:
        p_reviews = [r for r in reviews if r["product_slug"] == p["slug"]]
        triaged = PainAnalyzer.triage_reviews_by_tier(p_reviews)
        linked_p = [pc["title"] for pc in pain_clusters if p["name"] in pc["affected_products"]]
        linked_o = [opp["title"] for opp in opportunities if p["name"] in opp.get("attacked_products", [])]
        exporter.export_product(p, triaged, linked_p, linked_o)

    logging.info("🎉 G2 Intelligence & Micro-SaaS Obsidian Brain successfully populated!")

if __name__ == "__main__":
    run_seed()

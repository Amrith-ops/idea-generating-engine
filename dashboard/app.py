import os
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import pipeline.config
from pipeline.db_client import DatabaseClient
from pipeline.live_review_harvester import LiveReviewHarvester

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(title="G2 Micro-SaaS AI Brain Command Center")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

db = DatabaseClient()

class MineRequest(BaseModel):
    category_slug: str
    mode: str = "subcategory"  # "root_sector" or "subcategory"
    max_subcategories: int = 3

@app.get("/api/stats")
def get_stats():
    try:
        categories_count = db.fetch_all("SELECT count(*) as count FROM g2_categories")[0]["count"]
        products_count = db.fetch_all("SELECT count(*) as count FROM g2_products")[0]["count"]
        reviews_count = db.fetch_all("SELECT count(*) as count FROM g2_reviews")[0]["count"]
        opps_count = db.fetch_all("SELECT count(*) as count FROM microsaas_opportunities")[0]["count"]
        pains_count = db.fetch_all("SELECT count(*) as count FROM pain_clusters")[0]["count"]
        
        return {
            "categories_count": categories_count,
            "products_count": products_count,
            "reviews_count": reviews_count,
            "opportunities_count": opps_count,
            "pain_clusters_count": pains_count
        }
    except Exception as e:
        logging.error(f"Error fetching stats: {e}")
        return {"error": str(e)}

@app.get("/api/opportunities")
def get_opportunities(bucket: Optional[str] = None, tier: Optional[str] = None, root_slug: Optional[str] = None):
    query = """
    SELECT o.*, c.parent_slug as root_sector_slug, p_cat.name as root_sector_name
    FROM microsaas_opportunities o
    LEFT JOIN g2_categories c ON c.slug = o.category_slug
    LEFT JOIN g2_categories p_cat ON p_cat.slug = c.parent_slug
    ORDER BY o.osi_score DESC, o.created_at DESC
    """
    opps = db.fetch_all(query)
    
    # Filter if parameters provided
    if root_slug and root_slug != "all":
        opps = [o for o in opps if o.get("root_sector_slug") == root_slug or o.get("category_slug") == root_slug]
    if bucket and bucket != "all":
        opps = [o for o in opps if bucket.lower() in o.get("bucket", "").lower()]
    if tier and tier != "all":
        opps = [o for o in opps if tier.lower() in o.get("target_tier", "").lower()]

    for o in opps:
        # Parse JSON fields if stored as string
        if isinstance(o.get("core_features"), str):
            try:
                o["core_features"] = json.loads(o["core_features"])
            except Exception:
                o["core_features"] = [o["core_features"]]
        
        # Normalize fields to eliminate undefined values across frontend
        o["unbundling_wedge"] = o.get("value_proposition") or o.get("unbundling_wedge") or "Targeted unbundling wedge against incumbent complexity"
        o["target_mrr"] = o.get("mrr_potential") or o.get("target_mrr") or "$15k - $30k/mo"
        dev_c = o.get("dev_complexity")
        o["dev_timeline_days"] = (int(dev_c) * 7 if dev_c and str(dev_c).isdigit() and int(dev_c) > 0 else 14)
        o["dev_difficulty"] = "Low (1-2 wks)" if dev_c and int(dev_c) <= 2 else "Medium (2-3 wks)" if dev_c and int(dev_c) == 3 else "Moderate"
        o["target_persona"] = o.get("target_icp_title") or o.get("target_persona") or "SMB Founders & Lean Teams"
        o["problem_statement"] = o.get("value_proposition") or o.get("problem_statement") or ""
        
    return opps

@app.get("/api/categories")
def get_categories(query: Optional[str] = None, limit: int = 100):
    if query:
        sql = """
        SELECT c.name, c.slug, c.parent_slug, c.description, p.name as parent_name
        FROM g2_categories c
        LEFT JOIN g2_categories p ON p.slug = c.parent_slug
        WHERE c.name ILIKE %s OR c.slug ILIKE %s
        LIMIT %s
        """
        return db.fetch_all(sql, (f"%{query}%", f"%{query}%", limit))
    sql = """
    SELECT c.name, c.slug, c.parent_slug, c.description, p.name as parent_name
    FROM g2_categories c
    LEFT JOIN g2_categories p ON p.slug = c.parent_slug
    ORDER BY c.id ASC LIMIT %s
    """
    return db.fetch_all(sql, (limit,))

@app.get("/api/hierarchy")
def get_category_hierarchy():
    """
    Returns the complete hierarchy of Root Sectors (Customer Service, Sales Tools, ERP, Marketing, etc.)
    along with their nested Sub-Categories and count of mined opportunities.
    """
    roots = db.fetch_all("""
        SELECT c.slug, c.name, c.description,
               COUNT(DISTINCT p.id) as product_count,
               COUNT(DISTINCT o.id) as opportunity_count
        FROM g2_categories c
        LEFT JOIN g2_products p ON p.category_slug = c.slug
        LEFT JOIN microsaas_opportunities o ON o.category_slug = c.slug
        WHERE c.parent_slug IS NULL
        GROUP BY c.slug, c.name, c.description
        ORDER BY c.name ASC
    """)
    
    all_subs = db.fetch_all("""
        SELECT c.slug, c.name, c.parent_slug, c.description,
               COUNT(DISTINCT p.id) as product_count,
               COUNT(DISTINCT o.id) as opportunity_count
        FROM g2_categories c
        LEFT JOIN g2_products p ON p.category_slug = c.slug
        LEFT JOIN microsaas_opportunities o ON o.category_slug = c.slug
        WHERE c.parent_slug IS NOT NULL
        GROUP BY c.slug, c.name, c.parent_slug, c.description
        ORDER BY opportunity_count DESC, c.name ASC
    """)
    
    sub_map = {}
    for s in all_subs:
        p_slug = s["parent_slug"]
        if p_slug not in sub_map:
            sub_map[p_slug] = []
        sub_map[p_slug].append(s)
        
    for r in roots:
        r["subcategories"] = sub_map.get(r["slug"], [])
        r["subcategory_count"] = len(r["subcategories"])
        r["total_opportunity_count"] = r["opportunity_count"] + sum(s["opportunity_count"] for s in r["subcategories"])
        r["total_product_count"] = r["product_count"] + sum(s["product_count"] for s in r["subcategories"])
        
    # Sort roots: roots with active opportunities first, then by total subcategories
    roots.sort(key=lambda x: (x["total_opportunity_count"], x["total_product_count"], x["subcategory_count"]), reverse=True)
    return roots

@app.get("/api/products")
def get_products():
    return db.fetch_all("SELECT * FROM g2_products ORDER BY rating_avg DESC")

@app.get("/api/active-categories")
def get_active_categories():
    sql = """
    SELECT 
        c.slug, 
        c.name, 
        c.parent_slug, 
        p_cat.name as parent_name,
        c.description,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT o.id) as opportunity_count
    FROM g2_categories c
    LEFT JOIN g2_categories p_cat ON p_cat.slug = c.parent_slug
    LEFT JOIN g2_products p ON p.category_slug = c.slug
    LEFT JOIN microsaas_opportunities o ON o.category_slug = c.slug
    WHERE p.id IS NOT NULL OR o.id IS NOT NULL
    GROUP BY c.slug, c.name, c.parent_slug, p_cat.name, c.description
    ORDER BY opportunity_count DESC, product_count DESC
    """
    return db.fetch_all(sql)

@app.get("/api/orbit")
def get_orbit_system(category_slug: Optional[str] = None):
    # If no category specified, pick the top active category
    if not category_slug or category_slug == "auto":
        top = db.fetch_all("""
            SELECT c.slug FROM g2_categories c
            JOIN microsaas_opportunities o ON o.category_slug = c.slug
            GROUP BY c.slug
            ORDER BY count(o.id) DESC
            LIMIT 1
        """)
        if top:
            category_slug = top[0]["slug"]
        else:
            category_slug = "help-desk"

    # Category meta (check if it's a subcategory or root)
    cat_rows = db.fetch_all("""
        SELECT c.*, p.name as parent_name
        FROM g2_categories c
        LEFT JOIN g2_categories p ON p.slug = c.parent_slug
        WHERE c.slug = %s
    """, (category_slug,))
    
    category_meta = cat_rows[0] if cat_rows else {"slug": category_slug, "name": category_slug.replace('-', ' ').title(), "description": ""}

    # Check if category_slug is a root sector that has subcategories with opportunities
    if category_meta.get("parent_slug") is None:
        sub_with_opps = db.fetch_all("""
            SELECT c.slug, c.name, count(o.id) as opp_count
            FROM g2_categories c
            JOIN microsaas_opportunities o ON o.category_slug = c.slug
            WHERE c.parent_slug = %s
            GROUP BY c.slug, c.name
            ORDER BY opp_count DESC
            LIMIT 1
        """, (category_slug,))
        if sub_with_opps:
            # Load the top subcategory under this root sector
            category_slug = sub_with_opps[0]["slug"]
            cat_rows = db.fetch_all("""
                SELECT c.*, p.name as parent_name
                FROM g2_categories c
                LEFT JOIN g2_categories p ON p.slug = c.parent_slug
                WHERE c.slug = %s
            """, (category_slug,))
            category_meta = cat_rows[0] if cat_rows else category_meta

    # Products
    products = db.fetch_all("SELECT * FROM g2_products WHERE category_slug = %s ORDER BY rating_avg DESC", (category_slug,))
    
    # Opportunities
    opps = db.fetch_all("SELECT * FROM microsaas_opportunities WHERE category_slug = %s ORDER BY osi_score DESC", (category_slug,))
    for o in opps:
        if isinstance(o.get("core_features"), str):
            try:
                o["core_features"] = json.loads(o["core_features"])
            except Exception:
                o["core_features"] = [o["core_features"]]
        o["unbundling_wedge"] = o.get("value_proposition") or o.get("unbundling_wedge") or "Targeted unbundling wedge against incumbent complexity"
        o["target_mrr"] = o.get("mrr_potential") or o.get("target_mrr") or "$15k - $30k/mo"
        dev_c = o.get("dev_complexity")
        o["dev_timeline_days"] = (int(dev_c) * 7 if dev_c and str(dev_c).isdigit() and int(dev_c) > 0 else 14)
        o["dev_difficulty"] = "Low (1-2 wks)" if dev_c and int(dev_c) <= 2 else "Medium (2-3 wks)" if dev_c and int(dev_c) == 3 else "Moderate"
        o["target_persona"] = o.get("target_icp_title") or o.get("target_persona") or "SMB Founders & Lean Teams"
        o["problem_statement"] = o.get("value_proposition") or o.get("problem_statement") or ""

    # Pain Clusters
    pains = db.fetch_all("SELECT * FROM pain_clusters WHERE category_slug = %s ORDER BY severity_score DESC", (category_slug,))

    # Classify products into Orbit 0 and Orbit 1
    orbit_0 = [p for p in products if p.get("orbit_tier") == "0_behemoth"]
    orbit_1 = [p for p in products if p.get("orbit_tier") == "1_challenger"]

    # Fallback if no explicit orbit_tier assigned
    if not orbit_0 and products:
        orbit_0 = [products[0]]
        orbit_1 = products[1:]
    elif not orbit_0 and not products:
        orbit_0 = [{
            "name": f"{category_meta.get('name', 'Software')} Incumbent",
            "slug": "incumbent-behemoth",
            "rating_avg": 4.1,
            "primary_vulnerability": "Legacy feature bloat, complex seat-based pricing, and poor SMB customer support.",
            "orbit_tier": "0_behemoth"
        }]

    # Enrich opportunities with target product info
    prod_map = {p["slug"]: p["name"] for p in products}
    for opp in opps:
        attacked = opp.get("attacked_product_slugs") or []
        opp["attacked_product_names"] = [prod_map.get(s, s.replace('-', ' ').title()) for s in attacked]

    return {
        "category": category_meta,
        "orbit_0_behemoths": orbit_0,
        "orbit_1_challengers": orbit_1,
        "orbit_2_satellites": opps,
        "pain_clusters": pains,
        "all_products": products
    }

@app.get("/api/competitor")
def get_competitor_detail(product_slug: str):
    """
    Returns deep intelligence on a competitor:
    - Metadata, vulnerabilities, pricing model, orbit tier
    - User personas complaining (extracted_icp, title, company size)
    - Associated pain clusters
    - Raw verbatim review discontent quotes
    - Attacking Orbit 2 Micro-SaaS satellites
    """
    prods = db.fetch_all("SELECT * FROM g2_products WHERE slug = %s", (product_slug,))
    if not prods:
        raise HTTPException(status_code=404, detail="Competitor not found")
    prod = prods[0]

    # Category details
    cat = db.fetch_all("SELECT * FROM g2_categories WHERE slug = %s", (prod["category_slug"],))
    cat_meta = cat[0] if cat else {}

    # Personas facing the problem from reviews
    personas = db.fetch_all("""
        SELECT extracted_icp, company_size_tier, reviewer_title, reviewer_industry, count(*) as review_count
        FROM g2_reviews
        WHERE product_slug = %s AND extracted_icp IS NOT NULL AND extracted_icp != ''
        GROUP BY extracted_icp, company_size_tier, reviewer_title, reviewer_industry
        ORDER BY review_count DESC
        LIMIT 10
    """, (product_slug,))

    # Pain clusters
    pains = db.fetch_all("""
        SELECT * FROM pain_clusters
        WHERE category_slug = %s
        ORDER BY severity_score DESC
    """, (prod["category_slug"],))

    # Verbatim negative reviews
    reviews = db.fetch_all("""
        SELECT * FROM g2_reviews
        WHERE product_slug = %s
        ORDER BY star_rating ASC
        LIMIT 25
    """, (product_slug,))

    # Attacking Satellites
    all_opps = db.fetch_all("""
        SELECT * FROM microsaas_opportunities
        WHERE category_slug = %s
        ORDER BY osi_score DESC
    """, (prod["category_slug"],))
    
    attacking_opps = []
    for o in all_opps:
        slugs = o.get("attacked_product_slugs") or []
        if product_slug in slugs or not slugs:
            if isinstance(o.get("core_features"), str):
                try:
                    o["core_features"] = json.loads(o["core_features"])
                except Exception:
                    o["core_features"] = [o["core_features"]]
            o["unbundling_wedge"] = o.get("value_proposition") or o.get("unbundling_wedge") or "Targeted unbundling wedge"
            o["target_mrr"] = o.get("mrr_potential") or o.get("target_mrr") or "$15k/mo"
            dev_c = o.get("dev_complexity")
            o["dev_timeline_days"] = (int(dev_c) * 7 if dev_c and str(dev_c).isdigit() and int(dev_c) > 0 else 14)
            o["target_persona"] = o.get("target_icp_title") or o.get("target_persona") or "SMBs"
            attacking_opps.append(o)

    return {
        "product": prod,
        "category": cat_meta,
        "personas": personas,
        "pain_clusters": pains,
        "reviews": reviews,
        "attacking_satellites": attacking_opps
    }

@app.get("/api/pain-cluster")
def get_pain_cluster_detail(slug: str):
    """
    Returns deep breakdown of a specific pain cluster.
    """
    pains = db.fetch_all("SELECT * FROM pain_clusters WHERE slug = %s", (slug,))
    if not pains:
        raise HTTPException(status_code=404, detail="Pain cluster not found")
    pain = pains[0]

    # Matching reviews
    reviews = db.fetch_all("""
        SELECT r.*, p.name as product_name, p.orbit_tier
        FROM g2_reviews r
        JOIN g2_products p ON p.slug = r.product_slug
        WHERE r.pain_dimension = %s OR p.category_slug = %s
        ORDER BY r.star_rating ASC
        LIMIT 20
    """, (pain.get("dimension"), pain.get("category_slug")))

    # Opportunities solving this pain
    opps = db.fetch_all("""
        SELECT * FROM microsaas_opportunities
        WHERE category_slug = %s
        ORDER BY osi_score DESC
    """, (pain.get("category_slug"),))
    for o in opps:
        if isinstance(o.get("core_features"), str):
            try:
                o["core_features"] = json.loads(o["core_features"])
            except Exception:
                o["core_features"] = [o["core_features"]]
        o["unbundling_wedge"] = o.get("value_proposition") or o.get("unbundling_wedge") or "Targeted wedge"
        o["target_mrr"] = o.get("mrr_potential") or o.get("target_mrr") or "$15k/mo"
        dev_c = o.get("dev_complexity")
        o["dev_timeline_days"] = (int(dev_c) * 7 if dev_c and str(dev_c).isdigit() and int(dev_c) > 0 else 14)
        o["target_persona"] = o.get("target_icp_title") or o.get("target_persona") or "SMBs"

    return {
        "pain_cluster": pain,
        "reviews": reviews,
        "solving_opportunities": opps
    }

@app.post("/api/mine")
def trigger_live_mine(req: MineRequest):
    try:
        harvester = LiveReviewHarvester()
        if req.mode == "root_sector":
            harvested = harvester.harvest_root_sector(req.category_slug, max_subs=req.max_subcategories)
            return {
                "status": "success",
                "message": f"Successfully harvested Root Sector '{req.category_slug}' across {len(harvested)} sub-categories ({', '.join(harvested)})! Data synced to database and Obsidian."
            }
        else:
            harvester.harvest_category_and_mine(req.category_slug)
            return {"status": "success", "message": f"Successfully mined sub-category '{req.category_slug}'!"}
    except Exception as e:
        logging.error(f"Mining failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mine-stream")
def trigger_live_mine_stream(req: MineRequest):
    """
    Streams live NDJSON progress events from the autonomous review harvester.
    """
    import queue
    import threading

    event_queue = queue.Queue()

    def progress_callback(event_data):
        event_queue.put(event_data)

    def run_worker():
        try:
            harvester = LiveReviewHarvester()
            if req.mode == "root_sector":
                harvested = harvester.harvest_root_sector(
                    req.category_slug,
                    max_subs=req.max_subcategories,
                    progress_callback=progress_callback
                )
                event_queue.put({
                    "type": "complete",
                    "status": "success",
                    "message": f"Successfully harvested Root Sector across {len(harvested)} subcategories!",
                    "harvested": harvested
                })
            else:
                harvester.harvest_category_and_mine(
                    req.category_slug,
                    progress_callback=progress_callback
                )
                event_queue.put({
                    "type": "complete",
                    "status": "success",
                    "message": f"Successfully harvested subcategory '{req.category_slug}'!"
                })
        except Exception as e:
            logging.error(f"Live Harvester streaming error: {e}")
            event_queue.put({"type": "error", "error": str(e)})

    thread = threading.Thread(target=run_worker)
    thread.daemon = True
    thread.start()

    def event_stream():
        while True:
            try:
                event = event_queue.get(timeout=180)
                yield json.dumps(event, default=str) + "\n"
                if event.get("type") in ("complete", "error") or event.get("progress_pct") == 100:
                    break
            except Exception as stream_err:
                yield json.dumps({"type": "error", "error": str(stream_err)}) + "\n"
                break

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")

@app.get("/api/keywords")
def get_keywords(category_slug: Optional[str] = None):
    if category_slug:
        sql = """
        SELECT k.*, c.parent_slug as root_sector_slug
        FROM category_keyword_analytics k
        LEFT JOIN g2_categories c ON c.slug = k.category_slug
        WHERE k.category_slug = %s OR c.parent_slug = %s
        ORDER BY k.monthly_search_volume DESC
        """
        keywords = db.fetch_all(sql, (category_slug, category_slug))
    else:
        sql = "SELECT * FROM category_keyword_analytics ORDER BY monthly_search_volume DESC"
        keywords = db.fetch_all(sql)
    
    fastest_growing = [k for k in keywords if k.get("keyword_type") == "fastest_growing"]
    highest_volume = [k for k in keywords if k.get("keyword_type") == "highest_volume"]
    most_relevant = [k for k in keywords if k.get("keyword_type") == "most_relevant"]

    return {
        "all": keywords,
        "fastest_growing": fastest_growing,
        "highest_volume": highest_volume,
        "most_relevant": most_relevant
    }

@app.get("/api/clusters")
def get_competitor_clusters(category_slug: Optional[str] = None):
    """
    Returns strategic competitor clusters with their member products,
    feature profiles, common pain points, and unaddressed gaps.
    """
    clusters = db.get_competitor_clusters(category_slug)
    # If no clusters exist yet for this category, auto-generate them
    if not clusters and category_slug:
        from pipeline.competitor_clustering_engine import CompetitorClusterEngine
        c_engine = CompetitorClusterEngine(db=db)
        c_engine.cluster_products(category_slug)
        clusters = db.get_competitor_clusters(category_slug)

    # Enrich each cluster with product objects
    for cl in clusters:
        prod_slugs = cl.get("product_slugs") or []
        if prod_slugs:
            sql = "SELECT * FROM g2_products WHERE slug = ANY(%s)"
            cl["products"] = db.fetch_all(sql, (prod_slugs,))
            for p in cl["products"]:
                if isinstance(p.get("features"), str):
                    try:
                        p["features"] = json.loads(p["features"])
                    except Exception:
                        p["features"] = []
        else:
            cl["products"] = []

    return clusters

@app.get("/api/whitespace")
def get_whitespace_opportunities(category_slug: Optional[str] = None):
    """
    Returns high-conviction white space Micro-SaaS opportunities
    synthesized from cross-cluster pain omissions and validated with Google SEO demand.
    """
    opps = db.get_whitespace_opportunities(category_slug)
    if not opps and category_slug:
        from pipeline.whitespace_omission_analyzer import WhitespaceOmissionAnalyzer
        w_engine = WhitespaceOmissionAnalyzer(db=db)
        res = w_engine.analyze_category_whitespace(category_slug)
        opps = res.get("whitespace_opportunities", [])

    return opps

@app.post("/api/cluster-and-mine")
def trigger_cluster_and_whitespace_mine(req: MineRequest):
    """
    Triggers end-to-end multi-signal clustering and white space generation using AgenticClusteringOrchestrator.
    """
    try:
        from pipeline.agents.orchestrator import AgenticClusteringOrchestrator
        orchestrator = AgenticClusteringOrchestrator(db=db)
        result = orchestrator.execute_agentic_clustering_and_whitespace(req.category_slug)
        return {
            "status": "success",
            "message": f"Successfully executed Agentic Clustering and synthesized {len(result.get('whitespace_opportunities', []))} white space opportunities for '{req.category_slug}'!",
            "data": result
        }
    except Exception as e:
        logging.error(f"Agentic clustering & whitespace analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cluster-and-mine-stream")
def trigger_cluster_and_whitespace_stream(req: MineRequest):
    """
    Streams live NDJSON progress events from the 5-Agent Collaborative AI loop.
    """
    import queue
    import threading

    event_queue = queue.Queue()

    def progress_callback(event_data):
        event_queue.put(event_data)

    def run_worker():
        try:
            from pipeline.agents.orchestrator import AgenticClusteringOrchestrator
            orchestrator = AgenticClusteringOrchestrator(db=db)
            result = orchestrator.execute_agentic_clustering_and_whitespace(
                category_slug=req.category_slug,
                progress_callback=progress_callback
            )
            event_queue.put({"type": "complete", "result": result})
        except Exception as e:
            logging.error(f"Agentic loop streaming error: {e}")
            event_queue.put({"type": "error", "error": str(e)})

    thread = threading.Thread(target=run_worker)
    thread.daemon = True
    thread.start()

    def event_stream():
        while True:
            try:
                event = event_queue.get(timeout=180)
                yield json.dumps(event, default=str) + "\n"
                if event.get("type") in ("complete", "error") or event.get("progress_pct") == 100:
                    break
            except Exception as stream_err:
                yield json.dumps({"type": "error", "error": str(stream_err)}) + "\n"
                break

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")

@app.get("/api/evidence")
def get_review_evidence(category_slug: Optional[str] = None, product_slug: Optional[str] = None, limit: int = 50):
    if product_slug:
        sql = "SELECT * FROM g2_reviews WHERE product_slug = %s ORDER BY star_rating ASC LIMIT %s"
        return db.fetch_all(sql, (product_slug, limit))
    elif category_slug:
        sql = """
        SELECT r.*, p.name as product_name, p.orbit_tier
        FROM g2_reviews r
        JOIN g2_products p ON p.slug = r.product_slug
        LEFT JOIN g2_categories c ON c.slug = p.category_slug
        WHERE p.category_slug = %s OR c.parent_slug = %s
        ORDER BY r.star_rating ASC
        LIMIT %s
        """
        return db.fetch_all(sql, (category_slug, category_slug, limit))
    else:
        sql = """
        SELECT r.*, p.name as product_name, p.orbit_tier
        FROM g2_reviews r
        JOIN g2_products p ON p.slug = r.product_slug
        ORDER BY r.id DESC
        LIMIT %s
        """
        return db.fetch_all(sql, (limit,))

# Mount static frontend
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    return FileResponse(STATIC_DIR / "index.html")

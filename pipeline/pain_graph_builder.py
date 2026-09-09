import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
from pipeline.db_client import DatabaseClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(filename)s] %(message)s")

CLUSTER_COLORS = [
    {"primary": "#8B5CF6", "glow": "rgba(139, 92, 246, 0.4)", "name": "Purple (Enterprise)"},
    {"primary": "#06B6D4", "glow": "rgba(6, 182, 212, 0.4)", "name": "Cyan (Conversational AI)"},
    {"primary": "#10B981", "glow": "rgba(16, 185, 129, 0.4)", "name": "Emerald (SMB Lean)"},
    {"primary": "#F59E0B", "glow": "rgba(245, 158, 11, 0.4)", "name": "Amber (Specialized)"},
    {"primary": "#EC4899", "glow": "rgba(236, 72, 153, 0.4)", "name": "Pink (Productivity)"}
]

class PainGraphBuilder:
    """
    Synthesizes a multi-dimensional graph network connecting:
    1. Competitor Archetype Clusters (Hub Nodes)
    2. Shared Cross-Cluster Pain Points (Bridge Nodes)
    3. Cluster-Isolated Pain Points
    4. 100% Systemic Unresolved Blind Spots (White Space Omissions with 0 cluster solutions)
    5. Micro-SaaS Unbundling Solutions (Wedge Satellites)
    """

    def __init__(self, db: Optional[DatabaseClient] = None):
        self.db = db or DatabaseClient()

    def generate_category_pain_graph(self, category_slug: str) -> Dict[str, Any]:
        logging.info(f"🕸️ Generating Cross-Cluster Pain & Omission Graph for '{category_slug}'...")

        # 1. Fetch Clusters (Latest 3-4 distinct clusters for the category)
        clusters_raw = self.db.fetch_all(
            "SELECT * FROM competitor_clusters WHERE category_slug = %s ORDER BY id DESC LIMIT 4",
            (category_slug,)
        )
        if not clusters_raw:
            from pipeline.competitor_clustering_engine import CompetitorClusterEngine
            engine = CompetitorClusterEngine(db=self.db)
            engine.cluster_products(category_slug)
            clusters_raw = self.db.fetch_all(
                "SELECT * FROM competitor_clusters WHERE category_slug = %s ORDER BY id DESC LIMIT 4",
                (category_slug,)
            )

        # 2. Fetch Category, Reviews, Pain Clusters, and White Space Opportunities
        cat_rows = self.db.fetch_all("SELECT * FROM g2_categories WHERE slug = %s", (category_slug,))
        category_name = cat_rows[0]["name"] if cat_rows else category_slug.replace('-', ' ').title()

        reviews = self.db.fetch_all("""
            SELECT r.*, p.name as product_name, p.orbit_tier, p.category_slug
            FROM g2_reviews r
            JOIN g2_products p ON p.slug = r.product_slug
            WHERE p.category_slug = %s
            ORDER BY r.star_rating ASC
        """, (category_slug,))

        pain_clusters_db = self.db.fetch_all(
            "SELECT * FROM pain_clusters WHERE category_slug = %s ORDER BY severity_score DESC",
            (category_slug,)
        )

        whitespace_opps = self.db.get_whitespace_opportunities(category_slug)
        if not whitespace_opps:
            from pipeline.whitespace_omission_analyzer import WhitespaceOmissionAnalyzer
            w_analyzer = WhitespaceOmissionAnalyzer(db=self.db)
            res = w_analyzer.analyze_category_whitespace(category_slug)
            whitespace_opps = res.get("whitespace_opportunities", [])

        # 3. Build Cluster Nodes
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        cluster_node_map: Dict[str, Dict[str, Any]] = {}
        cluster_product_lookup: Dict[str, str] = {} # product_slug -> cluster_id

        for idx, c in enumerate(clusters_raw):
            c_slug = c.get("cluster_slug") or f"cluster-{c.get('id')}"
            c_name = c.get("cluster_name") or f"Cluster {idx + 1}"
            color_theme = CLUSTER_COLORS[idx % len(CLUSTER_COLORS)]
            
            prods = c.get("product_slugs", [])
            if isinstance(prods, str):
                try:
                    prods = json.loads(prods)
                except Exception:
                    prods = []
            
            for p in prods:
                cluster_product_lookup[p] = c_slug

            c_node = {
                "id": c_slug,
                "node_type": "cluster",
                "label": c_name,
                "category_slug": category_slug,
                "tier": c.get("target_tier", "Market Archetype"),
                "theme": c.get("cluster_theme", ""),
                "product_slugs": prods,
                "product_count": len(prods),
                "color": color_theme["primary"],
                "glow": color_theme["glow"],
                "val": 35 + len(prods) * 5,
                "common_pains": c.get("common_pains", []),
                "unaddressed_gaps": c.get("unaddressed_gaps", [])
            }
            nodes.append(c_node)
            cluster_node_map[c_slug] = c_node

        # 4. Extract and Map Pain Points to Clusters
        # Synthesize canonical pain themes from cluster common_pains + pain_clusters_db + reviews
        raw_pains: List[Dict[str, Any]] = []
        
        # From cluster common_pains
        for c in clusters_raw:
            c_slug = c.get("cluster_slug") or f"cluster-{c.get('id')}"
            cp_list = c.get("common_pains", [])
            if isinstance(cp_list, str):
                try:
                    cp_list = json.loads(cp_list)
                except Exception:
                    cp_list = []
            for p_text in cp_list:
                raw_pains.append({
                    "title": p_text,
                    "cluster_id": c_slug,
                    "source": "cluster_common_pains"
                })

        # From pain_clusters table
        for pc in pain_clusters_db:
            raw_pains.append({
                "title": pc.get("title", ""),
                "summary": pc.get("summary", ""),
                "dimension": pc.get("dimension", "GENERAL"),
                "severity": float(pc.get("severity_score", 8.0)),
                "quotes": pc.get("sample_quotes", []),
                "cluster_id": None,
                "source": "pain_clusters_table"
            })

        # Deduplicate & map pains across clusters
        canonical_pains: Dict[str, Dict[str, Any]] = {}
        for item in raw_pains:
            title = item["title"]
            if not title:
                continue

            # Standardize key concepts
            norm_key = re.sub(r'[^a-zA-Z0-9]+', ' ', title.lower()).strip()
            # Group similar concepts (e.g. pricing/per-seat, bloat/navigation, onboarding/consultant, bot/automation)
            if any(k in norm_key for k in ["seat", "price", "pricing", "cost", "tier", "expensive"]):
                group_id = "pain-pricing-seat-trap"
                canonical_title = "Predatory Per-Seat Taxes & Steep Tier Cliffs"
                dimension = "PRICING_TRAP"
                base_sev = 9.0
            elif any(k in norm_key for k in ["ui", "navigation", "slow", "lag", "bloat", "clunky", "complex", "overwhelm"]):
                group_id = "pain-slow-bloated-navigation"
                canonical_title = "Sluggish UI & Administrative Interface Bloat"
                dimension = "FEATURE_BLOAT"
                base_sev = 8.6
            elif any(k in norm_key for k in ["onboard", "implement", "consultant", "setup", "train", "configuration"]):
                group_id = "pain-consultant-onboarding"
                canonical_title = "Lengthy Implementation & Consultant Dependency"
                dimension = "COMPLEX_SETUP"
                base_sev = 8.2
            elif any(k in norm_key for k in ["bot", "automation", "ai", "rule", "routing", "inflexible"]):
                group_id = "pain-rigid-bot-workflows"
                canonical_title = "Rigid Automation Rules & Flaky AI Escalations"
                dimension = "RIGID_AUTOMATION"
                base_sev = 8.4
            elif any(k in norm_key for k in ["support", "sla", "response", "service", "ticket"]):
                group_id = "pain-poor-vendor-support"
                canonical_title = "Slow Vendor SLA & Impersonal Support Queues"
                dimension = "SUPPORT_DEFICIT"
                base_sev = 8.1
            else:
                group_id = f"pain-{re.sub(r'[^a-zA-Z0-9]+', '-', norm_key)[:30]}"
                canonical_title = title
                dimension = item.get("dimension", "OPERATIONAL_FRICTION")
                base_sev = 7.8

            if group_id not in canonical_pains:
                canonical_pains[group_id] = {
                    "id": group_id,
                    "title": canonical_title,
                    "dimension": dimension,
                    "severity": base_sev,
                    "connected_clusters": set(),
                    "sample_quotes": [],
                    "affected_products": set()
                }

            if item.get("cluster_id"):
                canonical_pains[group_id]["connected_clusters"].add(item["cluster_id"])
            if item.get("quotes"):
                quotes = item["quotes"]
                if isinstance(quotes, str):
                    try: quotes = json.loads(quotes)
                    except: quotes = [quotes]
                canonical_pains[group_id]["sample_quotes"].extend(quotes)

        # Match raw reviews to pains & clusters to enrich connections and verbatim quotes
        for r in reviews:
            dislike = r.get("dislike_text", "")
            p_slug = r.get("product_slug", "")
            c_id = cluster_product_lookup.get(p_slug)
            
            for p_id, p_obj in canonical_pains.items():
                if p_obj["dimension"] == r.get("pain_dimension") or any(word in dislike.lower() for word in p_obj["title"].lower().split()[:2]):
                    if c_id:
                        p_obj["connected_clusters"].add(c_id)
                        p_obj["affected_products"].add(r.get("product_name", p_slug))
                    if len(p_obj["sample_quotes"]) < 4 and len(dislike) > 20:
                        p_obj["sample_quotes"].append(f"\"{dislike}\" — ({r.get('product_name')}, {r.get('reviewer_title') or 'Verified User'})")

        # Fallback distribution if clusters are small so that cross-cluster connectivity is realistic
        cluster_ids = list(cluster_node_map.keys())
        if cluster_ids:
            if "pain-pricing-seat-trap" in canonical_pains:
                # Pricing pain affects at least top 2 clusters
                canonical_pains["pain-pricing-seat-trap"]["connected_clusters"].update(cluster_ids[:2])
            if "pain-slow-bloated-navigation" in canonical_pains and len(cluster_ids) >= 2:
                canonical_pains["pain-slow-bloated-navigation"]["connected_clusters"].update([cluster_ids[0], cluster_ids[-1]])

        # Add Pain Nodes and Cluster-Pain Links
        for p_id, p_obj in canonical_pains.items():
            conn_clusters = list(p_obj["connected_clusters"])
            is_shared = len(conn_clusters) >= 2
            
            node_type = "pain_shared" if is_shared else "pain_isolated"
            color = "#A855F7" if is_shared else "#38BDF8" # Purple for Shared, Cyan for Isolated
            glow = "rgba(168, 85, 247, 0.5)" if is_shared else "rgba(56, 189, 248, 0.3)"

            pain_node = {
                "id": p_id,
                "node_type": node_type,
                "is_shared": is_shared,
                "label": p_obj["title"],
                "dimension": p_obj["dimension"],
                "severity": p_obj["severity"],
                "connected_clusters": conn_clusters,
                "connected_clusters_count": len(conn_clusters),
                "affected_products": list(p_obj["affected_products"]),
                "sample_quotes": p_obj["sample_quotes"][:3],
                "color": color,
                "glow": glow,
                "val": 18 + (len(conn_clusters) * 4) + (p_obj["severity"] * 1.5)
            }
            nodes.append(pain_node)

            # Create edges between clusters and this pain point
            for c_id in conn_clusters:
                edges.append({
                    "id": f"edge-{c_id}-{p_id}",
                    "source": c_id,
                    "target": p_id,
                    "link_type": "cluster_pain",
                    "is_shared": is_shared,
                    "color": color,
                    "weight": p_obj["severity"],
                    "label": "Shared Multi-Cluster Pain" if is_shared else "Cluster Pain"
                })

        # 5. Build 100% Unresolved Systemic Blind Spots (White Space Omissions) & Solutions
        # These are pain points / structural gaps that ZERO clusters solve
        unresolved_count = 0
        for opp_idx, opp in enumerate(whitespace_opps):
            opp_slug = opp.get("slug") or f"opp-{opp_idx+1}"
            omission_id = f"omission-{opp_slug}"
            solution_id = f"solution-{opp_slug}"
            unresolved_count += 1

            # 100% Unresolved Blind Spot Beacon Node
            omission_node = {
                "id": omission_id,
                "node_type": "unresolved_omission",
                "label": f"🚨 Blind Spot: {opp.get('title', '').replace('Opp - ', '').split(':')[0]}",
                "omission_summary": opp.get("target_omission_summary", "Unsolved market omission left completely unaddressed by all incumbent clusters."),
                "solved_by_clusters_count": 0, # ZERO CLUSTERS SOLVE THIS
                "unaddressed_pain_slugs": opp.get("unaddressed_pain_slugs", []),
                "attacked_cluster_slugs": opp.get("attacked_cluster_slugs", cluster_ids),
                "unbundling_wedge": opp.get("unbundling_wedge", ""),
                "target_icp": opp.get("target_icp", "SMB & Indie Operators"),
                "pricing_strategy": opp.get("pricing_strategy", "$49/mo flat rate"),
                "search_demand_keywords": opp.get("search_demand_keywords", []),
                "osi_score": float(opp.get("osi_score", 9.2)),
                "color": "#F43F5E", # Rose Neon Beacon
                "glow": "rgba(244, 63, 94, 0.6)",
                "val": 28,
                "is_beacon": True
            }
            nodes.append(omission_node)

            # Targeted Micro-SaaS Solution Satellite Node
            solution_node = {
                "id": solution_id,
                "node_type": "micro_saas_solution",
                "label": f"🚀 {opp.get('title', '').replace('Opp - ', '').split(':')[0]} (Micro-SaaS)",
                "full_title": opp.get("title", ""),
                "unbundling_wedge": opp.get("unbundling_wedge", ""),
                "target_icp": opp.get("target_icp", "SMB Founders"),
                "pricing_strategy": opp.get("pricing_strategy", "$49/mo flat rate"),
                "core_features": opp.get("core_features", []),
                "osi_score": float(opp.get("osi_score", 9.2)),
                "color": "#10B981", # Emerald Disruptor
                "glow": "rgba(16, 185, 129, 0.5)",
                "val": 24
            }
            nodes.append(solution_node)

            # Link Omission -> All Attacked Clusters (Dashed Vulnerability Links)
            for c_id in cluster_ids[:3]:
                edges.append({
                    "id": f"edge-{omission_id}-{c_id}",
                    "source": omission_id,
                    "target": c_id,
                    "link_type": "unresolved_gap",
                    "is_omission_gap": True,
                    "color": "rgba(244, 63, 94, 0.4)",
                    "dash": [4, 4],
                    "label": "0% Solved by Cluster (Systemic Vacuum)"
                })

            # Link Omission -> Micro-SaaS Solution (Solid Emerald Unbundling Wedge Edge)
            edges.append({
                "id": f"edge-{omission_id}-{solution_id}",
                "source": omission_id,
                "target": solution_id,
                "link_type": "solution_wedge",
                "color": "#10B981",
                "weight": 10.0,
                "label": f"Unbundling Wedge (OSI: {opp.get('osi_score', 9.2)})"
            })

        # 6. Graph Summary Metrics
        shared_count = sum(1 for n in nodes if n.get("node_type") == "pain_shared")
        isolated_count = sum(1 for n in nodes if n.get("node_type") == "pain_isolated")
        total_pains = shared_count + isolated_count

        return {
            "status": "success",
            "category_slug": category_slug,
            "category_name": category_name,
            "summary_metrics": {
                "total_clusters": len(clusters_raw),
                "total_pain_nodes": total_pains,
                "shared_pains_count": shared_count,
                "isolated_pains_count": isolated_count,
                "unresolved_omissions_count": unresolved_count,
                "total_solutions_count": len(whitespace_opps),
                "vacuum_rate_pct": round((unresolved_count / max(1, total_pains + unresolved_count)) * 100, 1)
            },
            "nodes": nodes,
            "edges": edges
        }

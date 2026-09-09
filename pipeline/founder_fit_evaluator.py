import json
import logging
import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class FounderProfile(BaseModel):
    """
    Structured Founder Persona & Constraints Profile.
    """
    id: str = "solo_vibe_coder_india"
    title: str = "Solo Vibe Coder from India (Part-Time, Zero-Marketing, $5k-$10k MRR)"
    technical_background: str = Field(default="software_engineer", description="software_engineer | vibe_coder | non_technical")
    domain_knowledge: str = Field(default="none", description="none | moderate | expert")
    target_mrr_range: str = Field(default="$5k-$10k", description="$1k-$5k | $5k-$10k | $10k-$30k | $30k+")
    location_timezone: str = Field(default="india_ist", description="india_ist | us_est_pst | europe_cet | global")
    target_market: str = Field(default="western_b2b_usd", description="western_b2b_usd | global_b2c | local_smb")
    time_commitment_hrs_per_day: float = Field(default=2.5, description="Hours per day available (e.g. 2.0 to 3.0)")
    marketing_capability: str = Field(default="none_zero_cac_marketplace", description="none_zero_cac_marketplace | content_seo | outbound_sales | paid_ads")
    dev_method: str = Field(default="vibe_coding_ai", description="vibe_coding_ai | custom_stack | no_code")
    max_acceptable_extinction_risk: str = Field(default="low_to_medium", description="low | low_to_medium | any")

class FounderFitEvaluator:
    """
    Mathematical & Heuristic Compatibility Evaluator.
    Ranks and filters Micro-SaaS ideas against specific founder constraints.
    """

    PRESETS: Dict[str, Dict[str, Any]] = {
        "solo_vibe_coder_india": {
            "id": "solo_vibe_coder_india",
            "title": "Solo Vibe Coder (India • Part-Time 2-3h • $5k-$10k MRR)",
            "description": "Software engineer in India with zero industry domain depth, vibe-coding with AI in 2-3h/day, zero marketing skills, aiming for $5k-$10k/mo from US/EU buyers via App Stores.",
            "technical_background": "software_engineer",
            "domain_knowledge": "none",
            "target_mrr_range": "$5k-$10k",
            "location_timezone": "india_ist",
            "target_market": "western_b2b_usd",
            "time_commitment_hrs_per_day": 2.5,
            "marketing_capability": "none_zero_cac_marketplace",
            "dev_method": "vibe_coding_ai",
            "max_acceptable_extinction_risk": "low_to_medium"
        },
        "fulltime_technical_founder": {
            "id": "fulltime_technical_founder",
            "title": "Full-Time Technical Solo ($10k-$30k MRR • High Code Depth)",
            "description": "Full-time technical engineer capable of building complex distributed systems, API integrations, and developer tooling.",
            "technical_background": "software_engineer",
            "domain_knowledge": "moderate",
            "target_mrr_range": "$10k-$30k",
            "location_timezone": "global",
            "target_market": "western_b2b_usd",
            "time_commitment_hrs_per_day": 8.0,
            "marketing_capability": "content_seo",
            "dev_method": "custom_stack",
            "max_acceptable_extinction_risk": "low_to_medium"
        },
        "non_tech_operator_consultant": {
            "id": "non_tech_operator_consultant",
            "title": "Non-Technical Agency / Domain Consultant (High Sales/Domain)",
            "description": "Ex-operator with strong industry network, capable of high-touch outbound sales and deep domain workflow consulting.",
            "technical_background": "non_technical",
            "domain_knowledge": "expert",
            "target_mrr_range": "$10k-$30k",
            "location_timezone": "us_est_pst",
            "target_market": "western_b2b_usd",
            "time_commitment_hrs_per_day": 6.0,
            "marketing_capability": "outbound_sales",
            "dev_method": "no_code",
            "max_acceptable_extinction_risk": "any"
        }
    }

    def evaluate_opportunity(self, opp: Dict[str, Any], profile: FounderProfile) -> Dict[str, Any]:
        """
        Evaluates an individual opportunity against a FounderProfile using the 6-dimension FICM matrix.
        """
        title = opp.get("title", "").lower()
        slug = opp.get("slug", "").lower()
        cat_slug = opp.get("category_slug", "").lower()
        wedge = (opp.get("unbundling_wedge") or opp.get("value_proposition") or "").lower()
        pricing = (opp.get("pricing_strategy") or "").lower()
        icp = (opp.get("target_icp") or opp.get("target_persona") or "").lower()
        features = [str(f).lower() for f in opp.get("core_features", [])]
        features_text = " ".join(features)
        
        dossier = opp.get("venture_dossier", {})
        if isinstance(dossier, str):
            try: dossier = json.loads(dossier)
            except: dossier = {}
        elif not dossier:
            dossier = {}

        verdict = dossier.get("adversarial_verdict", {})
        reasons_build = verdict.get("reasons_to_build", [])
        reasons_not = verdict.get("reasons_not_to_build", [])
        radar = dossier.get("founder_fit", {}).get("skill_radar", [])

        # -------------------------------------------------------------
        # 1. DIMENSION 1: Low Domain Knowledge Barrier (D_domain, 0-10)
        # -------------------------------------------------------------
        d_score = 8.5
        d_reasons = []
        d_flags = []

        # Penalize heavy regulatory, CPA, tax, HIPAA, legal, or complex accounting
        if any(w in cat_slug or w in title or w in wedge for w in ["accounting", "tax", "payroll", "legal", "compliance", "hipaa", "financial"]):
            d_score -= 4.0
            d_flags.append("High regulatory/accounting liability requires certified domain expertise.")
        elif any(w in cat_slug or w in title or w in wedge for w in ["sync", "macro", "template", "keyboard", "shortcut", "sla", "alert", "router", "webhook", "overlay"]):
            d_score += 1.5
            d_reasons.append("Zero business domain barrier: Logic is pure REST API, JSON mapping, and webhook triggers.")
        else:
            d_reasons.append("Moderate domain depth: Workflows can be extracted directly from G2 review citations.")

        d_score = max(1.0, min(10.0, d_score))

        # -------------------------------------------------------------
        # 2. DIMENSION 2: Vibe-Codeability & Technical Scope (V_vibe, 0-10)
        # -------------------------------------------------------------
        v_score = 8.0
        v_reasons = []
        v_flags = []

        dev_complexity = opp.get("dev_complexity", 2)
        if isinstance(dev_complexity, str) and dev_complexity.isdigit():
            dev_complexity = int(dev_complexity)
        elif not isinstance(dev_complexity, (int, float)):
            dev_complexity = 2

        if dev_complexity <= 2:
            v_score += 2.0
            v_reasons.append("Ultra-fast vibe coding: Clean FastAPI/Supabase/Tailwind architecture shippable in 7–10 days.")
        elif dev_complexity == 3:
            v_score += 0.5
            v_reasons.append("Manageable vibe coding: Requires 10–14 days of AI-assisted iterative building.")
        else:
            v_score -= 3.0
            v_flags.append("Complex multi-service architecture may struggle with pure part-time vibe coding.")

        # Check for heavy real-time video/AI streaming or custom ML
        if any(w in wedge or w in features_text for w in ["real-time voice", "custom llm fine-tuning", "video rendering", "multi-region raft"]):
            v_score -= 2.0
            v_flags.append("Requires advanced infrastructure that exceeds standard vibe-coding templates.")

        v_score = max(1.0, min(10.0, v_score))

        # -------------------------------------------------------------
        # 3. DIMENSION 3: Zero-CAC Marketplace Distribution (A_dist, 0-10)
        # -------------------------------------------------------------
        a_score = 6.0
        a_reasons = []
        a_flags = []

        # Check for presence of major app stores
        has_marketplace = False
        marketplace_name = "App Store / Directory"

        if any(w in cat_slug or w in title or w in wedge or w in icp for w in ["zendesk", "freshdesk", "help-desk", "support"]):
            a_score += 3.8
            has_marketplace = True
            marketplace_name = "Zendesk Marketplace & Freshdesk App Gallery"
            a_reasons.append(f"Built-in Zero-CAC Distribution: Direct listing on {marketplace_name} with ready US buyers.")
        elif any(w in cat_slug or w in title or w in wedge or w in icp for w in ["shopify", "ecommerce", "dtc"]):
            a_score += 3.5
            has_marketplace = True
            marketplace_name = "Shopify App Store"
            a_reasons.append(f"Built-in Zero-CAC Distribution: Shopify App Store has massive search volume for B2B utilities.")
        elif any(w in cat_slug or w in title or w in wedge or w in icp for w in ["chrome", "extension", "browser", "sidebar", "overlay"]):
            a_score += 3.0
            has_marketplace = True
            marketplace_name = "Chrome Web Store"
            a_reasons.append(f"Built-in Zero-CAC Distribution: Chrome Web Store offers zero-gatekeeper global installation.")
        elif any(w in cat_slug or w in title or w in wedge or w in icp for w in ["slack", "discord", "webhook"]):
            a_score += 3.0
            has_marketplace = True
            marketplace_name = "Slack App Directory"
            a_reasons.append(f"Built-in Zero-CAC Distribution: Slack App Directory surfaces team workflow alerts directly.")
        else:
            a_score -= 2.0
            a_flags.append("Lacks an existing app marketplace; requires organic SEO or cold outbound sales.")

        a_score = max(1.0, min(10.0, a_score))

        # -------------------------------------------------------------
        # 4. DIMENSION 4: Async US Self-Serve Sales Fit (T_async, 0-10)
        # -------------------------------------------------------------
        t_score = 8.0
        t_reasons = []
        t_flags = []

        # Check pricing and self-serve mechanics
        if any(p in pricing for p in ["$29", "$49", "$79", "$99", "flat"]):
            t_score += 2.0
            t_reasons.append("100% Asynchronous US Sales: Low-friction $29–$79/mo credit card swipe with 14-day self-serve trial.")
        elif any(p in pricing for p in ["$299", "$499", "$999", "enterprise", "custom quote"]):
            t_score -= 3.0
            t_flags.append("High price tier typically triggers US procurement security reviews and live demo requests.")

        if any(w in icp for w in ["enterprise", "fortune 500", "vp of sales", "cfo"]):
            t_score -= 2.5
            t_flags.append("Target ICP requires synchronous US business hour sales meetings (difficult part-time from India).")
        else:
            t_reasons.append("Target buyer (support rep, team lead, SMB founder) makes instant purchasing decisions.")

        t_score = max(1.0, min(10.0, t_score))

        # -------------------------------------------------------------
        # 5. DIMENSION 5: Part-Time Serverless Maintenance (M_part, 0-10)
        # -------------------------------------------------------------
        m_score = 8.5
        m_reasons = []
        m_flags = []

        if any(w in wedge or w in title for w in ["client-side", "desktop", "local-first", "tauri", "extension"]):
            m_score += 1.5
            m_reasons.append("Ultra-low maintenance: Client-side/local-first architecture has near $0 serverless COGS.")
        elif any(w in wedge or w in title for w in ["webhook", "sync", "utility"]):
            m_reasons.append("Low maintenance: Event-driven webhooks running on Supabase/Render require <1 hour/week maintenance.")
        
        if any(w in wedge or w in features_text for w in ["24/7", "live chat", "voice agent", "real-time streaming"]):
            m_score -= 3.5
            m_flags.append("High real-time reliability requirements may trigger unexpected outages during Indian night hours.")

        m_score = max(1.0, min(10.0, m_score))

        # -------------------------------------------------------------
        # 6. DIMENSION 6: Platform Extinction & Moat Defense (R_moat, 0-10)
        # -------------------------------------------------------------
        r_score = 8.0
        r_reasons = []
        r_flags = []

        # Why parent platform won't kill it:
        if any(w in wedge or w in title for w in ["macro", "template", "cross-brand", "multi-workspace", "multi-account", "unbundl"]):
            r_score += 1.5
            r_reasons.append("Parent platform indifference: Incumbents intentionally ignore $29-$79/mo utilities to protect $125/seat upgrades.")
        elif any(w in wedge or w in title for w in ["single button", "simple ui wrapper"]):
            r_score -= 2.5
            r_flags.append("Vulnerable to being absorbed as a minor native feature in a future platform release.")

        r_score = max(1.0, min(10.0, r_score))

        # -------------------------------------------------------------
        # COMPOSITE COMPATIBILITY SCORE CALCULATION
        # -------------------------------------------------------------
        weights = {
            "d_domain": 0.20,
            "v_vibe": 0.20,
            "a_dist": 0.25,  # Crucial for zero-marketing founder
            "t_async": 0.15, # Crucial for India -> US timezone
            "m_part": 0.10,  # Crucial for 2-3h/day
            "r_moat": 0.10
        }

        composite_score = (
            weights["d_domain"] * d_score +
            weights["v_vibe"] * v_score +
            weights["a_dist"] * a_score +
            weights["t_async"] * t_score +
            weights["m_part"] * m_score +
            weights["r_moat"] * r_score
        ) * 10.0

        composite_pct = round(max(10.0, min(99.0, composite_score)), 1)
        is_recommended = composite_pct >= 82.0 and len(d_flags) == 0

        # Highlighting superpowers
        why_you_win = (d_reasons + v_reasons + a_reasons + t_reasons + m_reasons + r_reasons)[:4]
        watch_out = (d_flags + v_flags + a_flags + t_flags + m_flags + r_flags)[:3]

        # Napkin Math for $5k-$10k MRR
        pricing_num = 49
        match = re.search(r'\$(\d+)', pricing)
        if match:
            pricing_num = int(match.group(1))
            if pricing_num > 150: pricing_num = 79 # Normalize team tier

        accounts_for_5k = round(5000 / max(10, pricing_num))
        accounts_for_10k = round(10000 / max(10, pricing_num))

        first_moves = [
            f"1. Vibe-code MVP in 7 days (FastAPI + Supabase + {marketplace_name.split()[0]} OAuth).",
            f"2. Submit to {marketplace_name} to capture Day-1 organic US search volume.",
            f"3. Acquire {accounts_for_5k} customers @ ${pricing_num}/mo flat to hit $5,000 MRR (~₹4.2 Lakhs/mo)."
        ]

        return {
            "opportunity_id": opp.get("id"),
            "opportunity_slug": opp.get("slug"),
            "opportunity_title": opp.get("title"),
            "category_slug": opp.get("category_slug"),
            "compatibility_percentage": composite_pct,
            "is_recommended": is_recommended,
            "marketplace_ecosystem": marketplace_name if has_marketplace else "Direct Web Inbound",
            "dimension_scores": {
                "low_domain_barrier": round(d_score, 1),
                "vibe_codeability": round(v_score, 1),
                "zero_cac_distribution": round(a_score, 1),
                "async_us_sales": round(t_score, 1),
                "part_time_maintenance": round(m_score, 1),
                "platform_defensibility": round(r_score, 1)
            },
            "why_you_win": why_you_win,
            "what_to_watch_out_for": watch_out,
            "target_accounts_to_hit_10k_mrr": {
                "monthly_price_point": f"${pricing_num}/mo",
                "accounts_for_5k_mrr": f"{accounts_for_5k} paying teams",
                "accounts_for_10k_mrr": f"{accounts_for_10k} paying teams",
                "net_cash_flow_inr": f"₹4.2L - ₹8.4L / month"
            },
            "part_time_launch_plan": first_moves
        }

    def rank_opportunities(
        self,
        opportunities: List[Dict[str, Any]],
        profile: Optional[FounderProfile] = None,
        only_recommended: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Evaluates and ranks a list of opportunities, enriching them with founder compatibility payloads.
        """
        prof = profile or FounderProfile()
        ranked = []

        for opp in opportunities:
            eval_res = self.evaluate_opportunity(opp, prof)
            enriched_opp = {
                **opp,
                "founder_compatibility": eval_res
            }
            if only_recommended and not eval_res["is_recommended"]:
                continue
            ranked.append(enriched_opp)

        ranked.sort(
            key=lambda x: (
                x.get("founder_compatibility", {}).get("compatibility_percentage", 0),
                x.get("osi_score", 0)
            ),
            reverse=True
        )

        return ranked

if __name__ == "__main__":
    from pipeline.db_client import DatabaseClient
    db = DatabaseClient()
    opps = db.get_whitespace_opportunities()
    evaluator = FounderFitEvaluator()
    ranked = evaluator.rank_opportunities(opps)
    print(f"Ranked {len(ranked)} opportunities:")
    for r in ranked[:5]:
        fc = r["founder_compatibility"]
        print(f"- [{fc['compatibility_percentage']}% Match] {r['title']} | App Store: {fc['marketplace_ecosystem']}")

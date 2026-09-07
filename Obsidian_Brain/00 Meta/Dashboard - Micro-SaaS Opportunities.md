---
type: dashboard
title: "Micro-SaaS Opportunities Dashboard"
---

# 🚀 Validated Micro-SaaS Opportunities

> [!TIP]
> Filter and discover top-scoring Micro-SaaS ideas extracted from G2 reviews.

## 🔥 Top Opportunities (Ranked by OSI Score)
```dataview
TABLE 
  bucket as "Strategy Bucket",
  target_icp as "Target ICP",
  dev_complexity as "Dev Effort (1-5)",
  estimated_mrr_potential as "MRR Potential",
  osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE osi_score >= 7.0
SORT osi_score DESC
```

## 🏢 Small-Business Self-Serve Fast-Tracks (Dev Complexity <= 2)
```dataview
TABLE 
  target_icp as "Target ICP",
  pricing_model as "Pricing Strategy",
  osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE contains(target_tier, "small_business") AND dev_complexity <= 2
SORT osi_score DESC
```

## 🛰️ Symbiotic Satellites (Orbiting Challengers)
```dataview
TABLE 
  attacked_incumbents as "Incumbents Addressed",
  target_icp as "Target ICP",
  osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE orbit_level = "2_satellite"
SORT osi_score DESC
```
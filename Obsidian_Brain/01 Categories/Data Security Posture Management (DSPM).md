---
type: category
name: "Data Security Posture Management (DSPM)"
slug: "data-security-posture-management-dspm"
---

# 📂 Category: Data Security Posture Management (DSPM)

> G2 Software Category: Data Security Posture Management (DSPM) within Security.

## 🪐 Products in this Category by Orbit Level

### 🔴 Orbit 0: The Behemoths (Market Titans)
```dataview
TABLE rating_avg as "Rating", pricing_model as "Pricing Model", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(category, "Data Security Posture Management (DSPM)") AND orbit_tier = "0_behemoth"
```

### 🟡 Orbit 1: The Challengers (Modern Contenders)
```dataview
TABLE parent_incumbent as "Attacking", rating_avg as "Rating", primary_vulnerability as "New Pain"
FROM "02 Products"
WHERE contains(category, "Data Security Posture Management (DSPM)") AND orbit_tier = "1_challenger"
```

### 🟢 Orbit 2: Micro-SaaS Opportunities
```dataview
TABLE bucket as "Bucket", target_icp as "Target ICP", osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE contains(category, "Data Security Posture Management (DSPM)")
SORT osi_score DESC
```
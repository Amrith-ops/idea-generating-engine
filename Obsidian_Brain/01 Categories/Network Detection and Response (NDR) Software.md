---
type: category
name: "Network Detection and Response (NDR) Software"
slug: "network-detection-and-response-ndr"
---

# 📂 Category: Network Detection and Response (NDR) Software

> G2 Software Category: Network Detection and Response (NDR) Software within Security.

## 🪐 Products in this Category by Orbit Level

### 🔴 Orbit 0: The Behemoths (Market Titans)
```dataview
TABLE rating_avg as "Rating", pricing_model as "Pricing Model", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(category, "Network Detection and Response (NDR) Software") AND orbit_tier = "0_behemoth"
```

### 🟡 Orbit 1: The Challengers (Modern Contenders)
```dataview
TABLE parent_incumbent as "Attacking", rating_avg as "Rating", primary_vulnerability as "New Pain"
FROM "02 Products"
WHERE contains(category, "Network Detection and Response (NDR) Software") AND orbit_tier = "1_challenger"
```

### 🟢 Orbit 2: Micro-SaaS Opportunities
```dataview
TABLE bucket as "Bucket", target_icp as "Target ICP", osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE contains(category, "Network Detection and Response (NDR) Software")
SORT osi_score DESC
```
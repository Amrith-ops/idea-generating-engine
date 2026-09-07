---
type: category
name: "Virtual Reality (VR) Marketplaces"
slug: "vr-marketplace"
---

# 📂 Category: Virtual Reality (VR) Marketplaces

> G2 Software Category: Virtual Reality (VR) Marketplaces within AR/VR.

## 🪐 Products in this Category by Orbit Level

### 🔴 Orbit 0: The Behemoths (Market Titans)
```dataview
TABLE rating_avg as "Rating", pricing_model as "Pricing Model", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(category, "Virtual Reality (VR) Marketplaces") AND orbit_tier = "0_behemoth"
```

### 🟡 Orbit 1: The Challengers (Modern Contenders)
```dataview
TABLE parent_incumbent as "Attacking", rating_avg as "Rating", primary_vulnerability as "New Pain"
FROM "02 Products"
WHERE contains(category, "Virtual Reality (VR) Marketplaces") AND orbit_tier = "1_challenger"
```

### 🟢 Orbit 2: Micro-SaaS Opportunities
```dataview
TABLE bucket as "Bucket", target_icp as "Target ICP", osi_score as "OSI Score"
FROM "04 Micro-SaaS Opportunities"
WHERE contains(category, "Virtual Reality (VR) Marketplaces")
SORT osi_score DESC
```
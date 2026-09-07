---
type: dashboard
title: "Pain Point Heatmap Dashboard"
---

# 🌋 G2 Pain Point Heatmap

## High-Severity Vulnerabilities Across Tools
```dataview
TABLE 
  dimension as "Pain Dimension",
  affected_tier as "Affected Tier",
  severity as "Severity (1-10)"
FROM "03 Pain Clusters"
SORT severity DESC
```
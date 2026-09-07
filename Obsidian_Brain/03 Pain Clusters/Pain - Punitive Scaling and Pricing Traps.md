---
type: pain_cluster
title: "Pain - Punitive Scaling and Pricing Traps"
dimension: "PRICING_TRAP"
severity: 9.2
affected_tier: "small_business"
category: "[[Help Desk Software]]"
affected_products:
  - "[[Zendesk]]"
  - "[[Intercom]]"
  - "[[Gorgias]]"
  - "[[Salesforce Service Cloud]]"
resolving_opportunities:
  - "[[Opp - NanoTicket: Low-Latency Flat-Fee Help Desk]]"
---

# Pain - Punitive Scaling and Pricing Traps

**Dimension**: `PRICING_TRAP`  
**Severity Score**: 🔥 9.2 / 10.0  
**Target Vulnerability Tier**: `small_business`  

## Summary of Market Frustration
Rapidly growing companies feel 'penalized for growing' due to per-seat licensing models and unpredictable usage-based AI resolution fees. The inability to budget for seasonal spikes or team expansion without exponential cost increases creates significant friction for mid-market and small business operations.

## Verified Reviewer Quotes
> *"The per-seat pricing model is becoming a major burden... escalating costs for every additional agent license significantly strain our budget."*

> *"We feel penalized for growing our customer base because the cost of automated resolutions scales faster than our revenue."*

## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
- [[Opp - NanoTicket: Low-Latency Flat-Fee Help Desk]]
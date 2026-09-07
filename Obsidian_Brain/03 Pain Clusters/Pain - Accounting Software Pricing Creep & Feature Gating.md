---
type: pain_cluster
title: "Pain - Accounting Software Pricing Creep & Feature Gating"
dimension: "PRICING_TRAP"
severity: 8.8
affected_tier: "small_business"
category: "[[Accounting Software]]"
affected_products:
  - "[[QuickBooks Online]]"
  - "[[FreshBooks]]"
resolving_opportunities:
  - "[[Opp - Flat-Rate Zero-Bloat Accounting Software Alternative]]"
---

# Pain - Accounting Software Pricing Creep & Feature Gating

**Dimension**: `PRICING_TRAP`  
**Severity Score**: 🔥 8.8 / 10.0  
**Target Vulnerability Tier**: `small_business`  

## Summary of Market Frustration
Small businesses in Accounting Software report escalating monthly subscriptions, restrictive client/seat caps, and essential features locked behind expensive tiers.

## Verified Reviewer Quotes
> *"QuickBooks steadily increases their subscription price every 8 months. Once your historical ledger is inside, it feels like predatory lock-in. Furthermore, basic automated inventory reconciliation requires their most expensive tier."*

> *"Charging by the number of active clients is absurd for freelancers who work with 30 small clients a year. If you cancel or pause your plan in a slow month, they immediately lock you out of your historical invoice PDFs."*

## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
- [[Opp - Flat-Rate Zero-Bloat Accounting Software Alternative]]
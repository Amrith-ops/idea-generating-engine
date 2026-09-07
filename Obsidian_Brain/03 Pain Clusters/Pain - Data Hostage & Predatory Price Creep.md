---
type: pain_cluster
title: "Pain - Data Hostage & Predatory Price Creep"
dimension: "PRICING_TRAP"
severity: 9.2
affected_tier: "small_business"
category: "[[Accounting Software]]"
affected_products:
  - "[[QuickBooks Online]]"
  - "[[FreshBooks]]"
resolving_opportunities:
  - "[[Opp - LedgerVault: The Permanent Accounting Archive]]"
---

# Pain - Data Hostage & Predatory Price Creep

**Dimension**: `PRICING_TRAP`  
**Severity Score**: 🔥 9.2 / 10.0  
**Target Vulnerability Tier**: `small_business`  

## Summary of Market Frustration
Small business owners and freelancers feel trapped by incumbents who use 'data hostage' tactics. FreshBooks locks users out of historical invoice PDFs upon cancellation, while QuickBooks Online leverages the difficulty of migration to impose frequent price hikes and gate essential features like inventory reconciliation behind high-tier enterprise pricing.

## Verified Reviewer Quotes
> *"If you cancel or pause your plan in a slow month, they immediately lock you out of your historical invoice PDFs."*

> *"QuickBooks steadily increases their subscription price every 8 months. Once your historical ledger is inside, it feels like predatory lock-in."*

## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
- [[Opp - LedgerVault: The Permanent Accounting Archive]]
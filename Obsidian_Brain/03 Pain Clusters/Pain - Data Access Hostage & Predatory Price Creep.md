---
type: pain_cluster
title: "Pain - Data Access Hostage & Predatory Price Creep"
dimension: "PRICING_TRAP"
severity: 9.2
affected_tier: "small_business"
category: "[[Accounting Software]]"
affected_products:
  - "[[QuickBooks Online]]"
  - "[[FreshBooks]]"
resolving_opportunities:
  - "[[Opp - LedgerVault: Permanent Invoicing for Freelancers]]"
---

# Pain - Data Access Hostage & Predatory Price Creep

**Dimension**: `PRICING_TRAP`  
**Severity Score**: 🔥 9.2 / 10.0  
**Target Vulnerability Tier**: `small_business`  

## Summary of Market Frustration
Small business owners feel economically coerced by incumbents who leverage historical ledger data as a switching barrier. Once data is 'locked' in the cloud, platforms aggressively increase subscription prices or immediately revoke access to past records upon cancellation or plan downgrades.

## Verified Reviewer Quotes
> *"Once your historical ledger is inside, it feels like predatory lock-in."*

> *"If you cancel or pause your plan in a slow month, they immediately lock you out of your historical invoice PDFs."*

## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
- [[Opp - LedgerVault: Permanent Invoicing for Freelancers]]
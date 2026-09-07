---
type: pain_cluster
title: "Pain - Hostile Per-Seat Pricing & Tier Cliffs"
dimension: "PRICING_TRAP"
severity: 8.5
affected_tier: "small_business"
category: "[[CRM Software]]"
affected_products:
  - "[[HubSpot Sales Hub]]"
  - "[[Salesforce Sales Cloud]]"
resolving_opportunities:
  - "[[Opp - Flat-Rate Linear-Style CRM for 5-Person Dev Agencies]]"
---

# Pain - Hostile Per-Seat Pricing & Tier Cliffs

**Dimension**: `PRICING_TRAP`  
**Severity Score**: 🔥 8.5 / 10.0  
**Target Vulnerability Tier**: `small_business`  

## Summary of Market Frustration
Small business users feel blindsided by massive price jumps between basic and pro tiers (e.g. $20/mo jumping directly to $800/mo) and per-seat taxes that penalize team growth.

## Verified Reviewer Quotes
> *"Suddenly we were forced to upgrade to the $800/month Pro tier for one basic automation."*

> *"Per-seat pricing means we have to share logins, which breaks accountability."*

## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
- [[Opp - Flat-Rate Linear-Style CRM for 5-Person Dev Agencies]]
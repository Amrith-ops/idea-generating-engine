---
type: pain_cluster
title: "Pain - The SMB Pricing Tier Trap"
dimension: "PRICING_TRAP"
severity: 9.2
affected_tier: "small_business"
category: "[[CRM Software]]"
affected_products:
  - "[[HubSpot Sales Hub]]"
  - "[[Zoho CRM]]"
  - "[[Salesforce Sales Cloud]]"
resolving_opportunities:
  - "[[Opp - OutboundZen Simple Sequences]]"
  - "[[Opp - LeanStack CRM for SaaS]]"
---

# Pain - The SMB Pricing Tier Trap

**Dimension**: `PRICING_TRAP`  
**Severity Score**: 🔥 9.2 / 10.0  
**Target Vulnerability Tier**: `small_business`  

## Summary of Market Frustration
Small business owners and startup founders report a 'bait and switch' experience where low entry-level costs quickly escalate due to seat minimums, contact overages, and essential features (like email sequences or basic reporting) being locked behind high-tier 'Enterprise' or 'Professional' paywalls.

## Verified Reviewer Quotes
> *"The pricing is far too expensive for a small business or startup... it feels like a pricing trap."*

> *"While they claim you can start for free, the transition to 'Core Seats' leads to a pricing trap where costs escalate rapidly."*

## Affected Incumbents
```dataview
TABLE rating_avg as "Rating", primary_vulnerability as "Main Flaw"
FROM "02 Products"
WHERE contains(top_pains, this.file.link)
```

## Solved By Micro-SaaS Opportunities
- [[Opp - OutboundZen Simple Sequences]]
- [[Opp - LeanStack CRM for SaaS]]
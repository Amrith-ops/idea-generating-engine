# 🐞 Project Bug Tracker & Issue Resolution Log

**Repository:** `ideas_brain`  
**Location:** `project_management/BUGS.md`  
**Maintained by:** AI Pair Programmer & Lead Engineer  

---

## 📊 Summary Bug Register

| Bug ID | Title | Component | Severity | Discovered Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Duplicate Negative Review Ingestion (Idempotency Deficit) | `pipeline/db_client.py`, `g2_reviews` | **High** | Sep 7, 2026 | **Resolved** ✅ |

---

## 🔍 Detailed Bug Reports & Resolution Logs

### 🐛 BUG-001: Duplicate Negative Review Ingestion in PostgreSQL

* **Symptom:**
  Running the AI Harvester or Category Scraper on the same category (e.g. `accounting` / Xero, QuickBooks) multiple times inserted the exact same verbatim customer review repeatedly (e.g., the *Head of Finance* quote *"Custom reporting is frustratingly rigid. Pulling multi-currency Stripe revenue breakdowns into customized investor spreadsheets requires hours of CSV cleanup."* was duplicated 6 times across IDs `[8, 13, 18, 23, 28, 33]`).

* **Root Cause Analysis (RCA):**
  1. **Schema Deficit:** In `db/01_schema.sql`, the `g2_reviews` table only had a primary key on `id SERIAL` and no unique constraint on `(product_slug, md5(dislike_text))`.
  2. **Code Deficit:** In `pipeline/db_client.py`, the `insert_review(review_data)` method performed a blind `INSERT INTO g2_reviews (...)` without checking whether an identical review text was already present for that `product_slug`.
  3. Every repetitive crawl or live category harvest appended identical review payloads.

* **Impact:**
  - Inflated total review counts.
  - Skewed persona frequency counts (showing 6 duplicate complaints from the same persona).
  - Degraded review evidence display with repetitive quotes.

* **Remediation & Fix Applied:**
  1. **PostgreSQL Migration:**
     - Pruned all historical duplicates, keeping only the earliest `id` for each `(product_slug, md5(dislike_text))` group.
     - Added permanent PostgreSQL unique index:
       ```sql
       CREATE UNIQUE INDEX IF NOT EXISTS idx_g2_reviews_unique_hash 
       ON g2_reviews (product_slug, md5(dislike_text));
       ```
  2. **Code Idempotency:**
     - Updated `insert_review()` in [`pipeline/db_client.py`](file:///c:/ideas_brain/pipeline/db_client.py) to check `SELECT id FROM g2_reviews WHERE product_slug = %s AND md5(dislike_text) = md5(%s)` before executing inserts. If a review already exists, insertion is gracefully skipped.
  3. **Verification:**
     - Verified clean database state: total reviews normalized from 94 to 69 unique reviews.
     - Verified re-insert attempts are idempotently ignored.

---

# 🐞 Project Bug Tracker & Issue Resolution Log

**Repository:** `ideas_brain`  
**Location:** `project_management/BUGS.md`  
**Maintained by:** AI Pair Programmer & Lead Engineer  

---

## 📊 Summary Bug Register

| Bug ID | Title | Component | Severity | Discovered Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | Duplicate Negative Review Ingestion (Idempotency Deficit) | `pipeline/db_client.py`, `g2_reviews` | **High** | Sep 7, 2026 | **Resolved** ✅ |
| **BUG-008** | Multi-Agent Loop Timeout & Step 10 Failure | `pipeline/agents/base_agent.py`, `dashboard/app.py` | **Critical** | Sep 9, 2026 | **Resolved** ✅ |

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

### 🐛 BUG-008: Multi-Agent AI Loop Timeout & Step 10 Failure in Venture Architect Agent

* **Symptom:**
  Executing Phase 3 (*5-Agent AI Loop & Math Matrix*) failed or timed out at Step 10 (*6. Architect & SEO*), showing an error banner in the browser UI and preventing whitespace dossiers from completing.

* **Root Cause Analysis (RCA):**
  1. **Model 503 & Cumulative Latency:** `gemini-3.5-flash` returned `503 Service Unavailable (High Demand)` on Google GenAI endpoints, forcing 15–25s timeout retries on every single agent step. Across 5 sequential agents, the cumulative latency crossed the 180s SSE stream buffer threshold in `dashboard/app.py` (`event_queue.get(timeout=180)`).
  2. **Defensive Keyword Extraction:** LLM output format variations (dictionaries vs strings in `search_demand_keywords`) triggered potential type errors during Google Autocomplete queries.
  3. **PostgreSQL Array Casting:** `unaddressed_pain_slugs` and `attacked_cluster_slugs` were susceptible to passing non-list or `None` values into PostgreSQL `TEXT[]` columns.

* **Remediation & Fix Applied:**
  1. **Model Fallback Chain:** Updated `BaseAgent.run_prompt_with_fallback()` in [`pipeline/agents/base_agent.py`](file:///c:/ideas_brain/pipeline/agents/base_agent.py) to prioritize `["gemini-3.6-flash", "gemini-3-flash-preview", "gemini-3.5-flash"]`. Latency dropped to 1–2s per agent call.
  2. **Keyword Parsing Defense:** Added robust type sanitization in [`pipeline/agents/venture_architect_agent.py`](file:///c:/ideas_brain/pipeline/agents/venture_architect_agent.py) to parse strings, dicts, or fallback queries with zero unhandled exceptions.
  3. **PostgreSQL Array Sanitization:** In [`pipeline/db_client.py`](file:///c:/ideas_brain/pipeline/db_client.py), enforced `[str(x) for x in list if x]` for all `TEXT[]` parameters.
  4. **Extended SSE Queue Timeout:** Increased timeout from 180s to 300s in [`dashboard/app.py`](file:///c:/ideas_brain/dashboard/app.py).

* **Verification:**
  - Ran `AgenticClusteringOrchestrator.execute_agentic_clustering_and_whitespace('help-desk')`. All 10 steps succeeded with 0 errors and synthesized full 10-module IdeaBrowser venture dossiers.

---

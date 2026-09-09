-- G2 Intelligence & Micro-SaaS AI Brain Database Schema
-- Designed for PostgreSQL & Supabase

-- Enable UUID & pgvector if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. G2 Categories Table
CREATE TABLE IF NOT EXISTS g2_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    parent_slug TEXT,
    description TEXT,
    product_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. G2 Products Table (with Orbit classification & Feature sets)
CREATE TABLE IF NOT EXISTS g2_products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_slug TEXT REFERENCES g2_categories(slug) ON DELETE CASCADE,
    orbit_tier TEXT NOT NULL CHECK (orbit_tier IN ('0_behemoth', '1_challenger', '2_satellite')),
    parent_incumbent_slug TEXT,
    rating_avg NUMERIC(3, 2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    pricing_model TEXT,
    market_segment TEXT,
    primary_vulnerability TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    cluster_id TEXT,
    cluster_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. G2 Reviews Table (Filtered by company tier & persona)
CREATE TABLE IF NOT EXISTS g2_reviews (
    id SERIAL PRIMARY KEY,
    product_slug TEXT REFERENCES g2_products(slug) ON DELETE CASCADE,
    reviewer_title TEXT,
    reviewer_industry TEXT,
    company_size_tier TEXT NOT NULL CHECK (company_size_tier IN ('small_business', 'mid_market', 'enterprise')),
    star_rating INTEGER NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
    dislike_text TEXT NOT NULL,
    like_text TEXT,
    pain_dimension TEXT CHECK (pain_dimension IN (
        'COMPLEXITY_BLOAT',
        'PRICING_TRAP',
        'INTEGRATION_GAP',
        'SLOW_UX',
        'POOR_SUPPORT',
        'COMPLIANCE_RESTRICTION'
    )),
    extracted_icp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pain Clusters (Aggregated cross-product weaknesses)
CREATE TABLE IF NOT EXISTS pain_clusters (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category_slug TEXT REFERENCES g2_categories(slug) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    severity_score NUMERIC(3,1) DEFAULT 5.0,
    affected_tier TEXT CHECK (affected_tier IN ('small_business', 'mid_market', 'enterprise', 'all')),
    summary TEXT NOT NULL,
    sample_quotes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Micro-SaaS Opportunities (Scored and categorized dossiers)
CREATE TABLE IF NOT EXISTS microsaas_opportunities (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category_slug TEXT REFERENCES g2_categories(slug) ON DELETE CASCADE,
    bucket TEXT NOT NULL CHECK (bucket IN (
        'The Unbundler',
        'The Vertical Specialist',
        'Pricing Arbitrage',
        'The Bridge & Sync',
        'Speed & Modern UX'
    )),
    orbit_level TEXT NOT NULL CHECK (orbit_level IN ('2_satellite', '1_challenger')),
    attacked_product_slugs TEXT[] DEFAULT '{}',
    target_icp_title TEXT NOT NULL,
    target_tier TEXT NOT NULL CHECK (target_tier IN ('small_business', 'mid_market')),
    target_industry TEXT,
    value_proposition TEXT NOT NULL,
    core_features JSONB DEFAULT '[]'::jsonb,
    pricing_strategy TEXT NOT NULL,
    distribution_channel TEXT NOT NULL,
    dev_complexity INTEGER NOT NULL CHECK (dev_complexity BETWEEN 1 AND 5),
    mrr_potential TEXT NOT NULL,
    osi_score NUMERIC(3,1) NOT NULL,
    status TEXT DEFAULT 'idea_validated',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Competitor Clusters Table (Multi-Signal Affinity Groups)
CREATE TABLE IF NOT EXISTS competitor_clusters (
    id SERIAL PRIMARY KEY,
    cluster_slug TEXT NOT NULL UNIQUE,
    category_slug TEXT REFERENCES g2_categories(slug) ON DELETE CASCADE,
    cluster_name TEXT NOT NULL,
    cluster_theme TEXT,
    target_tier TEXT,
    product_slugs TEXT[] DEFAULT '{}',
    common_pains JSONB DEFAULT '[]'::jsonb,
    unaddressed_gaps JSONB DEFAULT '[]'::jsonb,
    how_it_works JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. White Space Opportunities Table (Synthesized from Cross-Cluster Omissions)
CREATE TABLE IF NOT EXISTS whitespace_opportunities (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    category_slug TEXT REFERENCES g2_categories(slug) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_omission_summary TEXT NOT NULL,
    unaddressed_pain_slugs TEXT[] DEFAULT '{}',
    attacked_cluster_slugs TEXT[] DEFAULT '{}',
    unbundling_wedge TEXT NOT NULL,
    target_icp TEXT NOT NULL,
    pricing_strategy TEXT NOT NULL,
    core_features JSONB DEFAULT '[]'::jsonb,
    search_demand_keywords JSONB DEFAULT '[]'::jsonb,
    venture_dossier JSONB DEFAULT '{}'::jsonb,
    osi_score NUMERIC(3,1) NOT NULL DEFAULT 9.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_products_category ON g2_products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_orbit ON g2_products(orbit_tier);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON g2_reviews(product_slug);
CREATE INDEX IF NOT EXISTS idx_reviews_tier ON g2_reviews(company_size_tier);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON g2_reviews(star_rating);
CREATE INDEX IF NOT EXISTS idx_opps_osi ON microsaas_opportunities(osi_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_g2_reviews_unique_hash ON g2_reviews (product_slug, md5(dislike_text));
CREATE INDEX IF NOT EXISTS idx_clusters_category ON competitor_clusters(category_slug);
CREATE INDEX IF NOT EXISTS idx_whitespace_category ON whitespace_opportunities(category_slug);


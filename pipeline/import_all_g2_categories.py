import re
import lxml.html
import logging
from pathlib import Path
from typing import List, Dict, Any
from pipeline.db_client import DatabaseClient
from pipeline.obsidian_exporter import ObsidianExporter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

HTML_FILE_PATH = Path(r"C:\Users\amrit\.gemini\antigravity-ide\brain\3a82990c-d5cb-470c-846d-e0249590d6ca\.system_generated\steps\72\content.md")

IGNORED_SECTION_KEYWORDS = [
    "services",
    "service providers",
    "consulting",
    "staffing",
    "translation services",
    "value-added resellers",
    "channel partners",
    "hardware"
]

def is_ignored_section(section_name: str) -> bool:
    norm = section_name.lower()
    return any(keyword in norm for keyword in IGNORED_SECTION_KEYWORDS)

def parse_and_sync_g2_categories():
    if not HTML_FILE_PATH.exists():
        raise FileNotFoundError(f"Hierarchy HTML not found at {HTML_FILE_PATH}")

    raw_html = HTML_FILE_PATH.read_text(encoding="utf-8")
    tree = lxml.html.fromstring(raw_html)

    db = DatabaseClient()
    exporter = ObsidianExporter()
    exporter.init_vault_structure()

    h2_elements = tree.xpath("//h2")
    logging.info(f"Found {len(h2_elements)} parent category sections in G2 hierarchy.")

    categories_to_insert = []
    ignored_count = 0
    software_count = 0

    for h2 in h2_elements:
        parent_name = h2.text_content().strip()
        if not parent_name or parent_name.lower().startswith("all"):
            continue

        if is_ignored_section(parent_name):
            logging.info(f"⏭️ Skipping non-software/services section: '{parent_name}'")
            ignored_count += 1
            continue

        parent_slug = re.sub(r'[^a-zA-Z0-9]+', '-', parent_name.lower()).strip('-')

        # Insert Parent Sector as top-level category
        parent_cat = {
            "name": parent_name,
            "slug": parent_slug,
            "parent_slug": None,
            "description": f"Top-level software domain covering all {parent_name} tools and micro-SaaS opportunities."
        }
        db.insert_category(parent_cat["name"], parent_cat["slug"], parent_cat["description"])

        # Extract child category links
        parent_container = h2.getparent()
        links = parent_container.xpath('.//a[contains(@href, "/categories/")]')
        
        # Deduplicate
        seen_slugs = set()
        child_count = 0

        for link in links:
            cat_name = link.text_content().strip()
            href = link.get("href", "")
            if not cat_name or not href:
                continue

            # Extract slug from href e.g. /categories/help-desk -> help-desk
            match = re.search(r'/categories/([a-zA-Z0-9\-]+)', href)
            if not match:
                continue
            cat_slug = match.group(1)

            # Skip service/consulting titles if found in links
            if is_ignored_section(cat_name):
                continue

            if cat_slug in seen_slugs:
                continue
            seen_slugs.add(cat_slug)

            child_cat = {
                "name": cat_name,
                "slug": cat_slug,
                "parent_slug": parent_slug,
                "description": f"G2 Software Category: {cat_name} within {parent_name}."
            }
            db.insert_category(child_cat["name"], child_cat["slug"], child_cat["description"], parent_slug)
            
            # Export Category Note in Obsidian
            exporter.export_category(child_cat, [])
            child_count += 1
            software_count += 1

        logging.info(f"✅ Synced Sector '{parent_name}': {child_count} software sub-categories.")

    logging.info(f"🎉 Complete! Synced {software_count} Software categories across {len(h2_elements) - ignored_count} domains. (Ignored {ignored_count} services sections).")

if __name__ == "__main__":
    parse_and_sync_g2_categories()

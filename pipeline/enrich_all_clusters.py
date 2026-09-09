import json
import logging
from pipeline.db_client import DatabaseClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def enrich_all_clusters():
    db = DatabaseClient()
    clusters = db.fetch_all("SELECT * FROM competitor_clusters")
    logging.info(f"Found {len(clusters)} competitor clusters in database.")

    for c in clusters:
        c_id = c["id"]
        c_slug = c["cluster_slug"]
        c_name = c["cluster_name"]
        tier = (c.get("target_tier") or "Mid-Market").lower()
        prods = c.get("product_slugs") or []
        theme = c.get("cluster_theme") or ""

        # Deterministic rich plain-English templates based on archetype
        if "enterprise" in tier or "heavyweight" in c_slug or "behemoth" in c_slug or "omnichannel" in c_slug or "enterprise" in c_name.lower():
            plain_summary = "Heavy-duty software platforms built for giant corporations with thousands of staff to log, track, and manage complex customer interactions across dozens of global departments."
            analogy = "🛫 Like a Boeing 747 airplane cockpit: Built for giant airlines with thousands of dials and controls—it can handle massive volume, but takes months of training and a manual just to operate."
            workflow_example = [
                "Step 1: A customer emails with an issue. The system generates Ticket #9482, starts an SLA timer, and routes it through 10 corporate rules.",
                "Step 2: An agent opens 4 separate browser tabs to check account records and enterprise compliance checklists.",
                "Step 3: The agent fills out 8 required dropdown fields just to write and send a 2-sentence response."
            ]
            the_catch = "Because it tries to please corporate IT auditors and executives, everyday employees spend more time clicking through slow menus than actually helping customers."
            microsaas_angle = "Build a single-click, fast micro-tool that lets small teams resolve this specific issue in 10 seconds without any 6-month enterprise setup."
            clean_theme = "Massive all-in-one software suites built for corporations with thousands of staff, packed with hundreds of complex settings and compliance controls."

        elif "chat" in c_slug or "conversational" in c_slug or "messenger" in c_slug or "automation" in c_slug or "intercom" in prods or "gorgias" in prods:
            plain_summary = "Modern website chat bubbles and automated bots designed to engage shoppers in real time, answer common questions, and route chats to support staff."
            analogy = "💬 Like WhatsApp or iMessage on steroids for online stores: When visitors land on your website, a chat bubble pops up to answer questions or help them track a package instantly."
            workflow_example = [
                "Step 1: A customer visits an online store and clicks the chat widget asking 'Where is my order?'.",
                "Step 2: An automated AI bot checks store policies and suggests the return or tracking link in 3 seconds.",
                "Step 3: If the customer still needs help, the chat notifies an agent on Slack or mobile to step in."
            ]
            the_catch = "They charge unpredictable fees based on website traffic or message volume, causing monthly software bills to jump from $100 to over $1,500 without warning."
            microsaas_angle = "Offer a transparent, flat-rate live chat tool with zero surprise overage fees and simple 60-second setup."
            clean_theme = "Sleek, real-time messaging and automation tools built to chat with website visitors and resolve questions instantly."

        elif "hubspot" in prods or "growth" in c_slug or "ecosystem" in c_slug:
            plain_summary = "All-in-one marketing and sales suites that bundle email newsletters, website forms, deal pipelines, and customer tracking in a single platform."
            analogy = "🧰 Like an all-in-one Swiss Army knife for sales: It has an email tool, a CRM, and a landing page builder all bolted together so you don't need 5 separate apps."
            workflow_example = [
                "Step 1: A visitor fills out a contact form on a website.",
                "Step 2: The system creates a new deal, sends an automated welcome email, and alerts the sales rep.",
                "Step 3: The sales rep logs their phone call and moves the deal card from 'Lead' to 'Demo Booked'."
            ]
            the_catch = "Starts out affordable or free, but as soon as your contact list grows, you get locked into aggressive contract upgrades that jump to $800+/month."
            microsaas_angle = "Build a dedicated, lightweight utility that solves just one part of their marketing stack (e.g. form capture) for a flat $19/month."
            clean_theme = "All-in-one software suites that bundle sales, marketing, and customer tracking together, but get very expensive as your contact list grows."

        elif "pipeline" in c_slug or "pipedrive" in prods or "crm" in c_slug:
            plain_summary = "Visual sales pipeline trackers that let small businesses organize leads and follow up on sales deals stage by stage."
            analogy = "📋 Like a digital Trello board with dollar values: Sales reps drag and drop lead cards from 'New Lead' to 'Proposal Sent' to 'Deal Closed'."
            workflow_example = [
                "Step 1: A rep adds a new $5,000 deal to the 'New Lead' column.",
                "Step 2: The rep calls the client and drags the card to 'Proposal Sent'.",
                "Step 3: The system creates an automated reminder task to follow up in 3 days."
            ]
            the_catch = "Requires tedious manual data entry for every phone call and email, leading to messy, outdated deal pipelines."
            microsaas_angle = "Build an automated voice-to-CRM tool that logs meeting notes and moves deal stages automatically via voice memo."
            clean_theme = "Visual deal tracking boards built for sales teams that require tedious manual data entry to keep updated."

        else:
            # Value-driven / SMB Productivity Help Desks (Freshdesk, Help Scout, Zoho Desk)
            plain_summary = "Affordable shared inboxes that turn customer support emails and messages into organized ticket queues for small teams."
            analogy = "📥 Like a shared team Gmail inbox with superpowers: Instead of staff sharing one email password or replying twice, every email turns into an organized ticket assigned to one person."
            workflow_example = [
                "Step 1: A customer sends an email to support@company.com asking for a refund.",
                "Step 2: The email appears in a shared team queue, and an agent clicks 'Assign to Me'.",
                "Step 3: The agent applies a pre-saved canned response template and clicks 'Send & Close Ticket'."
            ]
            the_catch = "They lack smart AI automation and get slow and chaotic as soon as customer email volume increases."
            microsaas_angle = "Build an AI co-pilot plugin that auto-categorizes incoming support emails and drafts instant reply templates inside their shared inbox."
            clean_theme = "Affordable, queue-based shared inboxes focused on core ticketing and team assignment for small to mid-sized businesses."

        how_it_works_obj = {
            "plain_english_summary": plain_summary,
            "analogy": analogy,
            "workflow_example": workflow_example,
            "the_catch": the_catch,
            "microsaas_opportunity": microsaas_angle
        }

        db.execute_query(
            """
            UPDATE competitor_clusters
            SET cluster_theme = %s,
                how_it_works = %s
            WHERE id = %s
            """,
            (clean_theme, json.dumps(how_it_works_obj), c_id)
        )
        logging.info(f"Updated cluster #{c_id} ({c_name}) with plain English analogy & workflow.")

    logging.info("✅ All competitor clusters successfully enriched!")

if __name__ == "__main__":
    enrich_all_clusters()

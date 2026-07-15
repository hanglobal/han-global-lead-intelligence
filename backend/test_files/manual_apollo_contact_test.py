import os
import json
import sys
import logging
from pathlib import Path

# Set up logging for the manual script
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Ensure the backend directory is in the sys path to import the service
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from services.apollo_client import ApolloClient

def load_env():
    """Manually parse backend/.env for APOLLO_API_KEY to keep dependencies minimal"""
    env_path = Path(__file__).parent / 'backend' / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('APOLLO_API_KEY='):
                    os.environ['APOLLO_API_KEY'] = line.split('=', 1)[1].strip("'\"")

def run_apollo_contact_test(domain: str, title: str):
    # Ensure API key is present
    api_key = os.environ.get('APOLLO_API_KEY')
    if not api_key:
        print("❌ Error: APOLLO_API_KEY is missing in backend/.env or environment.")
        return

    client = ApolloClient(api_key=api_key)
    
    # Sanitize domain
    clean_domain = domain.replace("http://", "").replace("https://", "").strip("/")
    clean_domain = clean_domain.split('/')[0]
    
    print("=" * 60)
    print(f"🚀 Starting Apollo API Contact Test")
    print(f"Domain: {clean_domain}")
    print(f"Target Title: {title}")
    print("=" * 60)

    md_filename = f"/home/owais/reli/test_results/{clean_domain}-contact-test.md"
    
    with open(md_filename, "w") as f:
        f.write(f"# Apollo API Contact Test Results for `{domain}`\n\n")
        f.write("> **WARNING:** This script performs an operation that consumes 1 Export/Contact Credit per successful match.\n\n")
        
        # Step 1: Find the person (Free)
        print(f"\n[1/2] Searching for '{title}' at {clean_domain} (Costs 0 Credits)...")
        people_data = client.search_people_by_domain(clean_domain, limit=1, titles=[title])
        
        if not people_data:
            print(f"❌ No person found with title '{title}' at {clean_domain}.")
            f.write(f"❌ No person found with title '{title}' at {clean_domain}.\n")
            return
            
        target_person = people_data[0]
        first_name = target_person.get('first_name') or ""
        last_name = target_person.get('last_name') or ""
        
        if not first_name and not last_name:
            print("❌ Found a person but they lack both first and last name, cannot enrich.")
            f.write("❌ Found a person but they lack both first and last name, cannot enrich.\n")
            return
            
        print(f"✅ Found {first_name} {last_name} ({target_person.get('title')}).")
        
        apollo_id = target_person.get('id')
        
        # Step 2: Enrich to get contact info (Costs 1 Credit)
        print(f"\n[2/2] Revealing Contact Info for {first_name} {last_name} (COSTS 1 CREDIT)...")
        contact_info = client.enrich_person(clean_domain, first_name, last_name, apollo_id=apollo_id)
        
        if contact_info:
            print(f"✅ Contact Info Retrieved Successfully! Saved to {md_filename}")
            print(json.dumps(contact_info, indent=4))
            
            f.write(f"## Contact Info for {first_name} {last_name} (Consumed 1 Export Credit)\n\n")
            f.write("```json\n")
            f.write(json.dumps(contact_info, indent=4))
            f.write("\n```\n")
        else:
            print("❌ Failed to reveal contact info.")
            f.write("❌ Failed to reveal contact info.\n")

    print("\n" + "=" * 60)
    print("🏁 Test Completed!")
    print("=" * 60)

if __name__ == "__main__":
    load_env()
    
    if len(sys.argv) > 2:
        test_domain = sys.argv[1]
        test_title = sys.argv[2]
    else:
        print("Usage: python manual_apollo_contact_test.py <domain> <title>")
        print("Example: python manual_apollo_contact_test.py apollo.io CEO")
        sys.exit(1)
        
    run_apollo_contact_test(test_domain, test_title)

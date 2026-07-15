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

def run_apollo_people_test(domain: str):
    # Ensure API key is present
    api_key = os.environ.get('APOLLO_API_KEY')
    if not api_key:
        print("❌ Error: APOLLO_API_KEY is missing in backend/.env or environment.")
        return

    client = ApolloClient(api_key=api_key)
    
    # Sanitize domain to remove http://, https://, and trailing slashes
    clean_domain = domain.replace("http://", "").replace("https://", "").strip("/")
    # In case it has paths like domain.com/path
    clean_domain = clean_domain.split('/')[0]
    
    print("=" * 60)
    print(f"🚀 Starting Apollo API People Test for domain: {clean_domain}")
    print("=" * 60)

    md_filename = f"/home/owais/reli/test_results/{clean_domain}-apollo-people.md"
    
    with open(md_filename, "w") as f:
        f.write(f"# Apollo API People Test Results for `{domain}`\n\n")
        f.write("> **Note:** This script ONLY performs People Search for all available employees (up to limit). It does NOT fetch contact info (emails/phones) to guarantee 0 export credits are used.\n\n")
        
        # People Discovery (0 Credits)
        print("\n[1/1] Fetching Free People Discovery List for All Employees (Costs 0 Credits)...")
        people_data = client.search_people_by_domain(clean_domain, limit=100)
        
        if people_data:
            print(f"✅ Found {len(people_data)} people! Saved to {md_filename}")
            print(json.dumps(people_data, indent=4))
            
            f.write("## All Employees Data (0 Export Credits)\n\n")
            f.write("```json\n")
            f.write(json.dumps(people_data, indent=4))
            f.write("\n```\n")
        else:
            print("❌ No people found or search failed.")
            f.write("## All Employees Data\n\n")
            f.write("❌ No people found or search failed.\n")

    print("\n" + "-" * 60)
    print("ℹ️ Note: If you want to test Organization Enrichment, please run `python manual_apollo_test.py` instead.")
    print("ℹ️ You can verify your Apollo Dashboard -> 'Credit Usage' to confirm that 0 Export/Email credits were deducted.")

    print("\n" + "=" * 60)
    print("🏁 Test Completed!")
    print("=" * 60)

if __name__ == "__main__":
    load_env()
    
    if len(sys.argv) > 1:
        test_domain = sys.argv[1]
    else:
        print("Usage: python manual_apollo_people_test.py <domain>")
        print("Example: python manual_apollo_people_test.py apollo.io")
        sys.exit(1)
        
    run_apollo_people_test(test_domain)

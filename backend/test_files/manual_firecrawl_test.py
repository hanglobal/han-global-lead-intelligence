import os
import sys
import re
from pathlib import Path

# Add backend directory to path so we can import from services
BASE_DIR = Path(__file__).resolve().parent
backend_dir = BASE_DIR / 'backend'
sys.path.insert(0, str(backend_dir))

# Load .env manually from backend directory
env_path = backend_dir / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value

from services.firecrawl_client import FirecrawlClient

def clean_filename(url):
    """Clean the URL to create a valid filename"""
    name = re.sub(r'^https?://', '', url)
    name = re.sub(r'^www\.', '', name)
    name = re.sub(r'[^a-zA-Z0-9]', '_', name)
    name = name.strip('_')
    return f"{name}.md"

def main():
    if len(sys.argv) < 2:
        print("Usage: python manual_firecrawl_test.py <website_url>")
        print("Example: python manual_firecrawl_test.py https://example.com")
        sys.exit(1)
        
    url = sys.argv[1]
    
    api_key = os.environ.get('FIRECRAWL_API_KEY')
    if not api_key:
        print("Error: FIRECRAWL_API_KEY environment variable is not set.")
        sys.exit(1)
        
    print(f"Initializing Firecrawl for URL: {url}")
    client = FirecrawlClient(api_key=api_key)
    
    # Use proper regex patterns that work with Firecrawl include_paths
    # Only scraping Home, About, Services/Products, Contact, Team, and Testimonials
    include_paths = [
        "^/?$",              # Home page exactly (matches / or empty path)
        ".*home.*",          # In case home is /home
        ".*about.*",         # About pages
        ".*who.*we.*are.*",
        ".*our.*story.*",
        ".*company.*",
        ".*service.*",       # Services / Products
        ".*product.*",
        ".*what.*we.*do.*",
        ".*solution.*",
        ".*offering.*",
        ".*contact.*",       # Contact pages
        ".*get.*in.*touch.*",
        ".*reach.*out.*",
        ".*support.*",
        ".*help.*",
        ".*team.*",          # Team / People pages
        ".*people.*",
        ".*leadership.*",
        ".*management.*",
        ".*staff.*",
        ".*meet.*",
        ".*testimonial.*",   # Testimonial / Review pages
        ".*review.*",
        ".*customer.*say.*",
        ".*what.*people.*say.*",
        ".*success.*stor.*",
        ".*case.*stud.*"
    ]
    
    print(f"Crawling {url}...")
    print(f"Focusing ONLY on these paths: {include_paths}")
    print("Please wait, crawling may take 1-3 minutes...")
    
    result = client.crawl_website(url, limit=6, include_paths=include_paths)
    
    if isinstance(result, dict) and result.get('error'):
        print(f"An error occurred: {result['error']}")
        sys.exit(1)
        
    # Normalise result
    if isinstance(result, dict):
        pages = result.get('data') or []
    elif isinstance(result, list):
        pages = result
    else:
        if hasattr(result, 'model_dump'):
            pages = result.model_dump().get('data', [])
        elif hasattr(result, 'dict'):
            pages = result.dict().get('data', [])
        else:
            pages = []
            
    if not pages:
        print("No pages were found or returned from Firecrawl.")
        sys.exit(0)
        
    print(f"Successfully scraped {len(pages)} pages.")
    
    # Combine all markdown content
    combined_markdown = f"# Firecrawl Scrape Results for {url}\n\n"
    for i, page in enumerate(pages):
        page_dict = page.model_dump() if hasattr(page, 'model_dump') else (page.dict() if hasattr(page, 'dict') else page)
        
        metadata = page_dict.get('metadata', {})
        page_url = metadata.get('sourceURL') or metadata.get('url') or 'Unknown URL'
        markdown = page_dict.get('markdown', 'No markdown content')
        
        combined_markdown += f"## Page {i+1}: {page_url}\n\n{markdown}\n\n---\n\n"
        
    filename = clean_filename(url)
    filepath = Path('/home/owais/reli/test_results') / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(combined_markdown)
        
    print(f"\nDone! Output saved to: {filepath}")

if __name__ == "__main__":
    main()

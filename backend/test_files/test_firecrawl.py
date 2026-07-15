"""
Firecrawl integration test.
Crawls a target website and saves the full results to a .md file
in the backend root directory.

Usage:
    # Set key in .env or export it:
    export FIRECRAWL_API_KEY="fc-..."
    python test_firecrawl.py [URL] [limit]

Defaults:
    URL   = https://miamishome.com/
    limit = 5
"""
import os
import sys
from datetime import datetime
from pathlib import Path

# ── Path setup ──────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

import django

# ── Load .env manually (no Django, no django-environ) ───────────────────────
env_path = BASE_DIR / '.env'
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

# Setup Django before importing any models or services
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from services.firecrawl_client import FirecrawlClient
from apps.enrichment.models import LeadEnrichment



# ── Helpers ──────────────────────────────────────────────────────────────────

def _to_dict(obj):
    """Normalize Pydantic model or dict into a plain dict."""
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    if hasattr(obj, 'dict'):
        return obj.dict()
    if isinstance(obj, dict):
        return obj
    return {}


def _build_markdown_report(target_url: str, pages: list) -> str:
    """Build a clean Markdown report from crawled pages."""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    lines = [
        f"# 🔥 Firecrawl Test Report",
        f"",
        f"| Key | Value |",
        f"|---|---|",
        f"| **Target URL** | {target_url} |",
        f"| **Run at** | {ts} |",
        f"| **Pages crawled** | {len(pages)} |",
        f"",
        f"---",
        f"",
    ]

    for i, page in enumerate(pages, start=1):
        page = _to_dict(page)
        metadata = page.get('metadata') or {}
        if isinstance(metadata, object) and hasattr(metadata, '__dict__'):
            metadata = metadata.__dict__

        source_url   = metadata.get('sourceURL') or metadata.get('url') or 'Unknown URL'
        title        = metadata.get('title') or 'No title'
        description  = metadata.get('description') or ''
        status_code  = metadata.get('statusCode') or ''
        markdown     = page.get('markdown') or ''

        lines += [
            f"## Page {i} — {title}",
            f"",
            f"| | |",
            f"|---|---|",
            f"| **URL** | {source_url} |",
        ]
        if status_code:
            lines.append(f"| **Status** | {status_code} |")
        if description:
            lines.append(f"| **Description** | {description} |")
        lines += [
            f"| **Content length** | {len(markdown):,} chars |",
            f"",
        ]

        if markdown:
            lines += [
                f"### Content",
                f"",
                markdown.strip(),
                f"",
            ]
        else:
            lines.append(f"> ⚠️ No markdown content returned for this page.\n")

        lines += ["---", ""]

    return '\n'.join(lines)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    target_url = sys.argv[1] if len(sys.argv) > 1 else 'https://www.rising-phoenix.com/'
    limit      = int(sys.argv[2]) if len(sys.argv) > 2 else 5

    # Define paths to include (regex patterns)
    include_paths = [
        "/*$",               # Home page
        ".*about.*",         # About pages
        ".*who.*we.*are.*", 
        ".*our.*value.*",
        ".*contact.*",       # Contact pages
        ".*keep.*in.*touch.*",
        ".*team.*",          # Team pages
        ".*people.*",
        ".*testimonial.*",   # Testimonial pages
        ".*customer.*says.*"
    ]

    api_key = os.environ.get('FIRECRAWL_API_KEY', '')
    if not api_key:
        print('❌  FIRECRAWL_API_KEY is not set.')
        print('    Set it in backend/.env or: export FIRECRAWL_API_KEY="fc-..."')
        sys.exit(1)

    print(f'🔑  API key found  ({api_key[:8]}...)')
    print(f'🌐  Target URL    : {target_url}')
    print(f'📄  Page limit    : {limit}')
    print(f'🔍  Target paths  : {", ".join(include_paths[:3])} ...')
    print(f'⏳  Crawling... (this may take 1-3 minutes)\n')

    client = FirecrawlClient(api_key=api_key)
    result = client.crawl_website(target_url, limit=limit, include_paths=include_paths)

    # Handle error at top level
    if isinstance(result, dict) and result.get('error'):
        print(f'❌  Firecrawl error: {result["error"]}')
        sys.exit(1)

    # Normalise — result may be a dict with 'data' list, or a direct list
    if isinstance(result, dict):
        pages = result.get('data') or []
    elif isinstance(result, list):
        pages = result
    else:
        raw = _to_dict(result)
        pages = raw.get('data') or []

    if not pages:
        print('⚠️   No pages returned. Check the URL and your API key.')
        sys.exit(1)

    print(f'✅  Crawled {len(pages)} page(s)')

    # ── Save to Database ─────────────────────────────────────────────────────
    run_id = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    # Just saving the raw pages directly to DB
    normalized_pages = [_to_dict(p) for p in pages]
    enrichment = LeadEnrichment.objects.create(
        scraper_run_id=run_id,
        web_scrape_raw=normalized_pages
    )
    print(f'💾  Saved to DB → LeadEnrichment ID: {enrichment.id} (Run: {run_id})')

    # ── Build report ─────────────────────────────────────────────────────────
    report_md = _build_markdown_report(target_url, pages)

    # ── Save to file ──────────────────────────────────────────────────────────
    slug = target_url.replace('https://', '').replace('http://', '').rstrip('/')
    slug = slug.replace('/', '_').replace('.', '_')[:40]
    ts_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    out_filename = f'firecrawl_{slug}_{ts_str}.md'
    out_path = Path('/home/owais/reli/test_results') / out_filename

    out_path.write_text(report_md, encoding='utf-8')

    print(f'\n📝  Report saved → {out_path}')
    print(f'    Size: {out_path.stat().st_size:,} bytes\n')

    # ── Console summary ───────────────────────────────────────────────────────
    print('─' * 60)
    print(f'  {"#":<4} {"Title":<35} {"Chars":>8}')
    print('─' * 60)
    for i, page in enumerate(pages, 1):
        p = _to_dict(page)
        meta   = p.get('metadata') or {}
        if hasattr(meta, '__dict__'):
            meta = meta.__dict__
        title  = (meta.get('title') or 'No title')[:34]
        chars  = len(p.get('markdown') or '')
        print(f'  {i:<4} {title:<35} {chars:>8,}')
    print('─' * 60)
    print(f'\nOpen the report: code {out_path}')


if __name__ == '__main__':
    main()

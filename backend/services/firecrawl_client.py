import os
import logging
from typing import Dict, Any, Optional
from firecrawl import FirecrawlApp

logger = logging.getLogger(__name__)

class FirecrawlClient:
    """
    Client for interacting with the Firecrawl API to scrape web content.
    Provides clean markdown for downstream LLM ingestion.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Firecrawl application.
        Defaults to using the FIRECRAWL_API_KEY environment variable if api_key is not provided.
        """
        self.api_key = api_key or os.environ.get('FIRECRAWL_API_KEY')
        if not self.api_key:
            logger.warning("FIRECRAWL_API_KEY is not set. Firecrawl client will not be able to authenticate.")
            # Initialize with empty key just so the class instantiates, but API calls will fail.
            self.app = FirecrawlApp(api_key="")
        else:
            self.app = FirecrawlApp(api_key=self.api_key)

    def scrape_website(self, url: str) -> Dict[str, Any]:
        """
        Scrape a single URL and return the result.
        
        Returns:
            Dict containing the 'markdown' content and 'metadata' (title, description, etc.).
            Example: {'markdown': '...', 'metadata': {'title': '...'}}
        """
        try:
            logger.info(f"Initiating Firecrawl scrape for URL: {url}")
            
            # Use scrape_url (or scrape) depending on the exact sdk version. 
            # In the latest versions, it's typically `scrape_url`.
            result = self.app.scrape_url(url)
            
            logger.info(f"Successfully scraped URL: {url}")
            # In newer versions of the SDK, scrape_url returns a Pydantic model.
            # Convert it to a dictionary so it matches our expected return type.
            # Convert it to a dictionary so it matches our expected return type.
            if hasattr(result, 'model_dump'):
                result = result.model_dump()
            elif hasattr(result, 'dict'):
                result = result.dict()
            elif not isinstance(result, dict):
                # Fallback if it's just an object
                result = {
                    "markdown": getattr(result, "markdown", ""),
                    "metadata": getattr(result, "metadata", {})
                }
                
            import json
            from django.core.serializers.json import DjangoJSONEncoder
            return json.loads(json.dumps(result, cls=DjangoJSONEncoder))
        except Exception as e:
            logger.error(f"Error scraping {url} via Firecrawl: {str(e)}")
            return {
                "markdown": "",
                "metadata": {},
                "error": str(e)
            }

    def crawl_website(self, url: str, limit: int = 6, include_paths: Optional[list] = None) -> Dict[str, Any]:
        """
        Crawl a website to find specific pages (home, about, contact, team, testimonials).
        This will poll the Firecrawl API until the crawl completes.
        """
        if include_paths is None:
            # Default exhaustive regex paths for the required 6 types of pages
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

        try:
            logger.info(f"Initiating Firecrawl crawl for URL: {url} with limit {limit}")
            
            # Firecrawl v2 SDK takes arguments directly as kwargs
            kwargs = {
                'limit': limit,
                'formats': ['markdown'],
                'poll_interval': 8  # 8s status polling to stay well under 10 RPM general API rate limit
            }
            if include_paths:
                kwargs['include_paths'] = include_paths

            crawl_result = self.app.crawl(url, **kwargs)
            
            logger.info(f"Successfully crawled URL: {url}")
            
            # crawl_result is typically a dictionary containing a 'data' list with each page scraped
            # Or it might be a list directly, depending on the SDK version.
            if hasattr(crawl_result, 'model_dump'):
                crawl_result = crawl_result.model_dump()
            elif hasattr(crawl_result, 'dict'):
                crawl_result = crawl_result.dict()
                
            import json
            from django.core.serializers.json import DjangoJSONEncoder
            # Convert any non-serializable objects (like datetime) to string
            crawl_result = json.loads(json.dumps(crawl_result, cls=DjangoJSONEncoder))
                
            return crawl_result
        except Exception as e:
            logger.error(f"Error crawling {url} via Firecrawl: {str(e)}")
            return {
                "data": [],
                "error": str(e)
            }

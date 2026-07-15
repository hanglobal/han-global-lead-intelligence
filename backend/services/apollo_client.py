import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ApolloClient:
    """
    Client for interacting with the Apollo.io API.
    Currently supports Organization Enrichment.
    """
    
    BASE_URL = "https://api.apollo.io/v1"

    def __init__(self, api_key: Optional[str] = None):
        # Allow passing API key explicitly, otherwise fall back to environment variable
        self.api_key = api_key or os.environ.get('APOLLO_API_KEY')
        if not self.api_key:
            logger.warning("Apollo API key is missing. Set APOLLO_API_KEY in environment variables.")

    def enrich_organization(self, domain: str) -> Dict[str, Any]:
        """
        Enriches organization data using a company domain.
        This endpoint consumes 1 credit per successful match.
        It does NOT retrieve people/contact data, keeping credit usage minimal.
        
        Args:
            domain (str): The company's website domain (e.g., "example.com")
            
        Returns:
            Dict: The enriched organization data, or an empty dict if not found/failed.
        """
        if not self.api_key:
            logger.error("Cannot enrich organization: Apollo API key is not set.")
            return {}

        url = f"{self.BASE_URL}/organizations/enrich"
        
        # We only pass the domain in params, API key in headers (as required by recent Apollo updates).
        params = {
            "domain": domain
        }
        
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": self.api_key
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(url, params=params, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    organization = data.get("organization")
                    
                    if organization:
                        logger.info(f"Successfully enriched organization for domain: {domain}")
                        return self._extract_useful_fields(organization)
                    else:
                        logger.info(f"No organization data found for domain: {domain}")
                        return {}
                        
                elif response.status_code == 422:
                    logger.warning(f"Apollo API: Invalid domain or no match found for {domain}")
                    return {}
                elif response.status_code == 401:
                    logger.error("Apollo API: Unauthorized. Please check your API key.")
                    return {}
                elif response.status_code == 429:
                    logger.error("Apollo API: Rate limit exceeded.")
                    return {}
                else:
                    logger.error(f"Apollo API error: {response.status_code} - {response.text}")
                    return {}

        except httpx.RequestError as e:
            logger.error(f"HTTP Request failed while contacting Apollo API: {e}")
            return {}
        except Exception as e:
            logger.error(f"Unexpected error during Apollo enrichment: {e}")
            return {}

    def search_people_by_domain(self, domain: str, limit: int = 10, titles: list = None) -> list:
        """
        Searches for people working at a specific company domain.
        This endpoint (when NOT requesting emails/phones) is generally free (0 credits) 
        and is used for prospecting/discovery.
        
        Args:
            domain (str): The company domain.
            limit (int): Number of people to return.
            titles (list): List of titles to filter by (e.g., ["ceo", "cto"])
            
        Returns:
            list: A list of people profiles (names, titles, linkedin urls).
        """
        if not self.api_key:
            logger.error("Cannot search people: Apollo API key is not set.")
            return []
            
        url = f"{self.BASE_URL}/mixed_people/api_search"
        
        payload = {
            "q_organization_domains": domain,
            "page": 1,
            "per_page": limit
        }
        
        if titles:
            payload["person_titles"] = titles
        
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": self.api_key
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    people = data.get("people", [])
                    logger.info(f"Successfully found {len(people)} people for domain: {domain}")
                    
                    # Extract only useful public data, no emails to ensure 0 credit usage
                    clean_people = []
                    for p in people:
                        clean_people.append({
                            "id": p.get("id"),
                            "first_name": p.get("first_name"),
                            "last_name": p.get("last_name"),
                            "title": p.get("title"),
                            "linkedin_url": p.get("linkedin_url"),
                            "city": p.get("city"),
                            "state": p.get("state")
                        })
                    return clean_people
                    
                else:
                    logger.error(f"Apollo API error on people search: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error during Apollo people search: {e}")
            return []

    def _extract_useful_fields(self, org_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts only the most relevant firmographic and technographic data 
        from the raw Apollo response to keep the CRM signals clean.
        """
        return {
            "apollo_id": org_data.get("id"),
            "name": org_data.get("name"),
            "website_url": org_data.get("website_url"),
            "industry": org_data.get("industry"),
            "employee_count": org_data.get("estimated_num_employees"),
            "founded_year": org_data.get("founded_year"),
            "annual_revenue": org_data.get("annual_revenue_printed"),
            "headquarters": {
                "city": org_data.get("city"),
                "state": org_data.get("state"),
                "country": org_data.get("country"),
            },
            "corporate_phone": org_data.get("phone"),
            "social_links": {
                "linkedin": org_data.get("linkedin_url"),
                "twitter": org_data.get("twitter_url"),
                "facebook": org_data.get("facebook_url"),
            },
            "keywords": org_data.get("keywords", []),
            "tech_stack": [tech.get("name") for tech in org_data.get("current_technologies", []) if tech.get("name")]
        }

    def enrich_person(self, domain: str, first_name: str, last_name: str, apollo_id: str = None) -> Dict[str, Any]:
        """
        Enriches a person to get contact info (emails, phones).
        This consumes 1 Export/Contact Credit per successful match!
        
        Args:
            domain (str): The company domain.
            first_name (str): Person's first name.
            last_name (str): Person's last name.
            apollo_id (str): Optional Apollo ID for exact matching.
            
        Returns:
            Dict: The enriched person data containing email and phone numbers.
        """
        if not self.api_key:
            logger.error("Cannot enrich person: Apollo API key is not set.")
            return {}

        url = f"{self.BASE_URL}/people/match"
        
        payload = {
            "domain": domain,
            "reveal_personal_emails": True
        }
        
        if apollo_id:
            payload["id"] = apollo_id
        
        if first_name:
            payload["first_name"] = first_name
            
        if last_name:
            payload["last_name"] = last_name
        
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": self.api_key
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    person = data.get("person")
                    
                    if person:
                        logger.info(f"Successfully enriched person: {first_name} {last_name} at {domain}")
                        return {
                            "id": person.get("id"),
                            "first_name": person.get("first_name"),
                            "last_name": person.get("last_name"),
                            "title": person.get("title"),
                            "email": person.get("email"),
                            "phone_numbers": person.get("phone_numbers", []),
                            "linkedin_url": person.get("linkedin_url"),
                            "city": person.get("city"),
                            "state": person.get("state")
                        }
                    else:
                        logger.info(f"No contact data found for: {first_name} {last_name} at {domain}")
                        return {}
                        
                elif response.status_code == 422:
                    logger.warning(f"Apollo API: Invalid parameters for person match.")
                    return {}
                elif response.status_code == 401:
                    logger.error("Apollo API: Unauthorized. Please check your API key.")
                    return {}
                elif response.status_code == 429:
                    logger.error("Apollo API: Rate limit exceeded.")
                    return {}
                else:
                    logger.error(f"Apollo API error on person match: {response.status_code} - {response.text}")
                    return {}

        except Exception as e:
            logger.error(f"Error during Apollo person enrichment: {e}")
            return {}

# Example usage for manual testing (Will not be executed automatically)
if __name__ == "__main__":
    # Ensure you have APOLLO_API_KEY in your environment to test this
    client = ApolloClient()
    result = client.enrich_organization("apollo.io")
    print(result)

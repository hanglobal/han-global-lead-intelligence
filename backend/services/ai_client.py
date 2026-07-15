import os
import json
import httpx
from pathlib import Path
import logging
import anthropic

logger = logging.getLogger(__name__)

class AIClient:
    def __init__(self):
        self.ollama_base_url = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')
        self.ollama_model = os.environ.get('OLLAMA_MODEL', 'llama3')
        self.ollama_api_key = os.environ.get('OLLAMA_API_KEY')
        self.anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY')
        
        self.prompts_dir = Path(__file__).parent / 'prompts'
        
        self.insight_prompt_template = self._load_prompt('insight_prompt.txt')
        self.email_draft_prompt_template = self._load_prompt('email_draft_prompt.txt')

    def _load_prompt(self, filename: str) -> str:
        filepath = self.prompts_dir / filename
        if filepath.exists():
            return filepath.read_text(encoding='utf-8')
        return ""

    def generate_insights(self, lead_data: dict) -> dict:
        prompt = self.insight_prompt_template.format(lead_data=json.dumps(lead_data, indent=2))
        
        response_text = self._call_ai(prompt, system_prompt="You are an expert sales analyst. Always return strictly valid JSON.")
        
        return self._parse_json(response_text, ["pain_points", "operational_gap", "opportunity"])

    def generate_email_draft(self, lead_data: dict, insights: dict) -> dict:
        prompt = self.email_draft_prompt_template.format(
            lead_data=json.dumps(lead_data, indent=2),
            insights=json.dumps(insights, indent=2)
        )
        
        response_text = self._call_ai(prompt, system_prompt="You are an expert SDR. Always return strictly valid JSON.")
        
        return self._parse_json(response_text, ["subject", "body"])

    def consolidate_lead_data(self, cr) -> bool:
        """
        Consolidates raw GMap data and Firecrawl data from a CampaignResult into a clean JSON format.
        Extracts valid emails, phone numbers, website, address, and a company summary.
        Saves the resulting JSON into CampaignResult.ai_clean_data.
        """
        payload = {
            "gmap_raw_data": cr.raw_data or {},
            "website_scrape_data": cr.firecrawl_raw_data or {}
        }
        
        from apps.crm.models import LeadQualificationSettings
        settings = LeadQualificationSettings.get_settings()
        agency_services = settings.agency_services
        
        
        prompt = (
            "You are an expert data analyst and consolidation engine.\n"
            "I am providing you with two raw JSON datasets for a single company: one from Google Maps and one from their Website Scrape.\n"
            "Your task is to analyze both, combine their data, and generate a clean JSON output containing all the necessary fields for our CRM.\n\n"
            f"Here are the services our agency provides: '{agency_services}'. You must evaluate if this company is an ideal customer for us.\n\n"
            "Requirements for the output JSON (use exactly these keys, provide null if data is not found):\n"
            'IMPORTANT RULES FOR VALUES:\n'
            '- Clean all URLs: Remove all UTM parameters, query strings, and extra tracking mess. Keep only the core, clean URL.\n'
            '- Multiple Values: If you find multiple phone numbers, emails, or social media URLs, join them with a comma (", ") and return them as a single string. DO NOT return an array for these fields.\n\n'
            '1. "name": The cleanest version of the company name.\n'
            '2. "category": The business category (e.g., Real estate agent).\n'
            '3. "rating": The average rating (float).\n'
            '4. "review_count": Total number of reviews (integer).\n'
            '5. "price_level": Price level if available.\n'
            '6. "address": The full address.\n'
            '7. "street_address": Just the street part of the address.\n'
            '8. "neighborhood": Neighborhood or district.\n'
            '9. "city": City.\n'
            '10. "postal_code": Zip or postal code.\n'
            '11. "latitude": Latitude (float).\n'
            '12. "longitude": Longitude (float).\n'
            '13. "phone": All valid phone numbers, comma separated.\n'
            '14. "company_email": All valid emails found, comma separated.\n'
            '15. "website": The clean website URL.\n'
            '16. "google_maps_url": The clean Google Maps URL.\n'
            '17. "facebook_url": Clean Facebook page URLs, comma separated.\n'
            '18. "twitter_url": Clean Twitter/X page URLs, comma separated.\n'
            '19. "instagram_url": Clean Instagram page URLs, comma separated.\n'
            '20. "linkedin_url": Clean LinkedIn page URLs, comma separated.\n'
            '21. "youtube_url": Clean YouTube channel URLs, comma separated.\n'
            '22. "tiktok_url": Clean TikTok URLs, comma separated.\n'
            '23. "pinterest_url": Clean Pinterest URLs, comma separated.\n'
            '24. "company_summary": A short, clear paragraph (2-3 sentences) summarizing what the company does based on the website data.\n'
            '25. "working_hours": A clear, concise summary of their business or working hours (e.g., "Mon-Fri: 9am-5pm" or "Open 24/7").\n'
            '26. "is_ideal_customer": true if they seem like a good fit for our agency services, false otherwise. If our agency services are empty, return true.\n'
            '27. "qualification_reasoning": A 1-2 sentence explanation of why they are or are not a good fit based on their data and our services.\n\n'
            f"Here is the raw data:\n{json.dumps(payload, indent=2)}\n\n"
            "Respond ONLY with strictly valid JSON. Do not include any conversational text or markdown blocks outside the JSON."
        )
        
        response_text = self._call_ai(prompt, system_prompt="You are a strict JSON data processor. You must merge datasets and return valid JSON only.")
        
        expected_keys = [
            "name", "category", "rating", "review_count", "price_level", "address", 
            "street_address", "neighborhood", "city", "postal_code", "latitude", "longitude",
            "phone", "company_email", "website", "google_maps_url", 
            "facebook_url", "twitter_url", "instagram_url", "linkedin_url", "youtube_url",
            "tiktok_url", "pinterest_url",
            "company_summary", "working_hours",
            "is_ideal_customer", "qualification_reasoning"
        ]
        parsed = self._parse_json(response_text, expected_keys)
        
        if not parsed or str(parsed.get("company_summary", "")).startswith("Error generating"):
            logger.error(f"Failed to consolidate data for CampaignResult {cr.id}")
            return False
            
        # Store full consolidated clean JSON
        cr.ai_clean_data = parsed
        cr.save(update_fields=['ai_clean_data'])
        return True

    def identify_decision_makers(self, employees: list) -> dict:
        """
        Takes a list of employee dictionaries (must contain 'id', 'first_name', 'last_name', 'title') 
        and uses the LLM to identify up to 2 high-priority decision makers.
        Returns a dict: {'decision_makers_ids': [id1, id2], 'linkedin_scrape_id': id1}
        """
        if not employees:
            return {"decision_makers_ids": [], "linkedin_scrape_id": None}
            
        system_prompt = (
            "You are an expert corporate hierarchy analyzer. Your job is to find the top decision-makers from a list of employees. "
            "You must strictly output ONLY valid JSON with exactly two keys:\n"
            "1. 'decision_makers_ids': a list of up to 2 IDs of the top decision makers.\n"
            "2. 'linkedin_scrape_id': the single ID of the most superior person from the chosen decision makers (e.g., prioritize CEO over CTO). This is the person whose profile is most important to scrape.\n"
            "Follow these rules:\n"
            "- First priority MUST be CEO and CTO. If they are found, select them.\n"
            "- If CEO and CTO are not present, then select the next two most superior people (e.g., Founders, Owners, Presidents, VP, Directors).\n"
            "- If all employees are low-level (e.g. real estate agents, associates, interns, admin), return an empty list [] and null.\n"
            "- Output ONLY valid JSON."
        )
        
        prompt = f"Here is the list of employees:\n{json.dumps(employees, indent=2)}\n\nIdentify the top decision makers (max 2) and the single most superior one."
        
        response_text = self._call_ai(prompt, system_prompt=system_prompt)
        parsed = self._parse_json(response_text, ["decision_makers_ids", "linkedin_scrape_id"])
        
        if not parsed or not isinstance(parsed.get("decision_makers_ids"), list):
            logger.error("Failed to parse decision makers from LLM.")
            return {"decision_makers_ids": [], "linkedin_scrape_id": None}
            
        return {
            "decision_makers_ids": parsed.get("decision_makers_ids", [])[:2],
            "linkedin_scrape_id": parsed.get("linkedin_scrape_id")
        }

    def _call_ai(self, prompt: str, system_prompt: str) -> str:
        """Tries Ollama first, falls back to Claude if Ollama fails."""
        try:
            return self._call_ollama(prompt, system_prompt)
        except Exception as e:
            logger.warning(f"Ollama generation failed: {e}. Falling back to Claude.")
            if self.anthropic_api_key:
                return self._call_claude(prompt, system_prompt)
            raise Exception("Ollama failed and Anthropic API key is not configured.")

    def _call_ollama(self, prompt: str, system_prompt: str) -> str:
        url = f"{self.ollama_base_url}/api/generate"
        payload = {
            "model": self.ollama_model,
            "system": system_prompt,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        
        headers = {}
        if self.ollama_api_key:
            headers["Authorization"] = f"Bearer {self.ollama_api_key}"
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    def _call_claude(self, prompt: str, system_prompt: str) -> str:
        client = anthropic.Anthropic(api_key=self.anthropic_api_key)
        
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1024,
            system=system_prompt,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return message.content[0].text

    def _parse_json(self, text: str, expected_keys: list) -> dict:
        try:
            # Basic cleanup in case model wraps json in markdown blocks
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            parsed = json.loads(text.strip())
            
            # Ensure keys exist
            for key in expected_keys:
                if key not in parsed:
                    parsed[key] = ""
                    
            return parsed
        except Exception as e:
            logger.error(f"Failed to parse JSON from AI response: {text}\nError: {e}")
            return {k: f"Error generating {k}" for k in expected_keys}

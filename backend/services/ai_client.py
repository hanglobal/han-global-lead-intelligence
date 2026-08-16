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

    def generate_insights(self, lead_data: dict) -> dict:
        from apps.crm.models import LeadQualificationSettings
        settings = LeadQualificationSettings.get_settings()
        rules = settings.insight_generation_rules
        
        system_prompt = (
            "You are an expert sales analyst for a B2B SaaS company.\n"
            "Return the response in strictly valid JSON format with the following keys:\n"
            '{\n  "pain_points": "detailed string",\n  "operational_gap": "detailed string",\n  "opportunity": "detailed string"\n}'
        )
        
        prompt = (
            f"--- INSTRUCTIONS ---\n{rules}\n\n"
            f"--- LEAD DATA ---\n{json.dumps(lead_data, indent=2)}"
        )
        
        response_text = self._call_ai(prompt, system_prompt=system_prompt)
        return self._parse_json(response_text, ["pain_points", "operational_gap", "opportunity"])

    def generate_email_draft(self, lead_data: dict, insights: dict) -> dict:
        from apps.crm.models import LeadQualificationSettings
        settings = LeadQualificationSettings.get_settings()
        rules = settings.email_generation_rules
        
        system_prompt = (
            "You are an expert SDR (Sales Development Representative).\n"
            "Return the response strictly in valid JSON format with the following keys:\n"
            '{\n  "subject": "Compelling subject line",\n  "body": "The email body, using proper line breaks"\n}'
        )
        
        prompt = (
            f"--- INSTRUCTIONS ---\n{rules}\n\n"
            f"--- LEAD DATA ---\n{json.dumps(lead_data, indent=2)}\n\n"
            f"--- LEAD INSIGHTS ---\n{json.dumps(insights, indent=2)}"
        )
        
        response_text = self._call_ai(prompt, system_prompt=system_prompt)
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
            "You are an expert data analyst and B2B lead qualification engine.\n"
            "You have been given two raw JSON datasets for a single company: one from Google Maps and one from their Website Scrape.\n"
            "Your job is to do two things:\n"
            "1. Extract and consolidate clean, structured data from both sources into a single JSON output for our CRM.\n"
            "2. Evaluate whether this company qualifies as an ideal customer based STRICTLY on the qualification criteria provided below.\n\n"
            "--- QUALIFICATION CRITERIA (provided by the user) ---\n"
            f"{agency_services}\n"
            "--- END CRITERIA ---\n\n"
            "CRITICAL ANALYSIS RULES (follow these relaxed guidelines):\n"
            "- Use your best judgment based on the provided data. You can make reasonable inferences about a business's operations based on their website and Google Maps presence.\n"
            "- Team Size: If explicit evidence of a team (like a team page) is missing, you MAY assume they have sufficient operational complexity if they have a healthy review count, active listings, or professional branding.\n"
            "- Pain Points: Do NOT demand explicit proof of CRM problems on their public website. Instead, intelligently evaluate their current tech stack (if visible in the data), their business size, and operational complexity. If they use basic tools or no visible CRM, they likely need help. If they use a known CRM, consider if they might need advanced workflow automation or AI solutions based on their scale. Make a reasoned, balanced judgment without requiring them to explicitly state their operational failures.\n"
            "- Industry: Industry classification should be broad. As long as their primary operations involve real estate (agency, property management, investing, etc.), consider them in the industry.\n"
            "- Give the benefit of the doubt: If the data strongly suggests they are an active real estate business, set is_ideal_customer to true even if some minor details (like exact team size or current tech stack) are unclear or missing.\n\n"
            "DATA EXTRACTION RULES:\n"
            "- Clean all URLs: Remove UTM parameters, query strings, and tracking fragments. Keep only the core clean URL.\n"
            "- Multiple values: Join multiple phone numbers, emails, or social URLs with a comma as a single string. Do NOT return arrays.\n"
            "- If a field is not present in either dataset, set it to null.\n\n"
            "Output JSON fields (use exactly these keys):\n"
            '1. "name": The cleanest version of the company name.\n'
            '2. "category": The business category as found in the data (e.g., Real estate agent, Property management company).\n'
            '3. "rating": The average Google Maps rating (float). Null if not found.\n'
            '4. "review_count": Total number of Google Maps reviews (integer). Null if not found.\n'
            '5. "price_level": Price level if available. Null otherwise.\n'
            '6. "address": The full address.\n'
            '7. "street_address": Just the street part of the address.\n'
            '8. "neighborhood": Neighborhood or district. Null if not found.\n'
            '9. "city": City.\n'
            '10. "postal_code": Zip or postal code. Null if not found.\n'
            '11. "latitude": Latitude (float). Null if not found.\n'
            '12. "longitude": Longitude (float). Null if not found.\n'
            '13. "phone": All valid phone numbers found in both sources, comma separated.\n'
            '14. "company_email": All valid business emails found in both sources, comma separated. Exclude personal or noreply emails if clearly identifiable.\n'
            '15. "website": The clean, canonical website URL.\n'
            '16. "google_maps_url": The clean Google Maps URL for this business.\n'
            '17. "facebook_url": Clean Facebook page URL(s), comma separated. Null if not found.\n'
            '18. "twitter_url": Clean Twitter/X page URL(s), comma separated. Null if not found.\n'
            '19. "instagram_url": Clean Instagram page URL(s), comma separated. Null if not found.\n'
            '20. "linkedin_url": Clean LinkedIn company page URL(s), comma separated. Null if not found.\n'
            '21. "youtube_url": Clean YouTube channel URL(s), comma separated. Null if not found.\n'
            '22. "tiktok_url": Clean TikTok URL(s), comma separated. Null if not found.\n'
            '23. "pinterest_url": Clean Pinterest URL(s), comma separated. Null if not found.\n'
            '24. "company_summary": A factual 2 to 3 sentence summary of what this company does, written entirely from what is visible in the provided website and Google Maps data. Do not add anything that is not in the data.\n'
            '25. "working_hours": A concise summary of business hours as found in the data (e.g., "Mon-Fri: 9am-5pm"). Null if not available.\n'
            '26. "is_ideal_customer": true only if the company clearly passes all qualification criteria based on the available data. false if they fail any criterion or if the available data is insufficient to confirm qualification.\n'
            '27. "qualification_reasoning": A detailed 5 to 7 line explanation of your qualification decision. You must: (a) state which criteria the company passes and which it fails, (b) cite specific data points from the provided datasets that support each claim, (c) explicitly note any information that was missing and how that affected your decision. Do not invent evidence. Be precise and fully grounded in the data.\n\n'
            f"Here is the raw data to analyze:\n{json.dumps(payload, indent=2)}\n\n"
            "Respond ONLY with strictly valid JSON matching the fields above. Do not include any text, commentary, or markdown outside the JSON object."
        )
        
        response_text = self._call_ai(prompt, system_prompt="You are a strict JSON data processor and lead qualification engine. You analyze only the data provided to you and return valid JSON only. You never assume or invent details not present in the input data.")
        
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
            "- First priority MUST be CEO, Founders, Owners, Presidents, or C-Suite. If they are found, select them.\n"
            "- If they are not present, then select the next most senior people (e.g., Directors, VPs, Managing Brokers).\n"
            "- If only Real Estate Agents, Realtors, or Associates are present, DO NOT return an empty list. Simply pick up to 2 of the most relevant agents/brokers.\n"
            "- Only return an empty list if literally no employees are provided.\n"
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

    def calculate_lead_score(self, lead_data: dict, scoring_rules: str) -> dict:
        """
        Takes lead data and dynamic scoring rules set by the user.
        Asks the LLM to calculate a score between 0 and 100 based on those rules.
        Returns a dict: {'score': 85}
        """
        system_prompt = (
            "You are an expert sales operations lead scoring engine. Your job is to calculate a lead score based strictly on the provided scoring rules.\n"
            "You must output ONLY valid JSON containing a single key 'score' with an integer value between 0 and 100.\n"
            "Calculate the score carefully based on the lead's data. If data is missing for a rule, do not add those points.\n"
            "Ensure the final score is capped at 100."
        )
        
        prompt = (
            f"--- LEAD DATA ---\n{json.dumps(lead_data, indent=2)}\n\n"
            f"--- SCORING RULES ---\n{scoring_rules}\n\n"
            "Based on the above rules, calculate the total score for this lead and return ONLY valid JSON in this format: {\"score\": 0}"
        )
        
        response_text = self._call_ai(prompt, system_prompt=system_prompt)
        parsed = self._parse_json(response_text, ["score"])
        
        if not parsed or not isinstance(parsed.get("score"), (int, float)):
            logger.error(f"Failed to parse score from LLM. Output: {parsed}")
            try:
                score = int(float(parsed.get("score", 0)))
            except:
                score = 0
            return {"score": min(score, 100)}
            
        return {"score": min(int(parsed.get("score", 0)), 100)}

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

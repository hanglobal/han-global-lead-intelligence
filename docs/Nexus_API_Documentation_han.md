# Nexus Data Solutions — RESTful Client API v1
### Official API Reference & Integration Guide for Han Global

**Base URL:** `https://app.nexusdatasolutions.online/api/v1`

---

## 🔐 Authentication Headers

Every request to the Nexus Data Solutions API requires these HTTP headers:

| Header | Value | Description |
| :--- | :--- | :--- |
| `Client-ID` | `aab2af5b-917a-4547-bbec-913f81bcfa13` | Your unique Client UUID |
| `Client-Secret` | `********************************` | Your secure 64-character secret key |
| `Content-Type` | `application/json` | Required for POST requests |

---

## 📊 Account & Subscribed Services Overview
- **Business Name:** Han Global
- **Prepaid Balance:** $44.78 USD
- **Campaign ID Format:** `cam_han_<sequential_number>` (e.g., `cam_han_1`)

### Active Subscriptions & Unit Rates:
- **Nexus B2B Data** (`B2B`): $15.00 USD per 1,000 units
- **Nexus LinkedIn People Profile** (`LINKEDIN`): $6.00 USD per 1,000 units
- **Nexus LinkedIn People Post** (`LINKEDIN_POST`): $3.00 USD per 1,000 units

---

## 🔄 Standard 3-Step Integration Workflow

1. **Trigger Campaign:** `POST /api/v1/campaigns/run/` → Pass `campaign_type` for your subscribed service. Returns `campaign_id` (e.g. `cam_han_1`) and status `"RUNNING"`.
2. **Poll Status:** `GET /api/v1/campaigns/cam_han_1/` → Poll every 10–15s until status is `"COMPLETED"`.
3. **Ingest Leads / Data:** `GET /api/v1/campaigns/cam_han_1/leads/` → Download complete enriched JSON records into your database.

---

## 📡 Endpoints Reference

---

### 1. Check Account Balance & Service Rates

- **Method:** `GET`
- **Path:** `/api/v1/balance/`
- **Headers:**
  - `Client-ID: aab2af5b-917a-4547-bbec-913f81bcfa13`
  - `Client-Secret: ********************************`
- **Request Body:** None

#### Response (`200 OK`):
```json
{
  "client_name": "Adedolapo Wilson",
  "business_name": "Han Global",
  "prepaid_balance": 44.78,
  "pricing_per_1000_leads": 15.00,
  "currency": "USD",
  "api_status": "ACTIVE",
  "subscribed_services": [
  {
    "code": "B2B",
    "name": "Nexus B2B Data",
    "pricing_per_1000": 15
  },
  {
    "code": "LINKEDIN",
    "name": "Nexus LinkedIn People Profile",
    "pricing_per_1000": 6
  },
  {
    "code": "LINKEDIN_POST",
    "name": "Nexus LinkedIn People Post",
    "pricing_per_1000": 3
  }
]
}
```

---

### 2. Get Available Filter Choices (B2B Only)

- **Method:** `GET`
- **Path:** `/api/v1/filters/`
- **Headers:**
  - `Client-ID: aab2af5b-917a-4547-bbec-913f81bcfa13`
  - `Client-Secret: ********************************`
- **Request Body:** None

#### Response (`200 OK`):
```json
{
  "company_industry": ["Computer Software", "Financial Services", "Hospital & Health Care"],
  "seniority_level": ["c_suite", "vp", "director", "manager", "senior"],
  "company_size": ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"],
  "email_status": ["validated", "unvalidated"]
}
```

---

### 3. Launch Extraction Campaign

- **Method:** `POST`
- **Path:** `/api/v1/campaigns/run/`
- **Headers:**
  - `Client-ID: aab2af5b-917a-4547-bbec-913f81bcfa13`
  - `Client-Secret: ********************************`
  - `Content-Type: application/json`

#### 3.1. Nexus B2B Data (`campaign_type: "B2B"`)
- **Service Rate:** $15.00 per 1,000 leads
- **Payload Parameters:** `fetch_count` (Required), `campaign_type` ("B2B"), `contact_job_title`, `contact_location`, `company_industry`, `company_domain`, `seniority_level`, `size`, `email_status`, etc.

**Sample Request:**
```json
{
  "campaign_type": "B2B",
  "file_name": "Han Global Tech Campaign",
  "fetch_count": 500,
  "contact_job_title": [
    "VP Engineering",
    "CTO",
    "Head of Product"
  ],
  "contact_location": [
    "United States"
  ],
  "company_industry": [
    "Computer Software",
    "Financial Services"
  ],
  "company_keywords": [
    "Fintech",
    "SaaS"
  ],
  "seniority_level": [
    "c_suite",
    "vp"
  ],
  "size": [
    "51-200",
    "201-500"
  ],
  "email_status": [
    "validated"
  ]
}
```

#### 3.2. Nexus LinkedIn People Profile (`campaign_type: "LINKEDIN"`)
- **Service Rate:** $6.00 per 1,000 profiles
- **Payload Parameters:** `campaign_type` ("LINKEDIN", Required), `fetch_count` (Required), `linkedin_urls` (Array[String] of profile URLs, Required), `file_name` (Optional).

**Sample Request:**
```json
{
  "campaign_type": "LINKEDIN",
  "file_name": "Han Global Executive Profiles",
  "fetch_count": 2,
  "linkedin_urls": [
    "https://www.linkedin.com/in/williamhgates",
    "https://www.linkedin.com/in/satyanadella"
  ]
}
```

#### 3.3. Nexus LinkedIn People Post (`campaign_type: "LINKEDIN_POST"`)
- **Service Rate:** $3.00 per 1,000 posts
- **Payload Parameters:** `campaign_type` ("LINKEDIN_POST", Required), `fetch_count` (Max posts per profile, Required), `linkedin_urls` (Array[String] of profile URLs, Required), `file_name` (Optional).

**Sample Request:**
```json
{
  "campaign_type": "LINKEDIN_POST",
  "file_name": "Han Global Profile Posts",
  "fetch_count": 5,
  "linkedin_urls": [
    "https://www.linkedin.com/in/williamhgates"
  ]
}
```

#### Success Response (`202 Accepted`):
```json
{
  "message": "Campaign triggered successfully.",
  "campaign_id": "cam_han_1",
  "uuid": "df3ab4cd-b664-4337-8f0f-bf0e6d11c749",
  "campaign_type": "B2B",
  "file_name": "Han Global Campaign",
  "status": "RUNNING",
  "fetch_count": 500,
  "created_at": "2026-10-07T19:05:52.310Z"
}
```

#### Subscription Required Response (`403 Forbidden`):
```json
{
  "error": "Subscription Required: Your account is not subscribed to this service. Please contact your account manager to activate this service."
}
```

#### Insufficient Balance Response (`402 Payment Required`):
```json
{
  "error": "Insufficient balance. Required: $7.50, Available: $2.00"
}
```

---

---

### List Campaigns
- **Method:** `GET`
- **Path:** `/api/v1/campaigns/`
- **Rate Limit:** 60 requests / minute

### Retry or Re-run Campaign
- **Method:** `POST`
- **Path:** `/api/v1/campaigns/${sampleCamId}/retry/`
- **Rate Limit:** 5 requests / minute

### 4. Check Campaign Status & Progress

- **Method:** `GET`
- **Path:** `/api/v1/campaigns/cam_han_1/` *(or UUID)*
- **Headers:**
  - `Client-ID: aab2af5b-917a-4547-bbec-913f81bcfa13`
  - `Client-Secret: ********************************`

#### Response (`200 OK`):
```json
{
  "campaign_id": "cam_han_1",
  "uuid": "df3ab4cd-b664-4337-8f0f-bf0e6d11c749",
  "campaign_type": "B2B",
  "file_name": "Han Global Campaign",
  "status": "COMPLETED",
  "fetch_count": 500,
  "total_leads_delivered": 500,
  "billed_amount": 15.00,
  "error_message": null,
  "created_at": "2026-10-07T19:05:52.310Z",
  "updated_at": "2026-10-07T19:05:52.310Z"
}
```

---

### 5. Retrieve Extracted Records / Posts

- **Method:** `GET`
- **Path:** `/api/v1/campaigns/{campaign_id}/leads/`
- **Headers:**
  - `Client-ID: aab2af5b-917a-4547-bbec-913f81bcfa13`
  - `Client-Secret: ********************************`

> [!NOTE]
> **Response Key Convention by Service Type**:
> - **B2B & LINKEDIN (Profile)**: Delivered records are returned under the key `"leads": [ ... ]`.
> - **LINKEDIN_POST (Posts)**: Scraped posts are returned under the key `"posts": [ ... ]`.
> *Note:* Our client implementation (`NexusClient.get_campaign_leads`) automatically guarantees that both `leads` and `posts` keys are populated and automatically deduplicated.

#### A. Response for B2B & LINKEDIN Profile Campaigns (`200 OK`):
```json
{
  "campaign_id": "cam_han_1",
  "campaign_type": "B2B",
  "status": "COMPLETED",
  "total_count": 5,
  "leads": [
    {
      "company_name": "Acme Capital",
      "company_website": "https://acmecapital.com",
      "contact_name": "Jane Doe",
      "contact_email": "jane@acmecapital.com",
      "contact_job_title": "Partner",
      "contact_linkedin": "https://www.linkedin.com/in/janedoe"
    }
  ]
}
```

#### B. Response for LINKEDIN_POST Campaigns (`200 OK`):
```json
{
  "campaign_id": "cam_han_140",
  "campaign_type": "LINKEDIN_POST",
  "status": "COMPLETED",
  "total_count": 6,
  "limit": 1000,
  "offset": 0,
  "has_more": false,
  "posts": [
    {
      "id": "7511912345602822144",
      "post_id": "7511912345602822144",
      "linkedin_url": "https://www.linkedin.com/posts/activity-7511912345602822144",
      "content": "Just closed in Hillcrest — 3792 10th Ave for $1,817,000. This 4-unit property...",
      "author_name": "Christina Labowicz",
      "author_headline": "Apartment Consultant",
      "author_linkedin_url": "https://www.linkedin.com/in/christina-labowicz",
      "author_avatar_url": "https://media.licdn.com/dms/image/...",
      "author_username": "christina-labowicz",
      "posted_at": "2026-10-02T22:17:47.774Z",
      "posted_ago_text": "1 week ago • Visible to anyone on or off LinkedIn",
      "likes": 12,
      "comments": 4,
      "shares": 1,
      "reactions_breakdown": [{"type": "LIKE", "count": 10}, {"type": "EMPATHY", "count": 2}],
      "post_type": "post",
      "media_urls": [],
      "post_images": []
    }
  ]
}
```

---

### Rate Limits & Throttling
- `/api/v1/campaigns/run/` & `/retry/` : 5 req / min
- `/api/v1/campaigns/{id}/leads/` : Relaxed by Nexus Support for automated batch extraction pipelines (no 429 throttling)
- `/api/v1/campaigns/` (List) : 60 req / min
- `/api/v1/campaigns/{id}/` (Status) : 120 req / min
- `/api/v1/balance/` & filters : 30 req / min

## 💻 Full Code Examples

### Python Integration Script

```python
import time
import requests

BASE_URL = "https://app.nexusdatasolutions.online/api/v1"
HEADERS = {
    "Client-ID": "aab2af5b-917a-4547-bbec-913f81bcfa13",
    "Client-Secret": "********************************",
    "Content-Type": "application/json"
}

def execute_pipeline():
    # 1. Trigger Campaign for Subscribed Service
    payload = {
    "campaign_type": "B2B",
    "file_name": "Han Global Tech Campaign",
    "fetch_count": 500,
    "contact_job_title": [
        "VP Engineering",
        "CTO",
        "Head of Product"
    ],
    "contact_location": [
        "United States"
    ],
    "company_industry": [
        "Computer Software",
        "Financial Services"
    ],
    "company_keywords": [
        "Fintech",
        "SaaS"
    ],
    "seniority_level": [
        "c_suite",
        "vp"
    ],
    "size": [
        "51-200",
        "201-500"
    ],
    "email_status": [
        "validated"
    ]
}
    
    run_res = requests.post(f"{BASE_URL}/campaigns/run/", json=payload, headers=HEADERS)
    if run_res.status_code != 202:
        print(f"Error starting campaign: {run_res.text}")
        return
        
    campaign_id = run_res.json()["campaign_id"]
    print(f"🚀 Campaign Launched: {campaign_id}")

    # 2. Poll Status
    while True:
        status_res = requests.get(f"{BASE_URL}/campaigns/{campaign_id}/", headers=HEADERS)
        data = status_res.json()
        print(f"Status: {data['status']}")

        if data["status"] == "COMPLETED":
            print(f"✅ Finished! Delivered {data['total_leads_delivered']} records. Billed: USD {data['billed_amount']}")
            break
        elif data["status"] == "FAILED":
            print(f"❌ Failed: {data.get('error_message')}")
            return
            
        time.sleep(15)

    # 3. Retrieve Data
    leads_res = requests.get(f"{BASE_URL}/campaigns/{campaign_id}/leads/", headers=HEADERS)
    records = leads_res.json()["leads"]
    print(f"📦 Successfully downloaded {len(records)} records.")

if __name__ == "__main__":
    execute_pipeline()
```

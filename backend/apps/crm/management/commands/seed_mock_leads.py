from django.core.management.base import BaseCommand
from apps.crm.models import Lead
import random


class Command(BaseCommand):
    help = 'Seed the database with 100 mock leads for testing'

    def handle(self, *args, **options):
        business_names = [
            'Sunset Realty', 'Coastal Properties', 'Metro Homes', 'Premier Estates',
            'Urban Living', 'Dream Homes', 'Elite Properties', 'Golden Gate Realty',
            'Pacific Investments', 'Horizon Real Estate', 'Summit Properties',
            'Valley Homes', 'Bay Area Realty', 'Lakeside Properties',
            'Mountain View Estates', 'Oceanfront Realty', 'Downtown Properties',
            'Riverside Homes', 'Parkside Realty', 'Greenwood Estates',
            'Highland Properties', 'Willow Creek Homes', 'Maple Leaf Realty',
            'Cedar Ridge Properties', 'Pine Valley Estates', 'Oakwood Homes',
            'Birchwood Realty', 'Redwood Properties', 'Spruce Meadows',
            'Aspen Estates', 'Cypress Homes', 'Magnolia Realty',
            'Jasmine Properties', 'Rosewood Estates', 'Lavender Homes',
            'Orchid Realty', 'Tulip Properties', 'Daisy Meadows',
            'Iris Estates', 'Poppy Homes', 'Violet Realty',
            'Azure Properties', 'Crimson Estates', 'Emerald Homes',
            'Golden Realty', 'Silver Properties', 'Bronze Estates',
            'Platinum Homes', 'Diamond Realty', 'Sapphire Properties',
            'Ruby Estates', 'Opal Homes', 'Topaz Realty',
            'Amber Properties', 'Jade Estates', 'Pearl Homes',
            'Coral Realty', 'Ivory Properties', 'Onyx Estates',
            'Quartz Homes', 'Granite Realty', 'Marble Properties',
            'Slate Estates', 'Stone Homes', 'Brick Realty',
            'Steel Properties', 'Iron Estates', 'Copper Homes',
            'Tin Realty', 'Lead Properties', 'Zinc Estates',
            'Chrome Homes', 'Titanium Realty', 'Aluminum Properties',
            'Carbon Estates', 'Neon Homes', 'Argon Realty',
            'Helium Properties', 'Oxygen Estates', 'Nitrogen Homes',
            'Hydrogen Realty', 'Fluorine Properties', 'Chlorine Estates',
            'Bromine Homes', 'Iodine Realty', 'Astatine Properties',
            'Radon Estates', 'Xenon Homes', 'Krypton Realty',
            'Neon Properties', 'Argon Estates', 'Helium Homes',
            'Oxygen Realty', 'Nitrogen Properties', 'Carbon Estates',
            'Silicon Homes', 'Germanium Realty', 'Arsenic Properties',
            'Selenium Estates', 'Bromine Homes', 'Krypton Realty'
        ]

        categories = [
            'Real Estate', 'Property Management', 'Commercial', 'Residential',
            'Luxury Homes', 'Investment Properties', 'Rental Agency'
        ]

        statuses = ['new', 'contacted', 'qualified', 'converted', 'lost']
        status_weights = [30, 25, 20, 15, 10]

        phones = [
            '(555) 123-4567', '(555) 234-5678', '(555) 345-6789',
            '(555) 456-7890', '(555) 567-8901', '(555) 678-9012',
            '(555) 789-0123', '(555) 890-1234', '(555) 901-2345',
            '(555) 012-3456'
        ]

        emails = [
            'info@', 'contact@', 'sales@', 'hello@', 'support@',
            'admin@', 'team@', 'office@', 'manager@', 'director@'
        ]

        domains = [
            'realty.com', 'properties.com', 'homes.com', 'estates.com',
            'realty.net', 'properties.net', 'homes.net', 'estates.net',
            'realty.org', 'properties.org', 'homes.org', 'estates.org'
        ]

        created_count = 0
        existing_count = Lead.objects.count()

        for i in range(100):
            name = business_names[i]
            place_id = f'mock_place_{existing_count + i + 1}'

            if Lead.objects.filter(place_id=place_id).exists():
                continue

            category = random.choice(categories)
            rating = round(random.uniform(3.5, 5.0), 1)
            review_count = random.randint(10, 500)
            status = random.choices(statuses, weights=status_weights)[0]
            phone = random.choice(phones)
            email_prefix = random.choice(emails)
            domain = random.choice(domains)
            email = f'{email_prefix}{name.lower().replace(" ", "")}@{domain}'

            social_prefix = name.lower().replace(' ', '').replace("'", '')
            Lead.objects.create(
                place_id=place_id,
                name=name,
                address=f'{random.randint(100, 9999)} {random.choice(["Main St", "Oak Ave", "Park Rd", "Beach Blvd", "Hill Dr"])}, {random.choice(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"])}, {random.choice(["CA", "NY", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI"])} {random.randint(10000, 99999)}',
                phone=phone,
                email=email,
                rating=rating,
                review_count=review_count,
                category=category,
                status=status,
                latitude=random.uniform(25.0, 49.0),
                longitude=random.uniform(-125.0, -70.0),
                website=f'https://www.{social_prefix}.com',
                facebook_url=f'https://www.facebook.com/{social_prefix}',
                instagram_url=f'https://www.instagram.com/{social_prefix}',
                linkedin_url=f'https://www.linkedin.com/company/{social_prefix}',
                social_links={
                    'facebook': [f'https://www.facebook.com/{social_prefix}'],
                    'instagram': [f'https://www.instagram.com/{social_prefix}'],
                    'linkedin': [f'https://www.linkedin.com/company/{social_prefix}'],
                },
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} mock leads')
        )

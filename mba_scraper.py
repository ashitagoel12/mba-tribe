"""
MBA School Data Scraper - Hybrid Approach
Attempts to scrape all 50 schools, flags which ones need manual research
"""

import json
import requests
from bs4 import BeautifulSoup
import time
from datetime import datetime
from typing import Dict, List, Optional
import re
import sys

# Fix Windows cp1252 encoding errors for non-ASCII characters
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

class MBASchoolScraper:
    def __init__(self, schools_file='schools_list.json'):
        """Initialize scraper with list of schools"""
        with open(schools_file, 'r') as f:
            data = json.load(f)
            self.schools = data['schools']
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        self.results = {
            'successful': [],
            'failed': [],
            'manual_review_needed': [],
            'metadata': {
                'scrape_date': datetime.now().isoformat(),
                'total_schools': len(self.schools),
                'success_count': 0,
                'fail_count': 0,
                'manual_count': 0
            }
        }
    
    def check_if_blocked(self, response) -> bool:
        """Check if response indicates anti-bot protection"""
        if response.status_code == 403:
            return True
        
        content = response.text.lower()
        blocked_indicators = [
            'cloudflare',
            'access denied',
            'captcha',
            'please verify',
            'robot',
            'automated access',
            'blocked',
            'security check'
        ]
        
        return any(indicator in content for indicator in blocked_indicators)
    
    def extract_number(self, text: str) -> Optional[float]:
        """Extract numeric value from text"""
        if not text:
            return None
        # Remove commas and $ signs
        cleaned = text.replace(',', '').replace('$', '').strip()
        # Try to find number
        match = re.search(r'(\d+\.?\d*)', cleaned)
        return float(match.group(1)) if match else None
    
    def scrape_school(self, school: Dict) -> Dict:
        """Attempt to scrape data for a single school"""
        school_id = school['id']
        school_name = school['name']
        
        print(f"\n{'='*60}")
        print(f"Scraping: {school_name}")
        print(f"{'='*60}")
        
        result = {
            'id': school_id,
            'name': school_name,
            'status': 'unknown',
            'data': {},
            'urls_attempted': []
        }
        
        try:
            # Try to fetch class profile page
            profile_url = school.get('class_profile_url', school.get('mba_url'))
            print(f"Attempting: {profile_url}")
            result['urls_attempted'].append(profile_url)
            
            response = requests.get(profile_url, headers=self.headers, timeout=10)
            
            # Check if blocked
            if self.check_if_blocked(response):
                print(f"[BLOCKED] Anti-bot protection detected")
                result['status'] = 'manual_review_needed'
                result['error'] = 'Anti-bot protection (Cloudflare/CAPTCHA)'
                return result
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract basic data (this is simplified - real scraping would be more complex)
                result['data'] = self.extract_basic_info(soup, school)
                
                # Try employment URL too
                if 'employment_url' in school:
                    time.sleep(1)  # Be polite
                    emp_url = school['employment_url']
                    print(f"Fetching employment data: {emp_url}")
                    result['urls_attempted'].append(emp_url)
                    
                    emp_response = requests.get(emp_url, headers=self.headers, timeout=10)
                    if not self.check_if_blocked(emp_response) and emp_response.status_code == 200:
                        emp_soup = BeautifulSoup(emp_response.text, 'html.parser')
                        emp_data = self.extract_employment_info(emp_soup)
                        result['data']['employment'] = emp_data
                
                result['status'] = 'success'
                print(f"[OK] Data extracted")
                
            else:
                print(f"[FAILED] HTTP {response.status_code}")
                result['status'] = 'failed'
                result['error'] = f'HTTP {response.status_code}'
                
        except requests.exceptions.Timeout:
            print(f"[TIMEOUT]")
            result['status'] = 'failed'
            result['error'] = 'Request timeout'
            
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            result['status'] = 'failed'
            result['error'] = str(e)
        
        return result
    
    def extract_basic_info(self, soup: BeautifulSoup, school: Dict) -> Dict:
        """Extract basic school information from HTML"""
        # This is a simplified version - real implementation would need
        # school-specific selectors based on each school's HTML structure
        
        data = {
            'location': {
                'city': None,
                'state': None
            },
            'class_profile': {},
            'academics': {},
            'extraction_method': 'automated_scraping'
        }
        
        # Try to extract text and look for common patterns
        text = soup.get_text()
        
        # Look for class size
        class_size_match = re.search(r'class size[:\s]+(\d+)', text, re.IGNORECASE)
        if class_size_match:
            data['class_profile']['class_size'] = int(class_size_match.group(1))
        
        # Look for GMAT
        gmat_match = re.search(r'gmat[:\s]+(\d+)', text, re.IGNORECASE)
        if gmat_match:
            data['academics']['gmat_average'] = int(gmat_match.group(1))
        
        # Look for GPA
        gpa_match = re.search(r'gpa[:\s]+([\d\.]+)', text, re.IGNORECASE)
        if gpa_match:
            data['academics']['gpa_average'] = float(gpa_match.group(1))
        
        # Look for international percentage
        intl_match = re.search(r'international[:\s]+(\d+)%', text, re.IGNORECASE)
        if intl_match:
            data['class_profile']['international_percentage'] = int(intl_match.group(1))
        
        return data
    
    def extract_employment_info(self, soup: BeautifulSoup) -> Dict:
        """Extract employment data from HTML"""
        data = {}
        text = soup.get_text()
        
        # Look for salary
        salary_match = re.search(r'median.*?salary[:\s]+\$?([\d,]+)', text, re.IGNORECASE)
        if salary_match:
            data['median_base_salary_usd'] = self.extract_number(salary_match.group(1))
        
        # Look for employment rate
        emp_rate_match = re.search(r'employment.*?(\d+)%', text, re.IGNORECASE)
        if emp_rate_match:
            data['employment_rate_3_months'] = int(emp_rate_match.group(1))
        
        return data
    
    def scrape_all(self, delay=2):
        """Scrape all schools with delay between requests"""
        print(f"\nStarting scrape of {len(self.schools)} schools...")
        print(f"Using {delay}s delay between requests\n")
        
        for i, school in enumerate(self.schools, 1):
            print(f"\n[{i}/{len(self.schools)}]", end=" ")
            
            result = self.scrape_school(school)
            
            # Categorize result
            if result['status'] == 'success':
                self.results['successful'].append(result)
                self.results['metadata']['success_count'] += 1
            elif result['status'] == 'manual_review_needed':
                self.results['manual_review_needed'].append(result)
                self.results['metadata']['manual_count'] += 1
            else:
                self.results['failed'].append(result)
                self.results['metadata']['fail_count'] += 1
            
            # Delay between requests (be polite)
            if i < len(self.schools):
                time.sleep(delay)
        
        return self.results
    
    def save_results(self, filename='scraping_results.json'):
        """Save scraping results to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\nResults saved to {filename}")
    
    def print_summary(self):
        """Print summary of scraping results"""
        meta = self.results['metadata']
        
        print("\n" + "="*60)
        print("SCRAPING SUMMARY")
        print("="*60)
        print(f"Total schools:        {meta['total_schools']}")
        print(f"[OK] Successful:      {meta['success_count']}")
        print(f"[!]  Manual needed:   {meta['manual_count']}")
        print(f"[X]  Failed:          {meta['fail_count']}")
        print("="*60)
        
        if self.results['manual_review_needed']:
            print("\n[!] SCHOOLS NEEDING MANUAL RESEARCH:")
            for school in self.results['manual_review_needed']:
                print(f"   • {school['name']}")
                print(f"     Reason: {school.get('error', 'Unknown')}")
        
        if self.results['successful']:
            print(f"\n[OK] SUCCESSFULLY SCRAPED ({len(self.results['successful'])} schools):")
            for school in self.results['successful']:
                print(f"   • {school['name']}")


def main():
    """Main execution function"""
    print("\n" + "="*60)
    print("MBA SCHOOL DATA SCRAPER - HYBRID APPROACH")
    print("="*60)
    
    # Initialize scraper
    scraper = MBASchoolScraper('schools_list.json')
    
    # Run scraping
    results = scraper.scrape_all(delay=2)
    
    # Print summary
    scraper.print_summary()
    
    # Save results
    scraper.save_results('scraping_results.json')
    
    # Also save successful data in clean format
    if scraper.results['successful']:
        clean_data = {
            'metadata': {
                'last_updated': datetime.now().isoformat(),
                'source': 'automated_scraping',
                'schools_count': len(scraper.results['successful'])
            },
            'schools': [
                {
                    'id': school['id'],
                    'name': school['name'],
                    **school['data']
                }
                for school in scraper.results['successful']
            ]
        }
        
        with open('mba_schools_scraped_data.json', 'w') as f:
            json.dump(clean_data, f, indent=2)
        
        print(f"\nClean data saved to mba_schools_scraped_data.json")
    
    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("1. Review 'scraping_results.json' for detailed results")
    print("2. For schools marked 'manual_review_needed', request manual research")
    print("3. Merge automated + manual data into final dataset")
    print("="*60 + "\n")
    
    return scraper.results


if __name__ == "__main__":
    main()

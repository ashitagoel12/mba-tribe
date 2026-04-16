"""
MBA Schools Data Collection Scraper  (Enhanced v2)
====================================================
Multi-strategy scraper with:
  - Multiple URL attempts per school (auto-generated variants + known overrides)
  - PDF detection and text extraction (pdfplumber)
  - Per-field source attribution (sizeSource, avgGMATSource, …)
  - dataMetadata block per school (freshness, sources used, notes)
  - Global data-quality summary in output metadata

Usage:
    python scraper.py                                          # all 50 schools
    python scraper.py --batch 1                               # schools 1-10
    python scraper.py --ids harvard-hbs stanford-gsb          # specific schools
    python scraper.py --dry-run                               # list targets only

Python path note (Windows without PATH configured):
    "C:\\Users\\...\\Python314\\python.exe" scraper.py
"""

# ---------------------------------------------------------------------------
# Stdlib
# ---------------------------------------------------------------------------
import argparse
import io
import json
import logging
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Third-party
# ---------------------------------------------------------------------------
import requests
from bs4 import BeautifulSoup

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("WARNING: pdfplumber not found - PDF parsing disabled. "
          "Fix: pip install pdfplumber")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = Path(__file__).parent / "raw-data"
LOG_DIR = Path(__file__).parent / "logs"
for _d in (DATA_DIR, RAW_DIR, LOG_DIR):
    _d.mkdir(exist_ok=True)

OUTPUT_FILE = DATA_DIR / "mba_schools_data.json"
REPORT_FILE = LOG_DIR / "collection_report.txt"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
_log_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
_log_file = LOG_DIR / f"run_{_log_ts}.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(_log_file, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
TIMEOUT = 12
RATE_LIMIT = 1.5        # seconds between each outgoing request
MAX_URLS_TO_TRY = 6     # per page type (profile / employment)
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
NOW_ISO = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# Paths appended to the base program URL when generating URL candidates
_PROFILE_SUFFIXES = [
    "/admissions/class-profile",
    "/admissions/class-profile/",
    "/admission/class-profile",
    "/admissions/class-statistics",
    "/admissions/class-statistics/",
    "/admissions/",
    "/class-profile",
    "/class-profile/",
    "/students",
    "/students/",
    "/about/class-profile",
    "/about/class-profile/",
]
_EMPLOYMENT_SUFFIXES = [
    "/career-services/employment-data",
    "/career-services/employment-data/",
    "/career/employment-statistics",
    "/career/employment-statistics/",
    "/career/employment-report",
    "/career-management/employment-statistics",
    "/career-management/employment-statistics/",
    "/career-development/employment-statistics",
    "/careers/employment-statistics",
    "/career-outcomes",
    "/career-outcomes/",
    "/career",
    "/career/",
]

# ---------------------------------------------------------------------------
# Per-school URL overrides (profile / employment)
# Add corrected URLs here when auto-generated ones consistently 404.
# ---------------------------------------------------------------------------
URL_OVERRIDES: dict[str, dict[str, list[str]]] = {
    "harvard-hbs": {
        "profile": [
            "https://www.hbs.edu/mba/admissions/Pages/default.aspx",
            "https://www.hbs.edu/mba/admissions/",
        ],
        "employment": [
            "https://www.hbs.edu/recruiting/data/Pages/default.aspx",
            "https://www.hbs.edu/mba/career-development/employment-statistics/",
            "https://www.hbs.edu/recruiting/",
        ],
    },
    "stanford-gsb": {
        "profile": [
            "https://www.gsb.stanford.edu/programs/mba/admission/class-profile",
            "https://www.gsb.stanford.edu/programs/mba/admission",
        ],
        "employment": [
            "https://www.gsb.stanford.edu/programs/mba/career-services/employment-data",
            "https://www.gsb.stanford.edu/programs/mba/career-services",
        ],
    },
    "wharton-upenn": {
        "profile": [
            "https://mba.wharton.upenn.edu/class-profile/",
            "https://mba.wharton.upenn.edu/admissions/",
        ],
        "employment": [
            "https://mba.wharton.upenn.edu/employment-statistics/",
            "https://mba.wharton.upenn.edu/career-management/",
        ],
    },
    "booth-uchicago": {
        "profile": [
            "https://www.chicagobooth.edu/programs/mba/admissions/class-profile",
            "https://www.chicagobooth.edu/programs/mba/admissions",
            "https://www.chicagobooth.edu/programs/full-time-mba/admissions/class-profile",
        ],
        "employment": [
            "https://www.chicagobooth.edu/programs/mba/career-services/employment-statistics",
            "https://www.chicagobooth.edu/programs/mba/career-services",
            "https://www.chicagobooth.edu/programs/full-time-mba/career/employment-statistics",
        ],
    },
    "kellogg-northwestern": {
        "profile": [
            "https://www.kellogg.northwestern.edu/programs/full-time-mba/admissions/class-profile.aspx",
            "https://www.kellogg.northwestern.edu/programs/full-time-mba/admissions.aspx",
            "https://www.kellogg.northwestern.edu/programs/full-time-mba.aspx",
        ],
        "employment": [
            "https://www.kellogg.northwestern.edu/programs/full-time-mba/careers/employment-statistics.aspx",
            "https://www.kellogg.northwestern.edu/programs/full-time-mba/careers.aspx",
        ],
    },
    "sloan-mit": {
        "profile": [
            "https://mitsloan.mit.edu/mba/admissions/class-profile",
            "https://mitsloan.mit.edu/mba/admissions",
        ],
        "employment": [
            "https://mitsloan.mit.edu/career-development-office/mba-employment-data",
            "https://mitsloan.mit.edu/career-development-office",
        ],
    },
    "columbia-cbs": {
        "profile": [
            "https://home.gsb.columbia.edu/programs/mba/admissions/class-profile",
            "https://home.gsb.columbia.edu/programs/mba/admissions",
            "https://business.columbia.edu/programs/mba/admissions/class-profile",
        ],
        "employment": [
            "https://home.gsb.columbia.edu/programs/mba/career-management/employment-statistics",
            "https://home.gsb.columbia.edu/programs/mba/career-management",
        ],
    },
    "tuck-dartmouth": {
        "profile": [
            "https://www.tuck.dartmouth.edu/mba/admissions/class-profile",
            "https://www.tuck.dartmouth.edu/mba/admissions",
        ],
        "employment": [
            "https://www.tuck.dartmouth.edu/mba/career-development/employment-statistics",
            "https://www.tuck.dartmouth.edu/mba/career-development",
        ],
    },
    "yale-som": {
        "profile": [
            "https://som.yale.edu/programs/mba/admissions/class-profile",
            "https://som.yale.edu/programs/mba/admissions",
        ],
        "employment": [
            "https://som.yale.edu/programs/mba/career-services/employment-data",
            "https://som.yale.edu/programs/mba/career-services",
        ],
    },
    "haas-berkeley": {
        "profile": [
            "https://haas.berkeley.edu/mba/admissions/class-profile/",
            "https://haas.berkeley.edu/mba/admissions/",
        ],
        "employment": [
            "https://haas.berkeley.edu/mba/career-services/employment-data/",
            "https://haas.berkeley.edu/mba/career-services/",
        ],
    },
}

# ---------------------------------------------------------------------------
# Seed dataset  (baseline – live scraping overwrites individual fields)
# ---------------------------------------------------------------------------
SEED: dict[str, dict] = {
    "harvard-hbs": {
        "name": "Harvard Business School", "university": "Harvard University", "tier": "M7",
        "location": {"city": "Boston", "state": "MA"},
        "classProfile": {"size": 938, "avgWorkExperience": 4.7, "avgGMAT": 730, "avgGRE": 163, "internationalStudentPct": 37},
        "costs": {"annualTuition": 73440, "totalProgramCost": 223000},
        "employment": {"top3Industries": ["Consulting", "Finance / PE / VC", "Technology"], "top5Companies": ["McKinsey", "BCG", "Bain", "Amazon", "Goldman Sachs"], "employmentRate3Months": 95, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["General Management", "Entrepreneurship", "Strategy", "Leadership"],
        "culture": ["Case Method", "Collaborative", "Leadership Development", "Section Community"],
        "programUrl": "https://www.hbs.edu/mba/",
    },
    "stanford-gsb": {
        "name": "Stanford Graduate School of Business", "university": "Stanford University", "tier": "M7",
        "location": {"city": "Stanford", "state": "CA"},
        "classProfile": {"size": 436, "avgWorkExperience": 5.0, "avgGMAT": 738, "avgGRE": 165, "internationalStudentPct": 44},
        "costs": {"annualTuition": 76950, "totalProgramCost": 228000},
        "employment": {"top3Industries": ["Technology", "Entrepreneurship / Venture Capital", "Finance / PE"], "top5Companies": ["McKinsey", "Google", "Apple", "BCG", "Bain"], "employmentRate3Months": 94, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["Entrepreneurship", "Social Innovation", "Technology", "Leadership"],
        "culture": ["Change Maker", "Collaborative", "Small Community", "Think Differently"],
        "programUrl": "https://www.gsb.stanford.edu/programs/mba",
    },
    "wharton-upenn": {
        "name": "Wharton School", "university": "University of Pennsylvania", "tier": "M7",
        "location": {"city": "Philadelphia", "state": "PA"},
        "classProfile": {"size": 847, "avgWorkExperience": 5.0, "avgGMAT": 733, "avgGRE": 163, "internationalStudentPct": 33},
        "costs": {"annualTuition": 84874, "totalProgramCost": 245000},
        "employment": {"top3Industries": ["Finance / Banking", "Consulting", "Technology"], "top5Companies": ["McKinsey", "Goldman Sachs", "BCG", "JPMorgan", "Bain"], "employmentRate3Months": 96, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["Finance", "Accounting", "Real Estate", "Marketing", "Operations"],
        "culture": ["Quantitative Rigor", "Finance-Forward", "Large Network", "Collaborative Clusters"],
        "programUrl": "https://mba.wharton.upenn.edu/",
    },
    "booth-uchicago": {
        "name": "Booth School of Business", "university": "University of Chicago", "tier": "M7",
        "location": {"city": "Chicago", "state": "IL"},
        "classProfile": {"size": 580, "avgWorkExperience": 5.0, "avgGMAT": 730, "avgGRE": 163, "internationalStudentPct": 37},
        "costs": {"annualTuition": 77796, "totalProgramCost": 225000},
        "employment": {"top3Industries": ["Finance / PE / VC", "Consulting", "Technology"], "top5Companies": ["McKinsey", "BCG", "Bain", "Goldman Sachs", "Amazon"], "employmentRate3Months": 97, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["Finance", "Economics", "Accounting", "Entrepreneurship", "Analytics"],
        "culture": ["Intellectual Rigor", "Flexible Curriculum", "Data-Driven", "Collaborative"],
        "programUrl": "https://www.chicagobooth.edu/programs/mba",
    },
    "kellogg-northwestern": {
        "name": "Kellogg School of Management", "university": "Northwestern University", "tier": "M7",
        "location": {"city": "Evanston", "state": "IL"},
        "classProfile": {"size": 525, "avgWorkExperience": 5.0, "avgGMAT": 727, "avgGRE": 163, "internationalStudentPct": 37},
        "costs": {"annualTuition": 82545, "totalProgramCost": 238000},
        "employment": {"top3Industries": ["Consulting", "Technology", "Consumer Products / Retail"], "top5Companies": ["McKinsey", "BCG", "Bain", "Amazon", "Google"], "employmentRate3Months": 96, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["Marketing", "Management", "Operations", "Entrepreneurship", "Healthcare"],
        "culture": ["Team-Oriented", "Collaborative", "Marketing-Forward", "Social Impact"],
        "programUrl": "https://www.kellogg.northwestern.edu/programs/full-time-mba.aspx",
    },
    "sloan-mit": {
        "name": "MIT Sloan School of Management", "university": "Massachusetts Institute of Technology", "tier": "M7",
        "location": {"city": "Cambridge", "state": "MA"},
        "classProfile": {"size": 406, "avgWorkExperience": 5.0, "avgGMAT": 730, "avgGRE": 163, "internationalStudentPct": 41},
        "costs": {"annualTuition": 82200, "totalProgramCost": 236000},
        "employment": {"top3Industries": ["Consulting", "Technology", "Finance / PE"], "top5Companies": ["McKinsey", "BCG", "Bain", "Amazon", "Google"], "employmentRate3Months": 94, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["Technology / Innovation", "Operations", "Finance", "Entrepreneurship", "Analytics"],
        "culture": ["Action Learning", "Hands-On", "Quantitative", "Cross-Disciplinary"],
        "programUrl": "https://mitsloan.mit.edu/mba",
    },
    "columbia-cbs": {
        "name": "Columbia Business School", "university": "Columbia University", "tier": "M7",
        "location": {"city": "New York", "state": "NY"},
        "classProfile": {"size": 754, "avgWorkExperience": 5.0, "avgGMAT": 729, "avgGRE": 163, "internationalStudentPct": 38},
        "costs": {"annualTuition": 87048, "totalProgramCost": 248000},
        "employment": {"top3Industries": ["Finance / Banking / PE", "Consulting", "Technology"], "top5Companies": ["Goldman Sachs", "McKinsey", "BCG", "JPMorgan", "Amazon"], "employmentRate3Months": 94, "avgStartingSalary": 175000, "medianSigningBonus": 30000},
        "academicStrengths": ["Finance", "Private Equity", "Media / Entertainment", "Entrepreneurship", "Value Investing"],
        "culture": ["NYC Advantage", "Finance-Oriented", "Network Access", "Diverse"],
        "programUrl": "https://home.gsb.columbia.edu/programs/mba",
    },
    "tuck-dartmouth": {
        "name": "Tuck School of Business", "university": "Dartmouth College", "tier": "T8-15",
        "location": {"city": "Hanover", "state": "NH"},
        "classProfile": {"size": 285, "avgWorkExperience": 5.0, "avgGMAT": 722, "avgGRE": 162, "internationalStudentPct": 37},
        "costs": {"annualTuition": 82080, "totalProgramCost": 230000},
        "employment": {"top3Industries": ["Consulting", "Finance / PE", "Technology"], "top5Companies": ["McKinsey", "BCG", "Bain", "Goldman Sachs", "Amazon"], "employmentRate3Months": 96, "avgStartingSalary": 160000, "medianSigningBonus": 25000},
        "academicStrengths": ["General Management", "Strategy", "Consulting", "Finance", "Leadership"],
        "culture": ["Tight-Knit Community", "Collaborative", "Residential", "Outdoor Lifestyle"],
        "programUrl": "https://www.tuck.dartmouth.edu/mba",
    },
    "yale-som": {
        "name": "Yale School of Management", "university": "Yale University", "tier": "T8-15",
        "location": {"city": "New Haven", "state": "CT"},
        "classProfile": {"size": 350, "avgWorkExperience": 5.0, "avgGMAT": 720, "avgGRE": 162, "internationalStudentPct": 43},
        "costs": {"annualTuition": 75800, "totalProgramCost": 218000},
        "employment": {"top3Industries": ["Consulting", "Finance / PE", "Nonprofit / Social Enterprise"], "top5Companies": ["McKinsey", "BCG", "Bain", "Goldman Sachs", "Google"], "employmentRate3Months": 94, "avgStartingSalary": 155000, "medianSigningBonus": 25000},
        "academicStrengths": ["Social Enterprise", "Sustainability", "Healthcare", "Finance", "Nonprofit Management"],
        "culture": ["Mission-Driven", "Integrated Curriculum", "Global", "Collaborative"],
        "programUrl": "https://som.yale.edu/programs/mba",
    },
    "haas-berkeley": {
        "name": "Haas School of Business", "university": "University of California, Berkeley", "tier": "T8-15",
        "location": {"city": "Berkeley", "state": "CA"},
        "classProfile": {"size": 252, "avgWorkExperience": 5.0, "avgGMAT": 729, "avgGRE": 163, "internationalStudentPct": 37},
        "costs": {"annualTuition": 69294, "totalProgramCost": 200000},
        "employment": {"top3Industries": ["Technology", "Consulting", "Finance / PE"], "top5Companies": ["McKinsey", "Google", "Amazon", "BCG", "Apple"], "employmentRate3Months": 95, "avgStartingSalary": 162000, "medianSigningBonus": 25000},
        "academicStrengths": ["Technology / Innovation", "Entrepreneurship", "Sustainability", "Finance", "Marketing"],
        "culture": ["Question the Status Quo", "Beyond Yourself", "Student-Led", "Bay Area Ecosystem"],
        "programUrl": "https://haas.berkeley.edu/mba/",
    },
    "ross-umich": {
        "name": "Ross School of Business", "university": "University of Michigan", "tier": "T8-15",
        "location": {"city": "Ann Arbor", "state": "MI"},
        "classProfile": {"size": 413, "avgWorkExperience": 5.0, "avgGMAT": 716, "avgGRE": 161, "internationalStudentPct": 34},
        "costs": {"annualTuition": 71000, "totalProgramCost": 202000},
        "employment": {"top3Industries": ["Consulting", "Finance / PE", "Technology"], "top5Companies": ["McKinsey", "BCG", "Bain", "Amazon", "Ford"], "employmentRate3Months": 96, "avgStartingSalary": 155000, "medianSigningBonus": 25000},
        "academicStrengths": ["Action-Based Learning", "Automotive / Manufacturing", "Consulting", "Finance", "Entrepreneurship"],
        "culture": ["Action Learning", "MAP Project", "Team-Oriented", "Big Ten Collegiate"],
        "programUrl": "https://michiganross.umich.edu/programs/full-time-mba",
    },
    "darden-uva": {
        "name": "Darden School of Business", "university": "University of Virginia", "tier": "T8-15",
        "location": {"city": "Charlottesville", "state": "VA"},
        "classProfile": {"size": 325, "avgWorkExperience": 5.1, "avgGMAT": 713, "avgGRE": 160, "internationalStudentPct": 35},
        "costs": {"annualTuition": 73300, "totalProgramCost": 210000},
        "employment": {"top3Industries": ["Consulting", "Finance / PE", "Technology"], "top5Companies": ["McKinsey", "BCG", "Bain", "Amazon", "Deloitte"], "employmentRate3Months": 96, "avgStartingSalary": 150000, "medianSigningBonus": 25000},
        "academicStrengths": ["General Management", "Strategy", "Entrepreneurship", "Finance", "Leadership"],
        "culture": ["Case Method", "Residential", "Collaborative", "Honor Code"],
        "programUrl": "https://www.darden.virginia.edu/mba",
    },
    "fuqua-duke": {
        "name": "Fuqua School of Business", "university": "Duke University", "tier": "T8-15",
        "location": {"city": "Durham", "state": "NC"},
        "classProfile": {"size": 440, "avgWorkExperience": 5.0, "avgGMAT": 710, "avgGRE": 160, "internationalStudentPct": 40},
        "costs": {"annualTuition": 72000, "totalProgramCost": 205000},
        "employment": {"top3Industries": ["Consulting", "Technology", "Healthcare / Pharma"], "top5Companies": ["McKinsey", "BCG", "Bain", "Amazon", "Johnson & Johnson"], "employmentRate3Months": 95, "avgStartingSalary": 150000, "medianSigningBonus": 25000},
        "academicStrengths": ["Healthcare", "Social Enterprise", "Consulting", "Finance", "Marketing"],
        "culture": ["Team Fuqua", "Collaborative", "Diverse", "Social Impact"],
        "programUrl": "https://www.fuqua.duke.edu/programs/mba",
    },
    "johnson-cornell": {
        "name": "Johnson Graduate School of Management", "university": "Cornell University", "tier": "T8-15",
        "location": {"city": "Ithaca", "state": "NY"},
        "classProfile": {"size": 272, "avgWorkExperience": 5.0, "avgGMAT": 700, "avgGRE": 160, "internationalStudentPct": 33},
        "costs": {"annualTuition": 74900, "totalProgramCost": 212000},
        "employment": {"top3Industries": ["Finance / PE", "Consulting", "Technology"], "top5Companies": ["Goldman Sachs", "McKinsey", "BCG", "Amazon", "Citi"], "employmentRate3Months": 94, "avgStartingSalary": 148000, "medianSigningBonus": 25000},
        "academicStrengths": ["Finance", "Entrepreneurship", "Sustainable Global Enterprise", "Marketing", "Leadership"],
        "culture": ["Immersive Learning", "Small Cohort", "Collaborative", "Cornell Ecosystem"],
        "programUrl": "https://www.johnson.cornell.edu/programs/mba/",
    },
    "stern-nyu": {
        "name": "Stern School of Business", "university": "New York University", "tier": "T8-15",
        "location": {"city": "New York", "state": "NY"},
        "classProfile": {"size": 330, "avgWorkExperience": 5.0, "avgGMAT": 721, "avgGRE": 161, "internationalStudentPct": 37},
        "costs": {"annualTuition": 83906, "totalProgramCost": 237000},
        "employment": {"top3Industries": ["Finance / Banking / PE", "Consulting", "Technology"], "top5Companies": ["Goldman Sachs", "McKinsey", "JPMorgan", "BCG", "Morgan Stanley"], "employmentRate3Months": 93, "avgStartingSalary": 155000, "medianSigningBonus": 25000},
        "academicStrengths": ["Finance", "Technology", "Media / Entertainment", "Marketing", "Luxury"],
        "culture": ["NYC Access", "Finance-Oriented", "Diverse", "IQ + EQ Philosophy"],
        "programUrl": "https://www.stern.nyu.edu/programs-admissions/full-time-mba",
    },
    "anderson-ucla": {
        "name": "Anderson School of Management", "university": "University of California, Los Angeles", "tier": "T16-30",
        "location": {"city": "Los Angeles", "state": "CA"},
        "classProfile": {"size": 360, "avgWorkExperience": 5.0, "avgGMAT": 708, "avgGRE": 159, "internationalStudentPct": 35},
        "costs": {"annualTuition": 67000, "totalProgramCost": 196000},
        "employment": {"top3Industries": ["Technology", "Consulting", "Entertainment / Media"], "top5Companies": ["McKinsey", "BCG", "Amazon", "Google", "Deloitte"], "employmentRate3Months": 93, "avgStartingSalary": 148000, "medianSigningBonus": 20000},
        "academicStrengths": ["Entertainment / Media", "Technology", "Real Estate", "Entrepreneurship", "Finance"],
        "culture": ["Share Success", "LA Ecosystem", "Collaborative", "Entrepreneurial"],
        "programUrl": "https://www.anderson.ucla.edu/programs/mba",
    },
    "mccombs-utaustin": {
        "name": "McCombs School of Business", "university": "University of Texas at Austin", "tier": "T16-30",
        "location": {"city": "Austin", "state": "TX"},
        "classProfile": {"size": 270, "avgWorkExperience": 5.0, "avgGMAT": 703, "avgGRE": 159, "internationalStudentPct": 30},
        "costs": {"annualTuition": 52000, "totalProgramCost": 145000},
        "employment": {"top3Industries": ["Consulting", "Technology", "Finance / PE"], "top5Companies": ["McKinsey", "BCG", "Deloitte", "Amazon", "Dell"], "employmentRate3Months": 93, "avgStartingSalary": 135000, "medianSigningBonus": 20000},
        "academicStrengths": ["Energy", "Technology", "Finance", "Entrepreneurship", "Real Estate"],
        "culture": ["Texas Network", "Collaborative", "Austin Startup Ecosystem", "Value"],
        "programUrl": "https://www.mccombs.utexas.edu/mba/",
    },
    "kenan-flagler-unc": {
        "name": "Kenan-Flagler Business School", "university": "University of North Carolina at Chapel Hill", "tier": "T16-30",
        "location": {"city": "Chapel Hill", "state": "NC"},
        "classProfile": {"size": 280, "avgWorkExperience": 5.0, "avgGMAT": 701, "avgGRE": 159, "internationalStudentPct": 27},
        "costs": {"annualTuition": 52000, "totalProgramCost": 145000},
        "employment": {"top3Industries": ["Consulting", "Finance / PE", "Technology"], "top5Companies": ["McKinsey", "BCG", "Bain", "Deloitte", "Amazon"], "employmentRate3Months": 94, "avgStartingSalary": 135000, "medianSigningBonus": 20000},
        "academicStrengths": ["Sustainable Enterprise", "Finance", "Marketing", "Entrepreneurship", "Leadership"],
        "culture": ["Collaborative", "Sustainable Business Focus", "Close-Knit", "Research Triangle"],
        "programUrl": "https://www.kenan-flagler.unc.edu/programs/mba/",
    },
    "marshall-usc": {
        "name": "Marshall School of Business", "university": "University of Southern California", "tier": "T16-30",
        "location": {"city": "Los Angeles", "state": "CA"},
        "classProfile": {"size": 210, "avgWorkExperience": 5.0, "avgGMAT": 706, "avgGRE": 159, "internationalStudentPct": 35},
        "costs": {"annualTuition": 72000, "totalProgramCost": 202000},
        "employment": {"top3Industries": ["Technology", "Consulting", "Entertainment / Media"], "top5Companies": ["McKinsey", "Amazon", "Deloitte", "Google", "Disney"], "employmentRate3Months": 92, "avgStartingSalary": 138000, "medianSigningBonus": 20000},
        "academicStrengths": ["Entrepreneurship", "International Business", "Marketing", "Finance", "Entertainment"],
        "culture": ["Trojan Network", "LA Access", "Entrepreneurial", "Diverse Global"],
        "programUrl": "https://www.marshall.usc.edu/programs/mba-programs/full-time-mba",
    },
    "tepper-cmu": {
        "name": "Tepper School of Business", "university": "Carnegie Mellon University", "tier": "T16-30",
        "location": {"city": "Pittsburgh", "state": "PA"},
        "classProfile": {"size": 200, "avgWorkExperience": 5.0, "avgGMAT": 692, "avgGRE": 158, "internationalStudentPct": 42},
        "costs": {"annualTuition": 72000, "totalProgramCost": 203000},
        "employment": {"top3Industries": ["Technology", "Consulting", "Finance / Analytics"], "top5Companies": ["McKinsey", "Amazon", "Google", "BCG", "Microsoft"], "employmentRate3Months": 92, "avgStartingSalary": 140000, "medianSigningBonus": 20000},
        "academicStrengths": ["Analytics / AI", "Operations Research", "Technology", "Finance", "Strategy"],
        "culture": ["Analytical", "Quantitative", "Tech-Forward", "Cross-Disciplinary (CMU)"],
        "programUrl": "https://www.cmu.edu/tepper/programs/mba/index.html",
    },
    "goizueta-emory": {
        "name": "Goizueta Business School", "university": "Emory University", "tier": "T16-30",
        "location": {"city": "Atlanta", "state": "GA"},
        "classProfile": {"size": 180, "avgWorkExperience": 5.0, "avgGMAT": 682, "avgGRE": 157, "internationalStudentPct": 25},
        "costs": {"annualTuition": 62000, "totalProgramCost": 175000},
        "employment": {"top3Industries": ["Consulting", "Technology", "Healthcare"], "top5Companies": ["McKinsey", "BCG", "Deloitte", "Delta Air Lines", "Coca-Cola"], "employmentRate3Months": 93, "avgStartingSalary": 130000, "medianSigningBonus": 20000},
        "academicStrengths": ["Marketing", "Consulting", "Healthcare", "Finance", "Social Enterprise"],
        "culture": ["Atlanta Network", "Principled Leadership", "Small Cohort", "Emory Ecosystem"],
        "programUrl": "https://goizueta.emory.edu/degree/full-time-mba",
    },
    "mcdonough-georgetown": {
        "name": "McDonough School of Business", "university": "Georgetown University", "tier": "T16-30",
        "location": {"city": "Washington", "state": "DC"},
        "classProfile": {"size": 240, "avgWorkExperience": 5.0, "avgGMAT": 694, "avgGRE": 158, "internationalStudentPct": 35},
        "costs": {"annualTuition": 69000, "totalProgramCost": 196000},
        "employment": {"top3Industries": ["Consulting", "Finance / Government / Policy", "Technology"], "top5Companies": ["McKinsey", "Deloitte", "BCG", "Amazon", "Capital One"], "employmentRate3Months": 93, "avgStartingSalary": 132000, "medianSigningBonus": 20000},
        "academicStrengths": ["International Business", "Finance", "Consulting", "Government / Policy", "Social Enterprise"],
        "culture": ["DC Access", "Global Outlook", "Jesuit Values", "Principled Leadership"],
        "programUrl": "https://msb.georgetown.edu/programs/mba/",
    },
    "kelley-indiana": {
        "name": "Kelley School of Business", "university": "Indiana University", "tier": "T16-30",
        "location": {"city": "Bloomington", "state": "IN"},
        "classProfile": {"size": 190, "avgWorkExperience": 5.0, "avgGMAT": 672, "avgGRE": 157, "internationalStudentPct": 30},
        "costs": {"annualTuition": 33000, "totalProgramCost": 93000},
        "employment": {"top3Industries": ["Finance / Accounting", "Consulting", "Technology"], "top5Companies": ["Deloitte", "PwC", "Amazon", "EY", "Microsoft"], "employmentRate3Months": 93, "avgStartingSalary": 120000, "medianSigningBonus": 15000},
        "academicStrengths": ["Accounting", "Finance", "Marketing", "Entrepreneurship", "Supply Chain"],
        "culture": ["Academy Programs", "Specialized Tracks", "Value for Money", "Big Ten Collegiate"],
        "programUrl": "https://kelley.iu.edu/programs/mba/index.html",
    },
    "foster-uw": {
        "name": "Foster School of Business", "university": "University of Washington", "tier": "T16-30",
        "location": {"city": "Seattle", "state": "WA"},
        "classProfile": {"size": 110, "avgWorkExperience": 5.0, "avgGMAT": 689, "avgGRE": 157, "internationalStudentPct": 35},
        "costs": {"annualTuition": 52000, "totalProgramCost": 145000},
        "employment": {"top3Industries": ["Technology", "Consulting", "Finance / PE"], "top5Companies": ["Amazon", "Microsoft", "Google", "McKinsey", "BCG"], "employmentRate3Months": 92, "avgStartingSalary": 135000, "medianSigningBonus": 20000},
        "academicStrengths": ["Technology", "Entrepreneurship", "Finance", "Global Business", "Supply Chain"],
        "culture": ["Seattle Tech Hub", "Small Cohort", "Collaborative", "Pacific Northwest"],
        "programUrl": "https://foster.uw.edu/programs/mba/full-time-mba/",
    },
    "jones-rice": {
        "name": "Jones Graduate School of Business", "university": "Rice University", "tier": "T16-30",
        "location": {"city": "Houston", "state": "TX"},
        "classProfile": {"size": 120, "avgWorkExperience": 5.0, "avgGMAT": 694, "avgGRE": 158, "internationalStudentPct": 30},
        "costs": {"annualTuition": 65000, "totalProgramCost": 182000},
        "employment": {"top3Industries": ["Finance / Banking", "Energy", "Consulting"], "top5Companies": ["ExxonMobil", "Shell", "McKinsey", "Deloitte", "Goldman Sachs"], "employmentRate3Months": 93, "avgStartingSalary": 130000, "medianSigningBonus": 18000},
        "academicStrengths": ["Energy", "Finance", "Entrepreneurship", "Healthcare", "Operations"],
        "culture": ["Houston Network", "Small Cohort", "Collegiate", "Energy Hub"],
        "programUrl": "https://business.rice.edu/mba",
    },
    "owen-vanderbilt": {
        "name": "Owen Graduate School of Management", "university": "Vanderbilt University", "tier": "T16-30",
        "location": {"city": "Nashville", "state": "TN"},
        "classProfile": {"size": 180, "avgWorkExperience": 5.0, "avgGMAT": 690, "avgGRE": 157, "internationalStudentPct": 29},
        "costs": {"annualTuition": 63000, "totalProgramCost": 178000},
        "employment": {"top3Industries": ["Consulting", "Finance", "Healthcare"], "top5Companies": ["Deloitte", "HCA Healthcare", "McKinsey", "Amazon", "PwC"], "employmentRate3Months": 94, "avgStartingSalary": 125000, "medianSigningBonus": 17000},
        "academicStrengths": ["Healthcare", "Finance", "Operations", "Marketing", "Entrepreneurship"],
        "culture": ["Nashville Rising City", "Collaborative", "Small Community", "Healthcare Hub"],
        "programUrl": "https://owen.vanderbilt.edu/programs/mba/",
    },
    "scheller-gatech": {
        "name": "Scheller College of Business", "university": "Georgia Institute of Technology", "tier": "T16-30",
        "location": {"city": "Atlanta", "state": "GA"},
        "classProfile": {"size": 130, "avgWorkExperience": 5.0, "avgGMAT": 673, "avgGRE": 157, "internationalStudentPct": 40},
        "costs": {"annualTuition": 52000, "totalProgramCost": 145000},
        "employment": {"top3Industries": ["Technology", "Consulting", "Operations / Supply Chain"], "top5Companies": ["Amazon", "Google", "McKinsey", "Deloitte", "Microsoft"], "employmentRate3Months": 91, "avgStartingSalary": 128000, "medianSigningBonus": 15000},
        "academicStrengths": ["Analytics / Operations Research", "Technology", "Supply Chain", "Finance", "Innovation"],
        "culture": ["Tech-Forward", "STEM-Adjacent", "Atlanta Network", "Analytical"],
        "programUrl": "https://scheller.gatech.edu/degree-programs/mba/index.html",
    },
    "mendoza-notredame": {
        "name": "Mendoza College of Business", "university": "University of Notre Dame", "tier": "T16-30",
        "location": {"city": "Notre Dame", "state": "IN"},
        "classProfile": {"size": 150, "avgWorkExperience": 5.0, "avgGMAT": 679, "avgGRE": 157, "internationalStudentPct": 25},
        "costs": {"annualTuition": 57000, "totalProgramCost": 158000},
        "employment": {"top3Industries": ["Consulting", "Finance", "Consumer Products"], "top5Companies": ["Deloitte", "PwC", "McKinsey", "Eli Lilly", "Johnson & Johnson"], "employmentRate3Months": 94, "avgStartingSalary": 122000, "medianSigningBonus": 15000},
        "academicStrengths": ["Finance", "Ethical Leadership", "Consulting", "Marketing", "Social Enterprise"],
        "culture": ["Catholic Mission", "Values-Driven", "Notre Dame Network", "Collaborative"],
        "programUrl": "https://mendoza.nd.edu/programs/mba/",
    },
    "fisher-ohiostate": {
        "name": "Fisher College of Business", "university": "Ohio State University", "tier": "T16-30",
        "location": {"city": "Columbus", "state": "OH"},
        "classProfile": {"size": 100, "avgWorkExperience": 5.0, "avgGMAT": 663, "avgGRE": 156, "internationalStudentPct": 30},
        "costs": {"annualTuition": 50000, "totalProgramCost": 138000},
        "employment": {"top3Industries": ["Consulting", "Finance", "Consumer Products"], "top5Companies": ["Deloitte", "Nationwide", "JPMorgan", "Amazon", "PwC"], "employmentRate3Months": 91, "avgStartingSalary": 115000, "medianSigningBonus": 15000},
        "academicStrengths": ["Finance", "Operations", "Marketing", "Entrepreneurship", "Real Estate"],
        "culture": ["Big Ten Collegiate", "Ohio Network", "Value for Money", "Collaborative"],
        "programUrl": "https://fisher.osu.edu/graduate/full-time-mba",
    },
    "wisconsin-uwmadison": {
        "name": "Wisconsin School of Business", "university": "University of Wisconsin-Madison", "tier": "T16-30",
        "location": {"city": "Madison", "state": "WI"},
        "classProfile": {"size": 80, "avgWorkExperience": 5.0, "avgGMAT": 647, "avgGRE": 155, "internationalStudentPct": 30},
        "costs": {"annualTuition": 42000, "totalProgramCost": 115000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Consumer Products"], "top5Companies": ["Deloitte", "PwC", "Amazon", "American Family Insurance", "EY"], "employmentRate3Months": 90, "avgStartingSalary": 112000, "medianSigningBonus": 12000},
        "academicStrengths": ["Real Estate", "Supply Chain", "Finance", "Marketing", "Risk Management"],
        "culture": ["Big Ten Collegiate", "Wisconsin Network", "Value for Money", "Research University"],
        "programUrl": "https://bus.wisc.edu/programs/mba",
    },
    "mays-tamu": {
        "name": "Mays Business School", "university": "Texas A&M University", "tier": "T31-50",
        "location": {"city": "College Station", "state": "TX"},
        "classProfile": {"size": 100, "avgWorkExperience": 4.8, "avgGMAT": 635, "avgGRE": 154, "internationalStudentPct": 25},
        "costs": {"annualTuition": 26000, "totalProgramCost": 72000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Energy"], "top5Companies": ["Deloitte", "ExxonMobil", "PwC", "Chevron", "KPMG"], "employmentRate3Months": 89, "avgStartingSalary": 108000, "medianSigningBonus": 12000},
        "academicStrengths": ["Finance", "Supply Chain", "Energy", "Marketing", "Entrepreneurship"],
        "culture": ["Aggie Network", "Military-Friendly", "Value for Money", "Texas Spirit"],
        "programUrl": "https://mays.tamu.edu/mba/",
    },
    "smeal-pennstate": {
        "name": "Smeal College of Business", "university": "Pennsylvania State University", "tier": "T31-50",
        "location": {"city": "University Park", "state": "PA"},
        "classProfile": {"size": 100, "avgWorkExperience": 4.8, "avgGMAT": 637, "avgGRE": 154, "internationalStudentPct": 30},
        "costs": {"annualTuition": 45000, "totalProgramCost": 124000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Supply Chain"], "top5Companies": ["Deloitte", "PwC", "EY", "KPMG", "Amazon"], "employmentRate3Months": 90, "avgStartingSalary": 110000, "medianSigningBonus": 12000},
        "academicStrengths": ["Supply Chain", "Finance", "Real Estate", "Marketing", "Risk Management"],
        "culture": ["Big Ten Collegiate", "Penn State Network", "Value for Money", "Research University"],
        "programUrl": "https://www.smeal.psu.edu/mba",
    },
    "smith-umd": {
        "name": "Smith School of Business", "university": "University of Maryland", "tier": "T31-50",
        "location": {"city": "College Park", "state": "MD"},
        "classProfile": {"size": 150, "avgWorkExperience": 4.8, "avgGMAT": 650, "avgGRE": 155, "internationalStudentPct": 30},
        "costs": {"annualTuition": 43000, "totalProgramCost": 118000},
        "employment": {"top3Industries": ["Consulting", "Finance", "Technology"], "top5Companies": ["Deloitte", "McKinsey", "Amazon", "Capital One", "Lockheed Martin"], "employmentRate3Months": 90, "avgStartingSalary": 115000, "medianSigningBonus": 12000},
        "academicStrengths": ["Finance", "Technology", "Consulting", "Supply Chain", "International Business"],
        "culture": ["DC Proximity", "Government / Defense Access", "Diverse", "Value for Money"],
        "programUrl": "https://www.rhsmith.umd.edu/programs/mba",
    },
    "carlson-umn": {
        "name": "Carlson School of Management", "university": "University of Minnesota", "tier": "T31-50",
        "location": {"city": "Minneapolis", "state": "MN"},
        "classProfile": {"size": 110, "avgWorkExperience": 5.0, "avgGMAT": 660, "avgGRE": 155, "internationalStudentPct": 28},
        "costs": {"annualTuition": 40000, "totalProgramCost": 110000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Healthcare / Medical Devices"], "top5Companies": ["Deloitte", "PwC", "Target", "3M", "UnitedHealth Group"], "employmentRate3Months": 91, "avgStartingSalary": 112000, "medianSigningBonus": 12000},
        "academicStrengths": ["Finance", "Supply Chain", "Medical Devices", "Marketing", "Entrepreneurship"],
        "culture": ["Minnesota Nice", "Corporate Access", "Value for Money", "Midwest Community"],
        "programUrl": "https://carlsonschool.umn.edu/degrees/mba",
    },
    "wpcarey-asu": {
        "name": "W.P. Carey School of Business", "university": "Arizona State University", "tier": "T31-50",
        "location": {"city": "Tempe", "state": "AZ"},
        "classProfile": {"size": 100, "avgWorkExperience": 4.8, "avgGMAT": 645, "avgGRE": 154, "internationalStudentPct": 28},
        "costs": {"annualTuition": 38000, "totalProgramCost": 103000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Technology"], "top5Companies": ["Deloitte", "Intel", "Amazon", "PwC", "American Express"], "employmentRate3Months": 89, "avgStartingSalary": 108000, "medianSigningBonus": 10000},
        "academicStrengths": ["Supply Chain", "Real Estate", "Finance", "Marketing", "Entrepreneurship"],
        "culture": ["Innovation", "Diverse", "Arizona Network", "Value for Money"],
        "programUrl": "https://wpcarey.asu.edu/mba-programs/full-time",
    },
    "krannert-purdue": {
        "name": "Krannert School of Management", "university": "Purdue University", "tier": "T31-50",
        "location": {"city": "West Lafayette", "state": "IN"},
        "classProfile": {"size": 100, "avgWorkExperience": 4.8, "avgGMAT": 628, "avgGRE": 153, "internationalStudentPct": 40},
        "costs": {"annualTuition": 32000, "totalProgramCost": 87000},
        "employment": {"top3Industries": ["Technology", "Operations / Supply Chain", "Finance"], "top5Companies": ["Caterpillar", "Amazon", "Deloitte", "PwC", "Eli Lilly"], "employmentRate3Months": 88, "avgStartingSalary": 105000, "medianSigningBonus": 10000},
        "academicStrengths": ["Operations / Supply Chain", "Finance", "Analytics", "Technology", "Entrepreneurship"],
        "culture": ["STEM-Adjacent", "Engineering Ecosystem", "Value for Money", "Quantitative"],
        "programUrl": "https://krannert.purdue.edu/programs/mba/",
    },
    "broad-msu": {
        "name": "Broad College of Business", "university": "Michigan State University", "tier": "T31-50",
        "location": {"city": "East Lansing", "state": "MI"},
        "classProfile": {"size": 80, "avgWorkExperience": 4.8, "avgGMAT": 610, "avgGRE": 152, "internationalStudentPct": 28},
        "costs": {"annualTuition": 35000, "totalProgramCost": 95000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Consumer Products"], "top5Companies": ["Deloitte", "PwC", "EY", "General Motors", "Amazon"], "employmentRate3Months": 87, "avgStartingSalary": 100000, "medianSigningBonus": 10000},
        "academicStrengths": ["Supply Chain", "Finance", "Marketing", "Entrepreneurship", "Operations"],
        "culture": ["Big Ten Collegiate", "Michigan Network", "Value for Money", "Collaborative"],
        "programUrl": "https://broad.msu.edu/programs/mba/",
    },
    "marriott-byu": {
        "name": "Marriott School of Business", "university": "Brigham Young University", "tier": "T31-50",
        "location": {"city": "Provo", "state": "UT"},
        "classProfile": {"size": 150, "avgWorkExperience": 4.5, "avgGMAT": 674, "avgGRE": 157, "internationalStudentPct": 20},
        "costs": {"annualTuition": 16000, "totalProgramCost": 48000},
        "employment": {"top3Industries": ["Consulting", "Finance", "Technology"], "top5Companies": ["Deloitte", "McKinsey", "Amazon", "Goldman Sachs", "Apple"], "employmentRate3Months": 94, "avgStartingSalary": 120000, "medianSigningBonus": 15000},
        "academicStrengths": ["Finance", "Strategy", "Entrepreneurship", "Marketing", "Organizational Behavior"],
        "culture": ["Faith-Affiliated", "Exceptional Value", "Ethical Leadership", "Strong Alumni Network"],
        "programUrl": "https://marriottschool.byu.edu/mba/",
    },
    "questrom-bu": {
        "name": "Questrom School of Business", "university": "Boston University", "tier": "T31-50",
        "location": {"city": "Boston", "state": "MA"},
        "classProfile": {"size": 180, "avgWorkExperience": 5.0, "avgGMAT": 660, "avgGRE": 155, "internationalStudentPct": 35},
        "costs": {"annualTuition": 60000, "totalProgramCost": 168000},
        "employment": {"top3Industries": ["Finance", "Technology", "Consulting"], "top5Companies": ["Deloitte", "PwC", "Amazon", "State Street", "Fidelity"], "employmentRate3Months": 90, "avgStartingSalary": 112000, "medianSigningBonus": 12000},
        "academicStrengths": ["Finance", "Healthcare / Pharma", "Technology", "Entrepreneurship", "Marketing"],
        "culture": ["Boston Ecosystem", "Diverse", "Urban Campus", "Research University"],
        "programUrl": "https://questromworld.bu.edu/fulltime-mba/",
    },
    "gsm-ucdavis": {
        "name": "Graduate School of Management", "university": "University of California, Davis", "tier": "T31-50",
        "location": {"city": "Davis", "state": "CA"},
        "classProfile": {"size": 90, "avgWorkExperience": 5.0, "avgGMAT": 638, "avgGRE": 154, "internationalStudentPct": 32},
        "costs": {"annualTuition": 55000, "totalProgramCost": 152000},
        "employment": {"top3Industries": ["Technology", "Finance", "Agriculture / Food"], "top5Companies": ["Amazon", "Deloitte", "Apple", "Google", "Intel"], "employmentRate3Months": 89, "avgStartingSalary": 115000, "medianSigningBonus": 12000},
        "academicStrengths": ["Entrepreneurship", "Technology", "Agriculture / Food Business", "Finance", "Marketing"],
        "culture": ["Bay Area / Sacramento Access", "Collaborative", "Small Cohort", "UC System"],
        "programUrl": "https://gsm.ucdavis.edu/programs/mba",
    },
    "merage-uci": {
        "name": "Merage School of Business", "university": "University of California, Irvine", "tier": "T31-50",
        "location": {"city": "Irvine", "state": "CA"},
        "classProfile": {"size": 80, "avgWorkExperience": 5.0, "avgGMAT": 633, "avgGRE": 153, "internationalStudentPct": 38},
        "costs": {"annualTuition": 55000, "totalProgramCost": 152000},
        "employment": {"top3Industries": ["Technology", "Finance", "Healthcare"], "top5Companies": ["Amazon", "Deloitte", "Google", "Edwards Lifesciences", "PwC"], "employmentRate3Months": 89, "avgStartingSalary": 112000, "medianSigningBonus": 12000},
        "academicStrengths": ["Health Innovation", "Technology", "Finance", "Entrepreneurship", "Marketing"],
        "culture": ["SoCal Network", "Diverse", "Small Cohort", "UC System"],
        "programUrl": "https://merage.uci.edu/programs/mba/full-time-mba/",
    },
    "carroll-bc": {
        "name": "Carroll School of Management", "university": "Boston College", "tier": "T31-50",
        "location": {"city": "Chestnut Hill", "state": "MA"},
        "classProfile": {"size": 120, "avgWorkExperience": 4.8, "avgGMAT": 643, "avgGRE": 154, "internationalStudentPct": 28},
        "costs": {"annualTuition": 58000, "totalProgramCost": 160000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Technology"], "top5Companies": ["Deloitte", "State Street", "PwC", "Fidelity", "KPMG"], "employmentRate3Months": 90, "avgStartingSalary": 110000, "medianSigningBonus": 12000},
        "academicStrengths": ["Finance", "Accounting", "Social Enterprise", "Marketing", "Strategy"],
        "culture": ["Jesuit Values", "Boston Network", "Ethics-Focused", "Collaborative"],
        "programUrl": "https://www.bc.edu/bc-web/schools/carroll-school/graduate/mba.html",
    },
    "katz-pitt": {
        "name": "Katz Graduate School of Business", "university": "University of Pittsburgh", "tier": "T31-50",
        "location": {"city": "Pittsburgh", "state": "PA"},
        "classProfile": {"size": 80, "avgWorkExperience": 4.5, "avgGMAT": 598, "avgGRE": 151, "internationalStudentPct": 35},
        "costs": {"annualTuition": 36000, "totalProgramCost": 98000},
        "employment": {"top3Industries": ["Finance", "Healthcare", "Technology"], "top5Companies": ["PwC", "Deloitte", "UPMC", "EY", "Amazon"], "employmentRate3Months": 88, "avgStartingSalary": 100000, "medianSigningBonus": 10000},
        "academicStrengths": ["Finance", "Healthcare Management", "Entrepreneurship", "Operations", "Marketing"],
        "culture": ["Pittsburgh Renaissance", "Healthcare Hub", "Value for Money", "Collaborative"],
        "programUrl": "https://www.business.pitt.edu/katz/mba/",
    },
    "simon-rochester": {
        "name": "Simon Business School", "university": "University of Rochester", "tier": "T31-50",
        "location": {"city": "Rochester", "state": "NY"},
        "classProfile": {"size": 100, "avgWorkExperience": 5.0, "avgGMAT": 628, "avgGRE": 153, "internationalStudentPct": 40},
        "costs": {"annualTuition": 60000, "totalProgramCost": 167000},
        "employment": {"top3Industries": ["Finance", "Technology", "Consulting"], "top5Companies": ["Deloitte", "PwC", "Amazon", "Goldman Sachs", "Paychex"], "employmentRate3Months": 88, "avgStartingSalary": 108000, "medianSigningBonus": 10000},
        "academicStrengths": ["Finance", "Accounting", "Analytics", "Marketing", "Entrepreneurship"],
        "culture": ["Analytical", "Quantitative", "Small Community", "Research University"],
        "programUrl": "https://www.simon.rochester.edu/programs/full-time-mba/",
    },
    "cox-smu": {
        "name": "Cox School of Business", "university": "Southern Methodist University", "tier": "T31-50",
        "location": {"city": "Dallas", "state": "TX"},
        "classProfile": {"size": 120, "avgWorkExperience": 5.0, "avgGMAT": 662, "avgGRE": 155, "internationalStudentPct": 25},
        "costs": {"annualTuition": 60000, "totalProgramCost": 167000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Real Estate"], "top5Companies": ["Deloitte", "PwC", "EY", "AT&T", "Goldman Sachs"], "employmentRate3Months": 91, "avgStartingSalary": 115000, "medianSigningBonus": 12000},
        "academicStrengths": ["Finance", "Real Estate", "Energy", "Marketing", "Entrepreneurship"],
        "culture": ["Dallas Network", "Texas Spirit", "Urban Campus", "Corporate Access"],
        "programUrl": "https://cox.smu.edu/programs/mba/full-time-mba/",
    },
    "olin-babson": {
        "name": "F.W. Olin Graduate School of Business", "university": "Babson College", "tier": "T31-50",
        "location": {"city": "Wellesley", "state": "MA"},
        "classProfile": {"size": 150, "avgWorkExperience": 5.0, "avgGMAT": 640, "avgGRE": 154, "internationalStudentPct": 35},
        "costs": {"annualTuition": 57000, "totalProgramCost": 157000},
        "employment": {"top3Industries": ["Entrepreneurship / Startups", "Consulting", "Technology"], "top5Companies": ["Deloitte", "Amazon", "PwC", "Fidelity", "Google"], "employmentRate3Months": 91, "avgStartingSalary": 112000, "medianSigningBonus": 12000},
        "academicStrengths": ["Entrepreneurship", "Innovation", "Finance", "Marketing", "Social Enterprise"],
        "culture": ["#1 Entrepreneurship", "Action-Oriented", "Boston Ecosystem", "Diverse"],
        "programUrl": "https://www.babson.edu/academics/graduate-and-professional-education/mba-programs/",
    },
    "thunderbird-asu": {
        "name": "Thunderbird School of Global Management", "university": "Arizona State University", "tier": "T31-50",
        "location": {"city": "Glendale", "state": "AZ"},
        "classProfile": {"size": 80, "avgWorkExperience": 5.0, "avgGMAT": 600, "avgGRE": 152, "internationalStudentPct": 55},
        "costs": {"annualTuition": 40000, "totalProgramCost": 112000},
        "employment": {"top3Industries": ["International Business", "Consulting", "Government / NGO"], "top5Companies": ["Deloitte", "State Department", "Amazon", "PwC", "World Bank"], "employmentRate3Months": 87, "avgStartingSalary": 100000, "medianSigningBonus": 10000},
        "academicStrengths": ["Global Management", "International Business", "Cross-Cultural Leadership", "Emerging Markets", "Diplomacy"],
        "culture": ["Global First", "Highly International", "Language Focus", "Diplomacy / Government"],
        "programUrl": "https://thunderbird.asu.edu/programs/mba/",
    },
    "wfu-school-of-business": {
        "name": "School of Business", "university": "Wake Forest University", "tier": "T31-50",
        "location": {"city": "Winston-Salem", "state": "NC"},
        "classProfile": {"size": 75, "avgWorkExperience": 4.8, "avgGMAT": 641, "avgGRE": 154, "internationalStudentPct": 20},
        "costs": {"annualTuition": 55000, "totalProgramCost": 152000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Healthcare"], "top5Companies": ["Deloitte", "PwC", "Wells Fargo", "Bank of America", "Lowe's"], "employmentRate3Months": 91, "avgStartingSalary": 108000, "medianSigningBonus": 10000},
        "academicStrengths": ["Finance", "Entrepreneurship", "Healthcare", "Marketing", "Leadership"],
        "culture": ["Small Cohort", "Personalized Experience", "Charlotte / Triad Network", "Collaborative"],
        "programUrl": "https://business.wfu.edu/programs/mba/full-time-mba/",
    },
    "mason-wm": {
        "name": "Raymond A. Mason School of Business", "university": "William & Mary", "tier": "T31-50",
        "location": {"city": "Williamsburg", "state": "VA"},
        "classProfile": {"size": 55, "avgWorkExperience": 4.5, "avgGMAT": 605, "avgGRE": 151, "internationalStudentPct": 20},
        "costs": {"annualTuition": 37000, "totalProgramCost": 100000},
        "employment": {"top3Industries": ["Finance", "Consulting", "Government / Defense"], "top5Companies": ["Deloitte", "PwC", "Booz Allen Hamilton", "Capital One", "SAIC"], "employmentRate3Months": 90, "avgStartingSalary": 100000, "medianSigningBonus": 10000},
        "academicStrengths": ["Finance", "Consulting", "Government / Defense", "Marketing", "Entrepreneurship"],
        "culture": ["Virginia Network", "Small Cohort", "Value for Money", "Historic Campus"],
        "programUrl": "https://mason.wm.edu/programs/mba/full-time/",
    },
    "rady-ucsd": {
        "name": "Rady School of Management", "university": "University of California, San Diego", "tier": "T31-50",
        "location": {"city": "La Jolla", "state": "CA"},
        "classProfile": {"size": 60, "avgWorkExperience": 5.0, "avgGMAT": 630, "avgGRE": 153, "internationalStudentPct": 35},
        "costs": {"annualTuition": 57000, "totalProgramCost": 158000},
        "employment": {"top3Industries": ["Technology", "Biotech / Life Sciences", "Finance"], "top5Companies": ["Amazon", "Qualcomm", "Google", "Deloitte", "J&J"], "employmentRate3Months": 90, "avgStartingSalary": 115000, "medianSigningBonus": 12000},
        "academicStrengths": ["Biotech / Life Sciences", "Technology", "Innovation", "Entrepreneurship", "Finance"],
        "culture": ["Innovation Hub", "Biotech Ecosystem", "Small Cohort", "UCSD Research Access"],
        "programUrl": "https://rady.ucsd.edu/programs/mba/full-time/",
    },
}

ALL_IDS = [
    "harvard-hbs", "stanford-gsb", "wharton-upenn", "booth-uchicago", "kellogg-northwestern",
    "sloan-mit", "columbia-cbs",
    "tuck-dartmouth", "yale-som", "haas-berkeley", "ross-umich", "darden-uva",
    "fuqua-duke", "johnson-cornell", "stern-nyu",
    "anderson-ucla", "mccombs-utaustin", "kenan-flagler-unc", "marshall-usc", "tepper-cmu",
    "goizueta-emory", "mcdonough-georgetown", "kelley-indiana", "foster-uw", "jones-rice",
    "owen-vanderbilt", "scheller-gatech", "mendoza-notredame", "fisher-ohiostate", "wisconsin-uwmadison",
    "mays-tamu", "smeal-pennstate", "smith-umd", "carlson-umn", "wpcarey-asu",
    "krannert-purdue", "broad-msu", "marriott-byu", "questrom-bu", "gsm-ucdavis",
    "merage-uci", "carroll-bc", "katz-pitt", "simon-rochester", "cox-smu",
    "olin-babson", "thunderbird-asu", "wfu-school-of-business", "mason-wm", "rady-ucsd",
]

# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def _candidate_urls(school_id: str, page_type: str) -> list[str]:
    """
    Return an ordered list of URLs to try for a given school / page type.
    Priority: explicit overrides first, then auto-generated variants.
    page_type: "profile" | "employment"
    """
    overrides = URL_OVERRIDES.get(school_id, {}).get(page_type, [])
    raw_base = SEED[school_id]["programUrl"].rstrip("/")
    # Strip file extensions (.aspx, .html, .htm, .php) so appended paths don't break
    parsed = urlparse(raw_base)
    path = parsed.path
    for ext in (".aspx", ".html", ".htm", ".php", ".cfm"):
        if path.lower().endswith(ext):
            path = path[: -len(ext)]
            break
    base = parsed._replace(path=path).geturl().rstrip("/")
    suffixes = _PROFILE_SUFFIXES if page_type == "profile" else _EMPLOYMENT_SUFFIXES
    generated = [base + s for s in suffixes]
    seen: set[str] = set()
    result: list[str] = []
    for u in overrides + generated:
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result[:MAX_URLS_TO_TRY]


# ---------------------------------------------------------------------------
# Fetch helpers  (HTML + PDF-aware)
# ---------------------------------------------------------------------------

def _fetch_raw(url: str) -> tuple[bytes | None, str, str]:
    """Fetch URL, return (raw_bytes, content_type, status_note)."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        r.raise_for_status()
        ct = r.headers.get("Content-Type", "").lower()
        return r.content, ct, "ok"
    except requests.exceptions.Timeout:
        return None, "", "timeout"
    except requests.exceptions.TooManyRedirects:
        return None, "", "too_many_redirects"
    except requests.exceptions.HTTPError as e:
        return None, "", f"HTTP {e.response.status_code}"
    except Exception as e:
        return None, "", f"error:{type(e).__name__}"


def _parse_pdf(raw: bytes) -> str | None:
    """Extract all text from PDF bytes using pdfplumber. Returns None on failure."""
    if not HAS_PDFPLUMBER:
        return None
    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            parts = []
            for page in pdf.pages[:30]:   # cap at 30 pages
                t = page.extract_text()
                if t:
                    parts.append(t)
            return "\n".join(parts) if parts else None
    except Exception as e:
        log.debug(f"    PDF parse error: {e}")
        return None


def fetch_page(url: str) -> tuple[BeautifulSoup | str | None, str, str]:
    """
    Fetch one URL.  Returns:
      (BeautifulSoup, url, "ok")          for HTML pages
      (str_text,     url, "ok-pdf")       for PDFs parsed by pdfplumber
      (None,         url, error_note)     on failure
    """
    raw, ct, status = _fetch_raw(url)
    if raw is None:
        return None, url, status
    if "pdf" in ct:
        text = _parse_pdf(raw)
        if text:
            return text, url, "ok-pdf"
        return None, url, "pdf-parse-failed"
    try:
        soup = BeautifulSoup(raw, "lxml")
        return soup, url, "ok"
    except Exception as e:
        return None, url, f"parse-error:{e}"


def try_urls(urls: list[str]) -> tuple[BeautifulSoup | str | None, str, str]:
    """Try each URL in sequence; return first success. Respects RATE_LIMIT."""
    for url in urls:
        content, used_url, status = fetch_page(url)
        time.sleep(RATE_LIMIT)
        if content is not None:
            return content, used_url, status
        log.debug(f"    {status}  {url}")
    return None, "", "all_failed"


def find_pdf_links(soup: BeautifulSoup, base_url: str) -> list[str]:
    """
    Find PDF links on an HTML page that look like employment / career reports.
    """
    keywords = {"employment", "career", "salary", "report", "outcome", "recruiting"}
    results: list[str] = []
    for a in soup.find_all("a", href=True):
        href: str = a["href"]
        text_lower = a.get_text(" ", strip=True).lower()
        href_lower = href.lower()
        if href_lower.endswith(".pdf") and any(kw in href_lower or kw in text_lower for kw in keywords):
            full = urljoin(base_url, href)
            results.append(full)
    return results[:5]


# ---------------------------------------------------------------------------
# Text extraction utilities
# ---------------------------------------------------------------------------

def _as_text(content: BeautifulSoup | str) -> str:
    if isinstance(content, str):
        return content
    return content.get_text(" ", strip=True)


def _first_int(text: str, *patterns: str) -> int | None:
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "")
            try:
                return int(float(raw))
            except ValueError:
                pass
    return None


def _first_float(text: str, *patterns: str) -> float | None:
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            try:
                return round(float(m.group(1)), 1)
            except ValueError:
                pass
    return None


def extract_gmat(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"(?:average|mean|median)\s+GMAT[^0-9]{0,30}([67]\d{2})",
        r"GMAT[^\d]{0,15}([67]\d{2})",
        r"([67]\d{2})\s*(?:average|mean)?\s*GMAT",
    )
    return v if v and 550 <= v <= 800 else None


def extract_gre(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"(?:average|mean|median)\s+GRE[^0-9]{0,30}(1[0-9]{2})",
        r"GRE[^\d]{0,15}(1[0-9]{2})",
    )
    return v if v and 120 <= v <= 170 else None


def extract_class_size(content) -> int | None:
    t = _as_text(content)
    candidates: list[int] = []
    for pattern in [
        r"class\s+size\s*[:\-]?\s*([1-9]\d{1,3})\b",
        r"([1-9]\d{1,3})\s+full[- ]?time\s+(?:MBA\s+)?students",
        r"([1-9]\d{1,3})\s+students?\s+(?:enrolled|in\s+the\s+(?:class|program))",
        r"([1-9]\d{1,3})\s+MBA\s+(?:students?|candidates?)",
        r"class\s+(?:consists?|comprises?)\s+of\s+([1-9]\d{1,3})",
        r"([1-9]\d{1,3})\s+students?\s+per\s+(?:year|cohort|class)",
        r"class\s+of\s+([1-9]\d{2,3})\s+students",
    ]:
        m = re.search(pattern, t, re.IGNORECASE)
        if m:
            try:
                v = int(m.group(1).replace(",", ""))
                if 50 <= v <= 2500 and not (2010 <= v <= 2040):
                    candidates.append(v)
            except ValueError:
                pass
    return candidates[0] if candidates else None


def extract_work_exp(content) -> float | None:
    t = _as_text(content)
    v = _first_float(t,
        r"(?:average|mean|median)\s+(?:years?\s+of\s+)?work\s+experience[^0-9]{0,20}(\d+\.?\d*)\s*years?",
        r"(\d+\.?\d*)\s+years?\s+(?:of\s+)?(?:average\s+)?work\s+experience",
        r"work\s+experience[^\d]{0,15}(\d+\.?\d*)\s*years?",
        r"(\d+\.?\d*)\s+years?\s+average\s+professional\s+experience",
    )
    return v if v and 1.0 <= v <= 15.0 else None


def extract_intl_pct(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"international\s+(?:students?|citizens?)[^0-9]{0,20}([1-9]\d?)\s*%",
        r"([1-9]\d?)\s*%\s+international\s+(?:students?|citizens?)",
        r"international\s*:\s*([1-9]\d?)\s*%",
    )
    return v if v and 1 <= v <= 99 else None


def extract_tuition(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"tuition[^$\n]{0,50}\$\s*([\d,]{5,7})",
        r"\$\s*([\d,]{5,7})\s*(?:per\s+)?(?:year|annual)",
        r"annual\s+tuition[^$\n]{0,30}\$\s*([\d,]{5,7})",
    )
    return v if v and 5000 <= v <= 200000 else None


def extract_avg_salary(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"(?:average|mean|median)\s+(?:base\s+)?salary[^$\n]{0,50}\$\s*([\d,]{5,7})",
        r"\$\s*([\d,]{5,7})\s*(?:average|mean|median)\s+(?:base\s+)?salary",
        r"base\s+salary[^$\n]{0,30}\$\s*([\d,]{5,7})",
        r"median\s+compensation[^$\n]{0,30}\$\s*([\d,]{5,7})",
    )
    return v if v and 50000 <= v <= 500000 else None


def extract_signing_bonus(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"(?:median|average|mean)\s+signing\s+bonus[^$\n]{0,50}\$\s*([\d,]{4,7})",
        r"signing\s+bonus[^$\n]{0,40}\$\s*([\d,]{4,7})",
    )
    return v if v and 1000 <= v <= 200000 else None


def extract_employment_rate(content) -> int | None:
    t = _as_text(content)
    v = _first_int(t,
        r"([89]\d|100)\s*%\s*(?:of\s+(?:students|graduates|the\s+class)|employed|received)",
        r"(?:employed|offers?)[^0-9]{0,30}([89]\d|100)\s*%",
        r"employment\s+rate[^0-9]{0,20}([89]\d|100)\s*%",
        r"([89]\d|100)\s*%\s*(?:were\s+)?(?:employed|had\s+(?:an?\s+)?(?:job\s+)?offer)",
    )
    return v if v and 50 <= v <= 100 else None


# ---------------------------------------------------------------------------
# Core scraper
# ---------------------------------------------------------------------------

# Which classProfile / cost / employment fields are tracked as "key"
# (used for freshness scoring)
KEY_FIELDS = [
    ("classProfile", "avgGMAT"),
    ("classProfile", "size"),
    ("classProfile", "avgWorkExperience"),
    ("classProfile", "internationalStudentPct"),
    ("costs", "annualTuition"),
    ("employment", "avgStartingSalary"),
    ("employment", "medianSigningBonus"),
    ("employment", "employmentRate3Months"),
]

_EXTRACTORS = {
    ("classProfile", "avgGMAT"):              extract_gmat,
    ("classProfile", "avgGRE"):               extract_gre,
    ("classProfile", "size"):                 extract_class_size,
    ("classProfile", "avgWorkExperience"):    extract_work_exp,
    ("classProfile", "internationalStudentPct"): extract_intl_pct,
    ("costs", "annualTuition"):               extract_tuition,
    ("employment", "avgStartingSalary"):      extract_avg_salary,
    ("employment", "medianSigningBonus"):     extract_signing_bonus,
    ("employment", "employmentRate3Months"):  extract_employment_rate,
}


def scrape_school(school_id: str) -> dict:
    seed = SEED[school_id]
    log.info(f"[{school_id}] starting ...")

    # Build the mutable result (deep-copy of seed's nested dicts)
    result: dict = {
        "id": school_id,
        "name": seed["name"],
        "university": seed["university"],
        "tier": seed["tier"],
        "location": dict(seed["location"]),
        "classProfile": dict(seed["classProfile"]),
        "costs": dict(seed["costs"]),
        "employment": dict(seed["employment"]),
        "academicStrengths": list(seed["academicStrengths"]),
        "culture": list(seed["culture"]),
        "programUrl": seed["programUrl"],
    }

    # Per-field source tracking   field_key -> source_url
    _field_sources: dict[str, str] = {}
    _urls_used: list[str] = []
    _notes: list[str] = []
    live_updates = 0

    def _try_extract_all(content: BeautifulSoup | str, source_url: str):
        """Run every extractor against content; update result if we get a value."""
        nonlocal live_updates
        for (section, field), extractor in _EXTRACTORS.items():
            try:
                val = extractor(content)
            except Exception:
                continue
            if val is not None:
                old = result[section][field]
                if old != val:
                    result[section][field] = val
                    _field_sources[f"{section}.{field}"] = source_url
                    log.info(f"  [{school_id}] {section}.{field}: {old!r} -> {val!r}  (from {source_url})")
                    live_updates += 1
                elif f"{section}.{field}" not in _field_sources:
                    # confirmed same as seed by live data
                    _field_sources[f"{section}.{field}"] = source_url

    # ---- Profile page -------------------------------------------------------
    profile_urls = _candidate_urls(school_id, "profile")
    profile_content, profile_url_used, profile_status = try_urls(profile_urls)
    log.info(f"  [{school_id}] profile -> {profile_status}  {profile_url_used or 'no url succeeded'}")
    if profile_content is not None:
        _urls_used.append(profile_url_used)
        _try_extract_all(profile_content, profile_url_used)
        # Save raw HTML for debugging
        if isinstance(profile_content, BeautifulSoup):
            raw_path = RAW_DIR / f"{school_id}_profile.html"
            raw_path.write_text(profile_content.prettify()[:500_000], encoding="utf-8", errors="replace")
        # Look for PDF employment links embedded in the profile page
        if isinstance(profile_content, BeautifulSoup):
            pdf_links = find_pdf_links(profile_content, profile_url_used)
            if pdf_links:
                log.info(f"  [{school_id}] found {len(pdf_links)} PDF link(s) on profile page")
                for pdf_url in pdf_links[:2]:
                    pdf_content, pdf_used, pdf_status = fetch_page(pdf_url)
                    time.sleep(RATE_LIMIT)
                    if pdf_content is not None:
                        log.info(f"  [{school_id}] PDF -> {pdf_status}  {pdf_url}")
                        _urls_used.append(pdf_used)
                        _try_extract_all(pdf_content, pdf_used)
                        _notes.append(f"PDF parsed: {pdf_used}")
    else:
        _notes.append(f"Profile page unavailable ({profile_status}); using seed data.")

    # ---- Employment page ----------------------------------------------------
    emp_urls = _candidate_urls(school_id, "employment")
    emp_content, emp_url_used, emp_status = try_urls(emp_urls)
    log.info(f"  [{school_id}] employment -> {emp_status}  {emp_url_used or 'no url succeeded'}")
    if emp_content is not None:
        _urls_used.append(emp_url_used)
        _try_extract_all(emp_content, emp_url_used)
        if isinstance(emp_content, BeautifulSoup):
            raw_path = RAW_DIR / f"{school_id}_employment.html"
            raw_path.write_text(emp_content.prettify()[:500_000], encoding="utf-8", errors="replace")
            # Look for PDF links on the employment page itself
            pdf_links = find_pdf_links(emp_content, emp_url_used)
            for pdf_url in pdf_links[:2]:
                pdf_content, pdf_used, pdf_status_inner = fetch_page(pdf_url)
                time.sleep(RATE_LIMIT)
                if pdf_content is not None:
                    log.info(f"  [{school_id}] employment PDF -> {pdf_status_inner}  {pdf_url}")
                    _urls_used.append(pdf_used)
                    _try_extract_all(pdf_content, pdf_used)
                    _notes.append(f"Employment PDF parsed: {pdf_used}")
    else:
        _notes.append(f"Employment page unavailable ({emp_status}); using seed data.")

    # ---- Inline source attribution ------------------------------------------
    # Add <field>Source and <field>LastVerified next to each tracked field
    for section in ("classProfile", "costs", "employment"):
        for field in list(result[section].keys()):
            fk = f"{section}.{field}"
            src = _field_sources.get(fk)
            result[section][f"{field}Source"] = src
            result[section][f"{field}LastVerified"] = TODAY if src else None

    # ---- Freshness score ----------------------------------------------------
    live_key_count = sum(
        1 for (sec, fld) in KEY_FIELDS
        if _field_sources.get(f"{sec}.{fld}") is not None
    )
    total_key = len(KEY_FIELDS)
    if live_key_count >= max(1, total_key // 2):
        freshness = "live"
    elif live_key_count >= 1:
        freshness = "partial"
    elif profile_status == "all_failed" and emp_status == "all_failed":
        freshness = "manual_review_needed"
    else:
        freshness = "fallback"

    # ---- dataMetadata -------------------------------------------------------
    result["dataMetadata"] = {
        "collectionDate": NOW_ISO,
        "dataFreshness": freshness,
        "lastVerified": NOW_ISO,
        "sources": list(dict.fromkeys(_urls_used)),   # deduplicated, order-preserved
        "profileFetchStatus": profile_status,
        "employmentFetchStatus": emp_status,
        "liveFieldUpdates": live_updates,
        "notes": "  |  ".join(_notes) if _notes else "All available pages fetched successfully.",
    }

    log.info(
        f"  [{school_id}] done | freshness={freshness}  live_updates={live_updates}  "
        f"key_live={live_key_count}/{total_key}"
    )
    return result


# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------

def save(schools: list[dict], path: Path = OUTPUT_FILE):
    live   = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "live")
    partial = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "partial")
    fallback = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "fallback")
    review = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "manual_review_needed")

    payload = {
        "schools": schools,
        "metadata": {
            "collectionDate": NOW_ISO,
            "totalSchools": len(schools),
            "dataSource": "Official school websites (live scrape + PDF) and curated seed data",
            "dataQualitySummary": {
                "live": live,
                "partial": partial,
                "fallback": fallback,
                "manual_review_needed": review,
            },
            "notes": (
                "Each school has a dataMetadata block showing freshness and source URLs. "
                "classProfile / costs / employment fields include <field>Source and "
                "<field>LastVerified attributes for provenance tracking."
            ),
        },
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"Saved {len(schools)} schools -> {path}")


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def write_report(schools: list[dict]):
    header = (
        "MBA Schools Data Collection Report\n"
        f"Generated  : {NOW_ISO}\n"
        f"Schools    : {len(schools)}\n"
        + "=" * 80 + "\n"
    )
    col_h = (
        f"{'#':<3} {'School':<45} {'Tier':<8} {'Fresh':<8} "
        f"{'GMAT':>4}  {'Size':>5}  {'Salary':>8}  {'LiveDelta':>9}"
    )
    rows = [header, col_h, "-" * 80]
    for i, s in enumerate(schools, 1):
        meta = s.get("dataMetadata", {})
        cp = s.get("classProfile", {})
        emp = s.get("employment", {})
        rows.append(
            f"{i:<3} {s['name']:<45} {s.get('tier',''):<8} "
            f"{meta.get('dataFreshness','?'):<8} "
            f"{str(cp.get('avgGMAT') or 'N/A'):>4}  "
            f"{str(cp.get('size') or 'N/A'):>5}  "
            f"${str(emp.get('avgStartingSalary') or 'N/A'):>7}  "
            f"{str(meta.get('liveFieldUpdates', 0)):>9}"
        )
    # Summary
    live_n    = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "live")
    partial_n = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "partial")
    fallback_n = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "fallback")
    review_n  = sum(1 for s in schools if s.get("dataMetadata", {}).get("dataFreshness") == "manual_review_needed")
    rows += [
        "-" * 80,
        f"Freshness summary:  live={live_n}  partial={partial_n}  fallback={fallback_n}  manual_review_needed={review_n}",
        "",
        "Freshness definitions:",
        "  live    = >=50% of key numeric fields confirmed/updated by live scraping",
        "  partial = 1-49% of key fields live-scraped",
        "  fallback= pages fetched but no numeric fields extracted; seed data used",
        "  manual_review_needed = could not access any pages",
        "",
        "Schools needing manual review:",
    ]
    for s in schools:
        f = s.get("dataMetadata", {}).get("dataFreshness", "")
        if f in ("fallback", "manual_review_needed"):
            rows.append(f"  - {s['name']} ({f})")

    REPORT_FILE.write_text("\n".join(rows), encoding="utf-8")
    log.info(f"Report -> {REPORT_FILE}")


# ---------------------------------------------------------------------------
# Console summary
# ---------------------------------------------------------------------------

def print_school_summary(s: dict):
    meta = s.get("dataMetadata", {})
    cp = s["classProfile"]
    emp = s["employment"]
    c = s["costs"]
    freshness = meta.get("dataFreshness", "?")
    live_n = meta.get("liveFieldUpdates", 0)
    SEP = "-" * 64
    freshness_label = {
        "live": "[LIVE]", "partial": "[PARTIAL]",
        "fallback": "[FALLBACK]", "manual_review_needed": "[NEEDS REVIEW]",
    }.get(freshness, f"[{freshness}]")

    print(f"\n{SEP}")
    print(f"  {s['name']}  {freshness_label}  (live delta: {live_n} fields)")
    print(f"  {s['university']} - {s['location']['city']}, {s['location']['state']}")
    print(SEP)

    def _fmt_field(label, val, source):
        src_note = f"  <- {source}" if source else "  <- seed"
        formatted = f"${val:,}" if isinstance(val, int) and "salary" in label.lower() else str(val) if val is not None else "N/A"
        return f"  {label:<22}: {formatted}{src_note}"

    print(_fmt_field("Class size", cp.get("size"), cp.get("sizeSource")))
    print(_fmt_field("Avg GMAT", cp.get("avgGMAT"), cp.get("avgGMATSource")))
    print(_fmt_field("Avg GRE", cp.get("avgGRE"), cp.get("avgGRESource")))
    print(_fmt_field("Work exp (yrs)", cp.get("avgWorkExperience"), cp.get("avgWorkExperienceSource")))
    print(_fmt_field("International %", f"{cp['internationalStudentPct']}%" if cp.get("internationalStudentPct") else None, cp.get("internationalStudentPctSource")))
    print(_fmt_field("Annual tuition", c.get("annualTuition"), c.get("annualTuitionSource")))
    print(_fmt_field("Avg salary", emp.get("avgStartingSalary"), emp.get("avgStartingSalarySource")))
    print(_fmt_field("Signing bonus", emp.get("medianSigningBonus"), emp.get("medianSigningBonusSource")))
    print(_fmt_field("Employment rate", f"{emp['employmentRate3Months']}%" if emp.get("employmentRate3Months") else None, emp.get("employmentRate3MonthsSource")))

    print(f"  {'Top industries':<22}: {', '.join(emp.get('top3Industries', []))}")
    print(f"  {'Top companies':<22}: {', '.join(emp.get('top5Companies', []))}")

    if meta.get("sources"):
        print(f"  {'Sources used':<22}:")
        for src in meta["sources"]:
            print(f"    - {src}")
    if meta.get("notes") and "successfully" not in meta.get("notes", ""):
        print(f"  {'Notes':<22}: {meta['notes']}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="MBA School Data Scraper (Enhanced v2)")
    parser.add_argument("--ids", nargs="+", metavar="ID", help="Specific school IDs")
    parser.add_argument("--batch", type=int, choices=range(1, 6), metavar="1-5",
                        help="Batch number (10 schools each)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print URL candidates, make no HTTP requests")
    args = parser.parse_args()

    if args.ids:
        target_ids = [i for i in args.ids if i in SEED]
        unknown = [i for i in args.ids if i not in SEED]
        if unknown:
            log.warning(f"Unknown IDs (skipped): {unknown}")
    elif args.batch:
        start = (args.batch - 1) * 10
        target_ids = ALL_IDS[start:start + 10]
    else:
        target_ids = list(ALL_IDS)

    log.info(f"Target: {len(target_ids)} schools  dry_run={args.dry_run}  pdfplumber={HAS_PDFPLUMBER}")

    if args.dry_run:
        for sid in target_ids:
            seed = SEED[sid]
            print(f"\n{sid}  ({seed['name']})")
            for page_type in ("profile", "employment"):
                print(f"  {page_type}:")
                for u in _candidate_urls(sid, page_type):
                    print(f"    {u}")
        return

    results: list[dict] = []
    for sid in target_ids:
        r = scrape_school(sid)
        results.append(r)
        print_school_summary(r)
        save(results)       # incremental save after each school

    write_report(results)
    print(f"\nDone -- {len(results)} schools processed.")
    print(f"  Data   : {OUTPUT_FILE}")
    print(f"  Report : {REPORT_FILE}")


if __name__ == "__main__":
    main()

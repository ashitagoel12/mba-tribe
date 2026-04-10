// ---------------------------------------------------------------------------
// Dropdown options and reference data used across the app
// ---------------------------------------------------------------------------

export const REGIONS = [
  { value: 'north-america', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia', label: 'Asia' },
  { value: 'latin-america', label: 'Latin America' },
  { value: 'middle-east-africa', label: 'Middle East / Africa' },
  { value: 'other', label: 'Other' },
]

export const INDUSTRIES = [
  { value: 'consulting', label: 'Consulting' },
  { value: 'finance', label: 'Finance / Banking' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'energy', label: 'Energy' },
  { value: 'consumer-goods', label: 'Consumer Goods' },
  { value: 'nonprofit', label: 'Non-profit / Government' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'other', label: 'Other' },
]

export const FUNCTIONS = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing-sales', label: 'Marketing / Sales' },
  { value: 'finance-accounting', label: 'Finance / Accounting' },
  { value: 'engineering-product', label: 'Engineering / Product' },
  { value: 'general-management', label: 'General Management' },
  { value: 'other', label: 'Other' },
]

export const POST_MBA_GOALS = [
  { value: 'consulting', label: 'Management Consulting' },
  { value: 'finance', label: 'Investment Banking / PE / VC' },
  { value: 'tech', label: 'Tech / Product Management' },
  { value: 'entrepreneurship', label: 'Entrepreneurship / Startup' },
  { value: 'general-management', label: 'General Management / Leadership' },
  { value: 'social-impact', label: 'Social Impact / Non-profit' },
  { value: 'healthcare', label: 'Healthcare Management' },
  { value: 'career-switch', label: 'Career Switch (open)' },
  { value: 'other', label: 'Other' },
]

export const TARGET_GEOGRAPHIES = [
  { value: 'northeast', label: 'Northeast US (NYC / Boston)' },
  { value: 'west-coast', label: 'West Coast (SF / LA / Seattle)' },
  { value: 'midwest', label: 'Midwest (Chicago)' },
  { value: 'south-southwest', label: 'South / Southwest (Texas / Atlanta / DC)' },
  { value: 'flexible', label: 'Flexible / Open' },
  { value: 'outside-us', label: 'Outside the US' },
]

export const PRIORITIES = [
  { key: 'prestige', label: 'Academic prestige & brand recognition' },
  { key: 'industryPlacement', label: 'Strong placement in my target industry' },
  { key: 'locationLifestyle', label: 'Location & city lifestyle' },
  { key: 'affordability', label: 'Affordability / low debt burden' },
  { key: 'scholarship', label: 'Scholarship potential' },
  { key: 'internationalSupport', label: 'Support for international students' },
  { key: 'collaborativeCulture', label: 'Collaborative, non-cutthroat culture' },
]

export const BUDGET_SENSITIVITY_OPTIONS = [
  { value: 'not-concern', label: 'Cost is not a concern' },
  { value: 'matters-somewhat', label: 'Cost matters somewhat' },
  { value: 'major-factor', label: 'Cost is a major factor' },
]

export const SCHOLARSHIP_OPTIONS = [
  { value: 'nice-to-have', label: 'Nice to have' },
  { value: 'important', label: 'Important' },
  { value: 'deal-breaker', label: 'Deal-breaker if none available' },
]

// ---------------------------------------------------------------------------
// School tier reference sets (by ID in the JSON dataset)
// ---------------------------------------------------------------------------

// Traditional M7 programs
export const M7_IDS = new Set([
  'harvard-hbs',
  'stanford-gsb',
  'wharton-penn',
  'booth-chicago',
  'kellogg-northwestern',
  'sloan-mit',
  'columbia-cbs',
])

// T8–T15 programs (approximate; used for prestige scoring)
export const T15_IDS = new Set([
  'tuck-dartmouth',
  'yale-som',
  'haas-berkeley',
  'ross-michigan',
  'darden-virginia',
  'fuqua-duke',
  'nyu-stern',
  'anderson-ucla',
  'tepper-cmu',
  'cornell-johnson',
  'marshall-usc',
])

// ---------------------------------------------------------------------------
// Geography mapping: US state abbreviation → target geography bucket
// Update this when adding schools in new states.
// ---------------------------------------------------------------------------
export const STATE_TO_GEO = {
  // Northeast US
  MA: 'northeast',
  NY: 'northeast',
  CT: 'northeast',
  NH: 'northeast',
  PA: 'northeast',
  // West Coast
  CA: 'west-coast',
  WA: 'west-coast',
  UT: 'west-coast',   // Provo/SLC — closest Western cluster
  // Midwest
  IL: 'midwest',
  MI: 'midwest',
  IN: 'midwest',
  OH: 'midwest',
  WI: 'midwest',
  MN: 'midwest',     // Minneapolis
  // South / Southwest
  TX: 'south-southwest',
  NC: 'south-southwest',
  GA: 'south-southwest',
  VA: 'south-southwest',
  DC: 'south-southwest',
  TN: 'south-southwest',  // Nashville
  MD: 'south-southwest',  // DC metro (College Park)
  AZ: 'south-southwest',  // Tempe / Phoenix
}

// ---------------------------------------------------------------------------
// Keywords mapping post-MBA goal → industry/strength strings to match against
// ---------------------------------------------------------------------------
export const GOAL_TO_INDUSTRY_KW = {
  consulting: ['Consulting'],
  finance: ['Finance', 'Investment Banking', 'Private Equity'],
  tech: ['Technology', 'Tech'],
  entrepreneurship: ['Entrepreneurship', 'Startup'],
  'general-management': ['General Management', 'Management'],
  'social-impact': ['Non-profit', 'Social Impact', 'Social Enterprise'],
  healthcare: ['Healthcare', 'Health'],
  'career-switch': [],
  other: [],
}

export const GOAL_TO_STRENGTH_KW = {
  consulting: ['Consulting', 'Strategy', 'General Management'],
  finance: ['Finance', 'Investment Banking', 'Private Equity', 'Asset Management', 'FinTech'],
  tech: ['Technology', 'Technology & Innovation', 'AI/Machine Learning', 'Technology Management'],
  entrepreneurship: ['Entrepreneurship', 'Social Entrepreneurship'],
  'general-management': ['General Management', 'Leadership', 'Strategy'],
  'social-impact': ['Social Enterprise', 'Social Innovation', 'Non-profit Management', 'Sustainable Enterprise', 'Sustainability'],
  healthcare: ['Healthcare', 'Healthcare Management', 'Health'],
  'career-switch': [],
  other: [],
}

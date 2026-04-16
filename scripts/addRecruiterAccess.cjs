/**
 * One-time migration: add recruiterAccess to every school in data/mba_schools_data.json
 */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'data', 'mba_schools_data.json')

const SPECIFIED = {
  'harvard-hbs': {
    'investment-banking': 'target', 'consulting': 'target', 'technology': 'target',
    'private-equity': 'target', 'healthcare': 'target', 'social-impact': 'core',
    'entrepreneurship': 'target', 'general-management': 'target',
  },
  'stanford-gsb': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'target',
    'private-equity': 'core', 'healthcare': 'core', 'social-impact': 'target',
    'entrepreneurship': 'target', 'general-management': 'target',
  },
  'wharton-penn': {
    'investment-banking': 'target', 'consulting': 'target', 'technology': 'core',
    'private-equity': 'target', 'healthcare': 'target', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'target',
  },
  'booth-chicago': {
    'investment-banking': 'target', 'consulting': 'target', 'technology': 'core',
    'private-equity': 'target', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'target',
  },
  'kellogg-northwestern': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'core',
    'private-equity': 'broad', 'healthcare': 'core', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'target',
  },
  'sloan-mit': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'target',
    'private-equity': 'broad', 'healthcare': 'core', 'social-impact': 'core',
    'entrepreneurship': 'target', 'general-management': 'core',
  },
  'columbia-cbs': {
    'investment-banking': 'target', 'consulting': 'target', 'technology': 'core',
    'private-equity': 'target', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'core',
  },
  'tuck-dartmouth': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'broad',
    'private-equity': 'broad', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'core',
  },
  'yale-som': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'broad',
    'private-equity': 'broad', 'healthcare': 'core', 'social-impact': 'target',
    'entrepreneurship': 'broad', 'general-management': 'core',
  },
  'haas-berkeley': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'target',
    'private-equity': 'broad', 'healthcare': 'broad', 'social-impact': 'core',
    'entrepreneurship': 'target', 'general-management': 'core',
  },
  'ross-michigan': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'core',
    'private-equity': 'broad', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'core',
  },
  'darden-virginia': {
    'investment-banking': 'core', 'consulting': 'target', 'technology': 'broad',
    'private-equity': 'broad', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'core',
  },
  'fuqua-duke': {
    'investment-banking': 'broad', 'consulting': 'target', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'target', 'social-impact': 'core',
    'entrepreneurship': 'core', 'general-management': 'core',
  },
  'cornell-johnson': {
    'investment-banking': 'core', 'consulting': 'core', 'technology': 'broad',
    'private-equity': 'broad', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'nyu-stern': {
    'investment-banking': 'target', 'consulting': 'core', 'technology': 'core',
    'private-equity': 'core', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'anderson-ucla': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'target',
    'private-equity': 'broad', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'broad',
  },
  'marshall-usc': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'core',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'broad',
  },
  'mccombs-utaustin': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'core',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'broad',
  },
  'kenan-flagler-unc': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'core', 'social-impact': 'core',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'tepper-cmu': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'target',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'goizueta-emory': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'core', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'mcdonough-georgetown': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'core',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'kelley-indiana': {
    'investment-banking': 'broad', 'consulting': 'core', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
  'foster-uw': {
    'investment-banking': 'broad', 'consulting': 'broad', 'technology': 'target',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'broad',
  },
  'jones-rice': {
    'investment-banking': 'broad', 'consulting': 'broad', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'core', 'social-impact': 'broad',
    'entrepreneurship': 'core', 'general-management': 'broad',
  },
  'simon-rochester': {
    'investment-banking': 'broad', 'consulting': 'broad', 'technology': 'broad',
    'private-equity': 'limited', 'healthcare': 'broad', 'social-impact': 'broad',
    'entrepreneurship': 'broad', 'general-management': 'broad',
  },
}

const DEFAULT = {
  'investment-banking': 'limited',
  'consulting': 'broad',
  'technology': 'broad',
  'private-equity': 'limited',
  'healthcare': 'broad',
  'social-impact': 'broad',
  'entrepreneurship': 'broad',
  'general-management': 'broad',
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))

data.schools = data.schools.map(school => {
  const recruiterAccess = SPECIFIED[school.id] || DEFAULT
  return { ...school, recruiterAccess }
})

// Update metadata
if (data.metadata) data.metadata.totalSchools = 100

fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8')
console.log(`Done. Updated ${data.schools.length} schools.`)
console.log('Spot-check:')
const spot = ['harvard-hbs', 'stanford-gsb', 'nyu-stern', 'vanderbilt-owen']
spot.forEach(id => {
  const s = data.schools.find(s => s.id === id)
  if (s) console.log(`  ${id}: consulting=${s.recruiterAccess.consulting}, ib=${s.recruiterAccess['investment-banking']}`)
})

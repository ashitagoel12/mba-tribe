/**
 * One-time migration: add campusType and stemOpt to every school in mba_schools_data.json
 */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'data', 'mba_schools_data.json')

// Exact values for the 26 specified schools
const SPECIFIED = {
  'harvard-hbs':          { campusType: 'campus-town', stemOpt: false },
  'stanford-gsb':         { campusType: 'campus-town', stemOpt: false },
  'wharton-penn':         { campusType: 'campus-town', stemOpt: true  },
  'booth-chicago':        { campusType: 'urban',        stemOpt: true  },
  'kellogg-northwestern': { campusType: 'campus-town', stemOpt: true  },
  'sloan-mit':            { campusType: 'campus-town', stemOpt: true  },
  'columbia-cbs':         { campusType: 'urban',        stemOpt: true  },
  'tuck-dartmouth':       { campusType: 'campus-town', stemOpt: false },
  'yale-som':             { campusType: 'campus-town', stemOpt: true  },
  'haas-berkeley':        { campusType: 'urban',        stemOpt: true  },
  'ross-michigan':        { campusType: 'campus-town', stemOpt: true  },
  'darden-virginia':      { campusType: 'campus-town', stemOpt: false },
  'fuqua-duke':           { campusType: 'campus-town', stemOpt: true  },
  'cornell-johnson':      { campusType: 'campus-town', stemOpt: true  },
  'nyu-stern':            { campusType: 'urban',        stemOpt: true  },
  'anderson-ucla':        { campusType: 'urban',        stemOpt: true  },
  'marshall-usc':         { campusType: 'urban',        stemOpt: true  },
  'mccombs-utaustin':     { campusType: 'urban',        stemOpt: true  },
  'kenan-flagler-unc':    { campusType: 'campus-town', stemOpt: true  },
  'tepper-cmu':           { campusType: 'campus-town', stemOpt: true  },
  'goizueta-emory':       { campusType: 'campus-town', stemOpt: true  },
  'mcdonough-georgetown': { campusType: 'urban',        stemOpt: true  },
  'kelley-indiana':       { campusType: 'campus-town', stemOpt: true  },
  'foster-uw':            { campusType: 'urban',        stemOpt: true  },
  'jones-rice':           { campusType: 'campus-town', stemOpt: true  },
  'simon-rochester':      { campusType: 'campus-town', stemOpt: true  },
}

// Defaults for remaining 74 schools based on location/context
const DEFAULTS = {
  'vanderbilt-owen':         { campusType: 'urban',        stemOpt: true  },
  'georgia-tech-scheller':   { campusType: 'urban',        stemOpt: true  },
  'notre-dame-mendoza':      { campusType: 'campus-town', stemOpt: false },
  'ohio-state-fisher':       { campusType: 'campus-town', stemOpt: true  },
  'wisconsin':               { campusType: 'campus-town', stemOpt: true  },
  'texas-am-mays':           { campusType: 'campus-town', stemOpt: true  },
  'penn-state-smeal':        { campusType: 'campus-town', stemOpt: true  },
  'maryland-smith':          { campusType: 'campus-town', stemOpt: true  },
  'minnesota-carlson':       { campusType: 'urban',        stemOpt: true  },
  'arizona-state-carey':     { campusType: 'urban',        stemOpt: true  },
  'purdue-krannert':         { campusType: 'campus-town', stemOpt: true  },
  'michigan-state-broad':    { campusType: 'campus-town', stemOpt: true  },
  'byu-marriott':            { campusType: 'campus-town', stemOpt: false },
  'boston-university-questrom': { campusType: 'urban',    stemOpt: true  },
  'uc-davis':                { campusType: 'campus-town', stemOpt: true  },
  'uci-merage':              { campusType: 'campus-town', stemOpt: true  },
  'boston-college-carroll':  { campusType: 'campus-town', stemOpt: false },
  'pittsburgh-katz':         { campusType: 'urban',        stemOpt: true  },
  'smu-cox':                 { campusType: 'urban',        stemOpt: true  },
  'babson-olin':             { campusType: 'campus-town', stemOpt: false },
  'thunderbird':             { campusType: 'urban',        stemOpt: false },
  'wake-forest':             { campusType: 'campus-town', stemOpt: false },
  'william-mary-mason':      { campusType: 'campus-town', stemOpt: false },
  'ucsd-rady':               { campusType: 'urban',        stemOpt: true  },
  'ut-dallas-jindal':        { campusType: 'urban',        stemOpt: true  },
  'georgia-terry':           { campusType: 'campus-town', stemOpt: true  },
  'washu-olin':              { campusType: 'urban',        stemOpt: true  },
  'iowa-state-ivy':          { campusType: 'campus-town', stemOpt: true  },
  'miami-herbert':           { campusType: 'urban',        stemOpt: true  },
  'utah-eccles':             { campusType: 'urban',        stemOpt: true  },
  'tennessee-haslam':        { campusType: 'campus-town', stemOpt: true  },
  'american-kogod':          { campusType: 'urban',        stemOpt: false },
  'arkansas-walton':         { campusType: 'campus-town', stemOpt: false },
  'kansas':                  { campusType: 'campus-town', stemOpt: false },
  'chapman-argyros':         { campusType: 'campus-town', stemOpt: false },
  'tulane-freeman':          { campusType: 'urban',        stemOpt: false },
  'alabama-manderson':       { campusType: 'campus-town', stemOpt: false },
  'kentucky-gatton':         { campusType: 'campus-town', stemOpt: false },
  'south-carolina-moore':    { campusType: 'campus-town', stemOpt: true  },
  'fordham-gabelli':         { campusType: 'urban',        stemOpt: false },
  'oklahoma-state-spears':   { campusType: 'campus-town', stemOpt: false },
  'tcu-neeley':              { campusType: 'urban',        stemOpt: false },
  'rutgers':                 { campusType: 'urban',        stemOpt: true  },
  'syracuse-whitman':        { campusType: 'campus-town', stemOpt: true  },
  'northeastern-damore-mckim': { campusType: 'urban',     stemOpt: true  },
  'baylor-hankamer':         { campusType: 'campus-town', stemOpt: false },
  'pepperdine-graziadio':    { campusType: 'urban',        stemOpt: false },
  'george-washington':       { campusType: 'urban',        stemOpt: false },
  'drexel-lebow':            { campusType: 'urban',        stemOpt: true  },
  'villanova':               { campusType: 'campus-town', stemOpt: false },
  'case-western-weatherhead': { campusType: 'urban',      stemOpt: true  },
  'uconn':                   { campusType: 'campus-town', stemOpt: true  },
  'temple-fox':              { campusType: 'urban',        stemOpt: true  },
  'lehigh':                  { campusType: 'campus-town', stemOpt: true  },
  'colorado-leeds':          { campusType: 'campus-town', stemOpt: true  },
  'arizona-eller':           { campusType: 'campus-town', stemOpt: true  },
  'baruch-zicklin':          { campusType: 'urban',        stemOpt: false },
  'nc-at-deese':             { campusType: 'campus-town', stemOpt: true  },
  'stevens-business':        { campusType: 'urban',        stemOpt: true  },
  'auburn-harbert':          { campusType: 'campus-town', stemOpt: true  },
  'lsu-ourso':               { campusType: 'campus-town', stemOpt: false },
  'binghamton-som':          { campusType: 'campus-town', stemOpt: true  },
  'charleston-mba':          { campusType: 'urban',        stemOpt: false },
  'oklahoma-price':          { campusType: 'campus-town', stemOpt: false },
  'oregon-lundquist':        { campusType: 'campus-town', stemOpt: true  },
  'mississippi':             { campusType: 'campus-town', stemOpt: false },
  'cincinnati-lindner':      { campusType: 'urban',        stemOpt: true  },
  'buffalo-suny':            { campusType: 'urban',        stemOpt: true  },
  'canisius-wehle':          { campusType: 'urban',        stemOpt: false },
  'loyola-maryland-sellinger': { campusType: 'urban',     stemOpt: false },
  'detroit-mercy':           { campusType: 'urban',        stemOpt: false },
  'bentley-mccallum':        { campusType: 'campus-town', stemOpt: true  },
  'clemson':                 { campusType: 'campus-town', stemOpt: true  },
  'claremont-drucker':       { campusType: 'campus-town', stemOpt: false },
}

const ALL = { ...SPECIFIED, ...DEFAULTS }

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'))
let updated = 0
let missing = []

data.schools = data.schools.map(school => {
  const fields = ALL[school.id]
  if (!fields) {
    missing.push(school.id)
    // Fallback defaults for any school not in our map
    return { ...school, campusType: 'campus-town', stemOpt: false }
  }
  updated++
  return { ...school, campusType: fields.campusType, stemOpt: fields.stemOpt }
})

fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8')
console.log(`Updated ${updated} schools.`)
if (missing.length) console.log('Used fallback for:', missing)
else console.log('All schools covered.')

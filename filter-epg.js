const fs = require('fs')
const zlib = require('zlib')

// Exact channel IDs to keep (from iptv-epg.org)
const KEEP_IDS = new Set([
  // National cable
  'AccuWeather.us', 'Accuweather.us', 'NewsmaxTV.us', 'ACCNetwork.us',
  'BBCNewsNorthAmerica.us', 'BigTen.us', 'BigTen2.us', 'BigTen4.us',
  'FoxEast_WNYW.us', 'FoxNewsChannel.us', 'FoxSports1.us',
  'NewsNation.us', 'NFLNetwork.us', 'SmithsonianNetwork.us',
  'NickJr.us', 'ComedyCentral.us',
  'OANPlus.us', 'OANPlus.pluto',
  // Local affiliates
  'ABCKOMO.us', 'ABCKMGH.us', 'ABCWFTV.us', 'ABCKNXV.us',
  'CBSKCCI.us', 'CBSWPEC.us', 'CBSKEYE.us', 'CBSWFOR.us',
  'NBCWJAR.us', 'NBCWest_KNBC.us', 'NBCKNBC.us',
  // Syndicated
  'MacGyver.synd', 'AmericanNinjaWarrior.synd',
])

// Broad keyword matching for discovery (fallback)
const KEYWORDS = [
  'AccuWeather', 'Newsmax', 'ACC Network', 'BBC News', 'Big Ten',
  'FOX East', 'Fox News', 'Fox Sports', 'FS1', 'NewsNation',
  'NFL Network', 'Smithsonian', 'Nick Jr', 'Comedy Central',
  'OAN', 'One America News',
  'KOMO', 'KMGH', 'WFTV', 'KNXV', 'KCCI', 'WPEC', 'KEYE', 'WFOR', 'WJAR', 'KNBC',
  'MacGyver', 'American Ninja Warrior',
]

function matchesChannel(id, name) {
  if (KEEP_IDS.has(id)) return true
  // Fallback: keyword match but exclude false positives
  const upper = name.toUpperCase()
  if (upper.includes('HAWKEYE') || upper.includes('BUCKEYES') || upper.includes('KOKOMO')) return false
  if (upper.includes('PLUTO') || upper.includes('SXM')) return false
  if (upper.includes('ROANOKE') || upper.includes('LYNCHBURG')) return false
  if (upper.includes('4K EVENTS')) return false
  if (upper.includes('ANTENNA')) return false
  return KEYWORDS.some(k => upper.includes(k.toUpperCase()))
}

const INPUT = process.argv[2] || 'epg-us.xml.gz'
const OUTPUT = process.argv[3] || 'guide.xml'

const gz = fs.readFileSync(INPUT)
const xml = zlib.gunzipSync(gz).toString('utf8')

// Parse channels first
const channelRegex = /<channel\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/g
const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g
const displayRegex = /<display-name[^>]*>([^<]+)<\/display-name>/g

let channelIds = new Set()
let channelXml = []
let programmeXml = []

let chMatch
while ((chMatch = channelRegex.exec(xml)) !== null) {
  const chId = chMatch[1]
  const chBody = chMatch[2]
  let dispMatch
  let isMatch = false
  while ((dispMatch = displayRegex.exec(chBody)) !== null) {
    if (matchesChannel(chId, dispMatch[1].trim())) {
      isMatch = true
      break
    }
  }
  if (isMatch) {
    channelIds.add(chId)
    channelXml.push(chMatch[0])
  }
}

let prMatch
while ((prMatch = programmeRegex.exec(xml)) !== null) {
  const attrs = prMatch[1]
  const chMatch2 = attrs.match(/channel="([^"]*)"/)
  if (chMatch2 && channelIds.has(chMatch2[1])) {
    programmeXml.push(prMatch[0])
  }
}

const result = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n' +
  channelXml.join('\n') + '\n' +
  programmeXml.join('\n') + '\n</tv>'

fs.writeFileSync(OUTPUT, result)
const stats = fs.statSync(OUTPUT)
console.log(`Filtered: ${channelIds.size} channels, ${programmeXml.length} programmes, ${(stats.size / 1024).toFixed(0)}KB`)
console.log(`Channel IDs: ${[...channelIds].slice(0, 10).join(', ')}${channelIds.size > 10 ? '...' : ''}`)

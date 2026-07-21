const fs = require('fs')
const zlib = require('zlib')

// Exact channel IDs — one per channel, no duplicates
const KEEP_IDS = new Set([
  'Accuweather.us',
  'NewsmaxTV.us',
  'ACCNetwork.us',
  'BBCNewsNorthAmerica.us',
  'BigTen.us',
  'FoxEast_WNYW.us',
  'FoxNewsChannel.us',
  'FoxSports1.us',
  'NewsNation.us',
  'NFLNetwork.us',
  'SmithsonianNetwork.us',
  'NickJr.us',
  'ComedyCentral.us',
  'OANPlus.us',
  'ABCKOMO.us',
  'ABCKMGH.us',
  'ABCWFTV.us',
  'ABCKNXV.us',
  'CBSKCCI.us',
  'CBSWPEC.us',
  'CBSKEYE.us',
  'CBSWFOR.us',
  'NBCWJAR.us',
  'NBCKNBC.us',
])

const INPUT = process.argv[2] || 'epg-us.xml.gz'
const OUTPUT = process.argv[3] || 'guide.xml'

const gz = fs.readFileSync(INPUT)
const xml = zlib.gunzipSync(gz).toString('utf8')

const channelRegex = /<channel\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/g
const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g

let channelIds = new Set()
let channelXml = []
let programmeXml = []

let chMatch
while ((chMatch = channelRegex.exec(xml)) !== null) {
  const chId = chMatch[1]
  if (KEEP_IDS.has(chId)) {
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
console.log(`IDs: ${[...channelIds].join(', ')}`)

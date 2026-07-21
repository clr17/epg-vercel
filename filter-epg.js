const fs = require('fs')
const zlib = require('zlib')

// Map: iptv-epg.org channel ID → playlist tvg-id
const ID_MAP = {
  'Accuweather.us': 'AccuWeatherNOW.us@SD',
  'NewsmaxTV.us': 'NewsmaxTV.us@SD',
  'ACCNetwork.us': 'ACCNetwork.us@SD',
  'BBCNewsNorthAmerica.us': 'BBCNews.uk@NorthAmerica',
  'BigTen.us': 'BigTen.us@SD',
  'FoxEast_WNYW.us': 'WNYW51.us@HD',
  'FoxNewsChannel.us': 'FoxNewsChannel.us@SD',
  'FoxSports1.us': 'FoxSports1.us@HD',
  'NewsNation.us': 'NewsNation.us@SD',
  'NFLNetwork.us': 'NFLNetwork.us@SD',
  'SmithsonianNetwork.us': 'SmithsonianChannel.us@East',
  'NickJr.us': 'NickJr.us@East',
  'ComedyCentral.us': 'ComedyCentral.us@East',
  'OANPlus.us': 'OANPlus.us@SD',
  'ABCWCVB.us': 'WCVBTV501.us@SD',
  'ABCKMGH.us': 'KMGHTV71.us@HD',
  'ABCWFTV.us': 'WFTV91.us@HD',
  'CBSKCCI.us': 'KCCI81.us@HD',
  'CBSWPEC.us': 'WPEC121.us@HD',
  'CBSKEYE.us': 'KEYETV421.us@HD',
  'NBCWJAR.us': 'WJAR101.us@HD',
  'FOXWeather.us': 'FoxWeather.us@SD',
  'WeatherNationTV.us': 'WeatherNation.us@SD',
  'Newsmax2.us': 'Newsmax2.us@SD',
  'ScrippsNews.us': 'ScrippsNews.us@SD',
  'AlJazeera.us': 'AlJazeera.qa@English',
  'LiveNOWfromFOX.us': 'LiveNOWfromFOX.us@SD',
  'FOXNet.us': 'Fox.us@East',
  'RTNews.us': 'RT.ru@HD',
  'ESPN.us': 'ESPN.us@HD',
  'ESPNU.us': 'ESPNU.us@SD',
  'ESPNEWS.us': 'ESPNews.us@SD',
}

const KEEP_IDS = new Set(Object.keys(ID_MAP))

const INPUT = process.argv[2] || 'epg-us.xml.gz'
const OUTPUT = process.argv[3] || 'guide.xml'

const gz = fs.readFileSync(INPUT)
const xml = zlib.gunzipSync(gz).toString('utf8')

const channelRegex = /<channel\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/channel>/g
const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g

let channelIds = new Map()
let channelXml = []
let programmeXml = []

let chMatch
while ((chMatch = channelRegex.exec(xml)) !== null) {
  const chId = chMatch[1]
  if (KEEP_IDS.has(chId)) {
    const newId = ID_MAP[chId]
    channelIds.set(chId, newId)
    channelXml.push(chMatch[0].replace(`id="${chId}"`, `id="${newId}"`))
  }
}

let prMatch
while ((prMatch = programmeRegex.exec(xml)) !== null) {
  const attrs = prMatch[1]
  const chMatch2 = attrs.match(/channel="([^"]*)"/)
  if (chMatch2 && channelIds.has(chMatch2[1])) {
    const newId = channelIds.get(chMatch2[1])
    programmeXml.push(prMatch[0].replace(`channel="${chMatch2[1]}"`, `channel="${newId}"`))
  }
}

const result = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n' +
  channelXml.join('\n') + '\n' +
  programmeXml.join('\n') + '\n</tv>'

fs.writeFileSync(OUTPUT, result)
const stats = fs.statSync(OUTPUT)
console.log(`Filtered: ${channelIds.size} channels, ${programmeXml.length} programmes, ${(stats.size / 1024).toFixed(0)}KB`)
console.log(`IDs remapped: ${[...channelIds].map(([old,id]) => `${old} → ${id}`).join(', ')}`)

const fs = require('fs')
const zlib = require('zlib')

// Map: iptv-epg.org channel ID → playlist tvg-id
const ID_MAP = {
  'Accuweather.us': 'AccuWeatherNOW.us@SD',
  'NewsmaxTV.us': 'NewsmaxTV.us@SD',
  'ACCNetwork.us': 'ACCNetwork.us@SD',
  'BBCNewsNorthAmerica.us': 'BBCNews.uk@NorthAmerica',
  'BigTen.us': 'BigTen.us@SD',
  'FoxNewsChannel.us': 'FoxNewsChannel.us@SD',
  'FoxSports1.us': 'FoxSports1.us@HD',
  'NewsNation.us': 'NewsNation.us@SD',
  'NFLNetwork.us': 'NFLNetwork.us@SD',
  'SmithsonianNetwork.us': 'SmithsonianChannel.us@East',
  'NickJr.us': 'NickJr.us@East',
  'ComedyCentral.us': 'ComedyCentral.us@East',
  'OANPlus.us': 'OANPlus.us@SD',

  'FOXWeather.us': 'FoxWeather.us@SD',
  'WeatherNationTV.us': 'WeatherNation.us@SD',
  'TheWeatherChannel.us': 'TheWeatherChannel.us@SD',
  'Newsmax2.us': 'Newsmax2.us@SD',
  'ScrippsNews.us': 'ScrippsNews.us@SD',
  'AlJazeera.us': 'AlJazeera.qa@English',
  'LiveNOWfromFOX.us': 'LiveNOWfromFOX.us@SD',
  'FOXNet.us': 'Fox.us@East',
  'RTNews.us': 'RT.ru@HD',
  'ESPN.us': 'ESPN.us@HD',
  'ESPNU.us': 'ESPNU.us@SD',
  'ESPNEWS.us': 'ESPNews.us@SD',

  // FOX locals
  'FOXWTTG.us': 'WTTG51.us@HD',
  'FOXKTTV.us': 'KTTV111.us@HD',
  'FOXKTVU.us': 'KTVU41.us@HD',
  'FOXWLUK.us': 'WLUKTV141.us@HD',
  'FOXWTVT.us': 'WTVT131.us@HD',
  // NBC locals
  'NBCWNBC.us': 'WNBC471.us@HD',
  'NBCKNSD.us': 'KNSD481.us@HD',
  'NBCKSNV.us': 'KSNV31.us@HD',
  'NBCWBTS.us': 'WBTSCD151.us@HD',
  // CBS locals
  'CBSWCBS.us': 'WCBSTV21.us@HD',
  'CBSKUTV.us': 'KUTV21.us@HD',
  'CBSWWMT.us': 'WWMT31.us@HD',
  'CBSKMTV.us': 'KMTVTV31.us@HD',
  'CBSKDBC.us': 'KDBCTV41.us@HD',
  'CBSWTVR.us': 'WTVRTV61.us@HD',
  // ABC locals
  'ABCKATU.us': 'KATU321.us@HD',
  'ABCKSTP.us': 'KSTPTV51.us@HD',
  'ABCWSYX.us': 'WSYX61.us@HD',
  'ABCWRTV.us': 'WRTV61.us@HD',
  'ABCKOAT.us': 'KOATTV71.us@HD',
  'ABCWJLA.us': 'WJLATV71.us@HD',
  'ABCWMUR.us': 'WMURTV91.us@HD',
  'ABCKGUN.us': 'KGUNTV91.us@HD',
  'ABCKGTV.us': 'KGTV101.us@HD',
  'ABCWISN.us': 'WISNTV121.us@HD',
  'ABCWLOS.us': 'WLOS131.us@HD',
  'ABCKTNV.us': 'KTNVTV331.us@HD',
  'ABCKNXV.us': 'KNXVTV611.us@HD',
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

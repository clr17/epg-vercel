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

  // Original8 locals (from tvpassport.com, now using iptv-epg.org)
  'FoxEast_WNYW.us': 'WNYW51.us@HD',
  'ABCWCVB.us': 'WCVBTV501.us@SD',
  'ABCKMGH.us': 'KMGHTV71.us@HD',
  'ABCWFTV.us': 'WFTV91.us@HD',
  'CBSKCCI.us': 'KCCI81.us@HD',
  'CBSWPEC.us': 'WPEC121.us@HD',
  'CBSKEYE.us': 'KEYETV421.us@HD',
  'NBCKCRA.us': 'KCRATV581.us@HD',

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

// Timezone offsets relative to Eastern (EDT, UTC-4)
// Channels not listed default to Eastern (no adjustment)
// Values: hours to SUBTRACT from UTC to get Eastern display time
const TZ_MAP = {
  // Pacific (UTC-7): subtract 4h to get Eastern equivalent
  'KCRATV581.us@HD': -4,  // Sacramento
  'KATU321.us@HD': -4,    // Portland OR
  'KGTV101.us@HD': -4,    // San Diego
  'KTVU41.us@HD': -4,     // SF/Oakland
  'KTTV111.us@HD': -4,    // LA
  'KNSD481.us@HD': -4,    // San Diego
  'KSNV31.us@HD': -4,     // Las Vegas
  'KTNVTV331.us@HD': -4,  // Las Vegas
  // Mountain (UTC-6): subtract 3h to get Eastern equivalent
  'KOATTV71.us@HD': -3,   // Albuquerque
  'KMGHTV71.us@HD': -3,   // Denver
  'KDBCTV41.us@HD': -3,   // El Paso
  'KUTV21.us@HD': -3,     // Salt Lake City
  'KGUNTV91.us@HD': -3,   // Tucson
  // Central (UTC-5): subtract 2h to get Eastern equivalent
  'KSTPTV51.us@HD': -2,   // St Paul MN
  'KCCI81.us@HD': -2,     // Des Moines
  'KEYETV421.us@HD': -2,  // Austin
  'WLUKTV141.us@HD': -2,  // Green Bay
  'WWMT31.us@HD': -2,     // Kalamazoo
  'KMTVTV31.us@HD': -2,   // Omaha
  'WISNTV121.us@HD': -2,  // Milwaukee
  // Eastern (UTC-4): no adjustment
  'WNYW51.us@HD': 0,      // NYC
  'WNBC471.us@HD': 0,     // NYC
  'WCBSTV21.us@HD': 0,    // NYC
  'WTTG51.us@HD': 0,      // DC
  'WTVT131.us@HD': 0,     // Tampa
  'WBTSCD151.us@HD': 0,   // Boston
  'WCVBTV501.us@SD': 0,   // Boston
  'WFTV91.us@HD': 0,      // Orlando
  'WPEC121.us@HD': 0,     // West Palm Beach
  'WJLATV71.us@HD': 0,    // DC
  'WMURTV91.us@HD': 0,    // Manchester NH
  'WRTV61.us@HD': 0,      // Indianapolis
  'WSYX61.us@HD': 0,      // Columbus OH
  'WLOS131.us@HD': 0,     // Asheville NC
  'WTVRTV61.us@HD': 0,    // Richmond VA
}

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
    const tzOffset = TZ_MAP[newId] || 0
    
    let progXml = prMatch[0].replace(`channel="${chMatch2[1]}"`, `channel="${newId}"`)
    
    // Adjust timezone if needed
    if (tzOffset !== 0) {
      progXml = progXml.replace(/(start|stop)="(\d{14})\s+[+-]\d{4}"/g, (match, attr, ts) => {
        // Parse timestamp: YYYYMMDDHHmmss
        const y = parseInt(ts.slice(0,4))
        const m = parseInt(ts.slice(4,6)) - 1
        const d = parseInt(ts.slice(6,8))
        const h = parseInt(ts.slice(8,10))
        const mi = parseInt(ts.slice(10,12))
        const s = parseInt(ts.slice(12,14))
        
        const dt = new Date(Date.UTC(y, m, d, h, mi, s))
        dt.setUTCHours(dt.getUTCHours() + tzOffset)
        
        // Format back to YYYYMMDDHHmmss
        const pad = n => String(n).padStart(2, '0')
        const newTs = dt.getUTCFullYear() +
          pad(dt.getUTCMonth() + 1) +
          pad(dt.getUTCDate()) +
          pad(dt.getUTCHours()) +
          pad(dt.getUTCMinutes()) +
          pad(dt.getUTCSeconds())
        
        return `${attr}="${newTs} -0400"`
      })
    }
    
    programmeXml.push(progXml)
  }
}

const result = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n' +
  channelXml.join('\n') + '\n' +
  programmeXml.join('\n') + '\n</tv>'

fs.writeFileSync(OUTPUT, result)
const stats = fs.statSync(OUTPUT)
console.log(`Filtered: ${channelIds.size} channels, ${programmeXml.length} programmes, ${(stats.size / 1024).toFixed(0)}KB`)
console.log(`IDs remapped: ${[...channelIds].map(([old,id]) => `${old} → ${id}`).join(', ')}`)

const fs = require('fs')
const zlib = require('zlib')
const sax = require('sax')

const CHANNELS = [
  // National cable
  'AccuWeather', 'Newsmax TV', 'NewsMax TV', 'ACC Network',
  'BBC News', 'BBC World News', 'Big Ten Network',
  'FOX East', 'FOX (WNYW)', 'Fox News', 'Fox News Channel',
  'Fox Sports 1', 'FS1', 'NewsNation',
  'NFL Network', 'Smithsonian', 'Nick Jr', 'Nick Jr.',
  'Comedy Central', 'One America News', 'OAN',
  // Local affiliates
  'KOMO', 'KMGH', 'WFTV', 'KNXV',
  'KCCI', 'WPEC', 'KEYE', 'WFOR', 'WJAR', 'KNBC',
  // Syndicated
  'MacGyver', 'American Ninja Warrior',
]

function matchesChannel(name) {
  const upper = name.toUpperCase()
  return CHANNELS.some(ch => upper.includes(ch.toUpperCase()))
}

const INPUT = process.argv[2] || 'epg-us.xml.gz'
const OUTPUT = process.argv[3] || 'guide.xml'

const gz = fs.readFileSync(INPUT)
const xml = zlib.gunzipSync(gz).toString('utf8')

const parser = sax.createStream(true, { trim: true })
const output = []
let keepChannel = false
let keepProgramme = false
let depth = 0
let channelIds = new Set()

output.push('<?xml version="1.0" encoding="UTF-8"?>\n<tv>')

parser.on('opentag', node => {
  depth++
  const name = node.name.toLowerCase()

  if (name === 'channel') {
    keepChannel = false
    output.push(`<channel id="${node.attributes.id || node.attributes.ID}">`)
  } else if (name === 'display-name' && depth <= 3) {
    // capture for matching
  } else if (name === 'programme') {
    const ch = node.attributes.channel
    keepProgramme = channelIds.has(ch)
    if (keepProgramme) {
      const attrs = Object.entries(node.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      output.push(`<programme ${attrs}>`)
    }
  } else if (keepChannel || keepProgramme) {
    const attrs = Object.entries(node.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    output.push(`<${node.name}${attrs ? ' ' + attrs : ''}>`)
  }
})

let textBuffer = ''

parser.on('text', text => {
  textBuffer += text
})

parser.on('cdata', text => {
  textBuffer += text
})

parser.on('closetag', nameRaw => {
  const name = nameRaw.toLowerCase()

  if (name === 'display-name' && depth <= 3 && textBuffer.trim()) {
    if (matchesChannel(textBuffer.trim())) {
      keepChannel = true
    }
  }

  if (name === 'channel') {
    if (keepChannel) {
      const idMatch = output[output.length - 1] ? null : null
      // Get the channel ID from the opening tag
      for (let i = output.length - 1; i >= 0; i--) {
        const m = output[i].match(/<channel id="([^"]+)"/)
        if (m) {
          channelIds.add(m[1])
          break
        }
      }
      output.push(`</channel>`)
    } else {
      // Remove the opening tag
      for (let i = output.length - 1; i >= 0; i--) {
        if (output[i].startsWith('<channel ')) {
          output.splice(i)
          break
        }
      }
    }
    keepChannel = false
  } else if (name === 'programme') {
    if (keepProgramme) {
      output.push(`</programme>`)
    }
    keepProgramme = false
  } else if (keepChannel || keepProgramme) {
    output.push(`</${nameRaw}>`)
  }

  textBuffer = ''
  depth--
})

parser.on('end', () => {
  output.push('\n</tv>')
  const result = output.join('\n')
  fs.writeFileSync(OUTPUT, result)
  const stats = fs.statSync(OUTPUT)
  console.log(`Filtered: ${channelIds.size} channels, ${(stats.size / 1024).toFixed(0)}KB`)
  console.log(`Channel IDs: ${[...channelIds].join(', ')}`)
})

parser.write(xml)
parser.end()

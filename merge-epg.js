const fs = require('fs')

const national = fs.readFileSync('national.xml', 'utf8')
const local = fs.readFileSync('local.xml', 'utf8')

function extract(xml, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>|<${tag}\\b[^>]*/>`, 'g')
  return xml.match(re) || []
}

const nationalChannels = extract(national, 'channel')
const localChannels = extract(local, 'channel')
const nationalProgrammes = extract(national, 'programme')
const localProgrammes = extract(local, 'programme')

// Deduplicate channels: prefer local (tvpassport) over national (iptv-epg.org)
const seenIds = new Set()
const channels = []
for (const ch of [...localChannels, ...nationalChannels]) {
  const idMatch = ch.match(/id="([^"]*)"/)
  if (idMatch && !seenIds.has(idMatch[1])) {
    seenIds.add(idMatch[1])
    channels.push(ch)
  }
}

// Deduplicate programmes by channel+start+stop
const seenProg = new Set()
const programmes = []
for (const pr of [...localProgrammes, ...nationalProgrammes]) {
  const key = pr.match(/start="([^"]*)"/)?.[1] + '|' + pr.match(/stop="([^"]*)"/)?.[1] + '|' + pr.match(/channel="([^"]*)"/)?.[1]
  if (key && !seenProg.has(key)) {
    seenProg.add(key)
    programmes.push(pr)
  }
}

const result = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n' +
  channels.join('\n') + '\n' +
  programmes.join('\n') + '\n</tv>'

fs.writeFileSync('public/guide.xml', result)
const stats = fs.statSync('public/guide.xml')
console.log(`Merged: ${channels.length} channels, ${programmes.length} programmes, ${(stats.size / 1024).toFixed(0)}KB`)

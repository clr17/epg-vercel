const fs = require('fs')

const national = fs.readFileSync('national.xml', 'utf8')
const local = fs.readFileSync('local.xml', 'utf8')

function extract(xml, tag) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>|<${tag}\\b[^>]*/>`, 'g')
  return xml.match(re) || []
}

const channels = [...extract(national, 'channel'), ...extract(local, 'channel')]
const programmes = [...extract(national, 'programme'), ...extract(local, 'programme')]

const result = '<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n' +
  channels.join('\n') + '\n' +
  programmes.join('\n') + '\n</tv>'

fs.writeFileSync('public/guide.xml', result)
const stats = fs.statSync('public/guide.xml')
console.log(`Merged: ${channels.length} channels, ${programmes.length} programmes, ${(stats.size / 1024).toFixed(0)}KB`)

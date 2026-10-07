// Скачивание ответов: один файл под его настоящим именем или все файлы задания одним .zip.

const MIME = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  xml: 'application/xml',
  xsd: 'application/xml',
  xsl: 'application/xml',
  xslt: 'application/xml',
  dtd: 'application/xml-dtd',
  sql: 'application/sql',
  json: 'application/json',
}

// Блокнот и Visual Studio на Windows уверенно узнают UTF-8 (кириллицу) только с BOM
const WITH_BOM = new Set(['cs', 'txt'])

const extOf = (name) => {
  const m = name.match(/\.([^.]+)$/)
  return m ? m[1].toLowerCase() : ''
}

function fileBytes(name, text) {
  const body = new TextEncoder().encode(text)
  if (!WITH_BOM.has(extOf(name))) return body
  const out = new Uint8Array(body.length + 3)
  out.set([0xef, 0xbb, 0xbf])
  out.set(body, 3)
  return out
}

function save(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export function downloadFile(name, text) {
  const type = `${MIME[extOf(name)] || 'text/plain'};charset=utf-8`
  save(new Blob([fileBytes(name, text)], { type }), name)
}

export function downloadZip(zipName, files) {
  save(makeZip(files.map((f) => ({ name: f.name, data: fileBytes(f.name, f.code) }))), zipName)
}

// «КТ: DTD — «Использование DTD»» → «КТ DTD — «Использование DTD».zip» (без символов, запрещённых в Windows)
export function archiveName(title) {
  return `${title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.zip`
}

// ---------- минимальный ZIP без сжатия (store) ----------
let crcTable = null

function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function makeZip(entries) {
  const now = new Date()
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const UTF8_NAMES = 0x0800
  const parts = []
  const central = []
  let offset = 0

  for (const { name, data } of entries) {
    const nameBytes = new TextEncoder().encode(name)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // сигнатура локального заголовка
    local.setUint16(4, 20, true) // версия для распаковки
    local.setUint16(6, UTF8_NAMES, true)
    local.setUint16(8, 0, true) // без сжатия
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true) // сигнатура записи центрального каталога
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, UTF8_NAMES, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, date, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), nameBytes)

    offset += 30 + nameBytes.length + data.length
  }

  const centralSize = central.reduce((sum, b) => sum + b.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true) // конец центрального каталога
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' })
}

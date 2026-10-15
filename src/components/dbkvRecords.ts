export const dbkvFormats = ['int64', 'bool', 'float64', 'json_str', 'string'] as const

export type DBKVFormat = typeof dbkvFormats[number]

export interface DBKVRecord {
  id: number
  key: string
  format: DBKVFormat
  value: string
  description: string
  visible: boolean
}

export function filterDBKVRecords(records: DBKVRecord[], search: string): DBKVRecord[] {
  const query = search.trim().toLowerCase()
  if (!query) return records
  return records.filter(record => record.key.toLowerCase().includes(query) || record.value.toLowerCase().includes(query))
}

export function isValidDBKVKey(value: string): boolean {
  const key = value.trim()
  return key.length > 0 && Array.from(key).length <= 191 && key.toLowerCase() !== '__last_updated__'
}

export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function isValidDBKVValue(format: DBKVFormat, value: string): boolean {
  if (format === 'string') return true
  if (format === 'json_str') return isValidJSON(value)
  if (value.trim() !== value) return false
  switch (format) {
    case 'int64': {
      if (!/^[+-]?[0-9]+$/.test(value)) return false
      const integer = BigInt(value)
      return integer >= BigInt('-9223372036854775808') && integer <= BigInt('9223372036854775807')
    }
    case 'bool':
      return value === 'true' || value === 'false'
    case 'float64':
      return /^[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(value) && Number.isFinite(Number(value))
    default:
      return false
  }
}
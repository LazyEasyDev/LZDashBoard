export interface DBKVRecord {
  id: number
  key: string
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
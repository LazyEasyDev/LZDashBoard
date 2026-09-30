import { describe, expect, it, vi } from 'vitest'
import { filterDBKVRecords, isValidDBKVKey, isValidJSON } from '../src/components/dbkvRecords'
import type { DBKVRecord } from '../src/components/dbkvRecords'

const records: DBKVRecord[] = [
  { id: 1, key: 'site.name', value: '"LZApp"', description: 'Product title', visible: true },
  { id: 2, key: 'feature.flags', value: '{"enabled":true}', description: 'Feature settings', visible: true },
  { id: 3, key: 'max.connections', value: '120', description: 'Connection cap', visible: true }
]

describe('DBKV local search', () => {
  it.each([
    ['', [1, 2, 3]],
    ['   ', [1, 2, 3]],
    ['NAME', [1]],
    [' lzAPP ', [1]],
    ['enabled', [2]],
    ['TRUE', [2]],
    ['20', [3]],
    ['Product title', []],
    ['missing', []]
  ])('filters keys and values for %j', (query, ids) => {
    expect(filterDBKVRecords(records, query).map(record => record.id)).toEqual(ids)
  })

  it('never fetches or changes the source records while typing', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const original = JSON.stringify(records)
    for (const query of ['s', 'si', 'sit', 'site', '']) filterDBKVRecords(records, query)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(JSON.stringify(records)).toBe(original)
  })
})

describe('DBKV creation key validation', () => {
  it.each(['setting', ' New.Setting ', 'a'.repeat(191), String.fromCodePoint(0x1f511).repeat(191)])('accepts key %j', key => {
    expect(isValidDBKVKey(key)).toBe(true)
  })

  it.each(['', '  ', '__last_updated__', ' __LAST_UPDATED__ ', 'a'.repeat(192), String.fromCodePoint(0x1f511).repeat(192)])('rejects key %j', key => {
    expect(isValidDBKVKey(key)).toBe(false)
  })
})

describe('DBKV JSON validation', () => {
  it.each(['{}', '[]', 'null', 'true', 'false', '42', '"text"', ' {"large":9007199254740993} ', '[1,true,null]'])('accepts JSON %j without rewriting it', value => {
    expect(isValidJSON(value)).toBe(true)
  })

  it.each(['', ' ', 'undefined', 'NaN', 'text', '{', '{"enabled":true,}', 'null false', '01'])('rejects invalid JSON %j', value => {
    expect(isValidJSON(value)).toBe(false)
  })
})
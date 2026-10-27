import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  RARITY_COUNTS,
  RARITY_ORDER,
  filterAndSortCharacters,
  getCharacter,
  getUnlockLabel,
  isCharacterId,
  isCharacterUnlocked,
  readEquippedCharacter,
  type Character,
} from '../characters'

describe('character registry', () => {
  it('ships exactly 50 complete and uniquely addressable character records', () => {
    expect(CHARACTERS).toHaveLength(50)
    expect(new Set(CHARACTERS.map((character) => character.id)).size).toBe(50)
    expect(new Set(CHARACTERS.map((character) => character.name)).size).toBe(50)
    expect(new Set(CHARACTERS.map((character) => character.image)).size).toBe(50)
    expect(CHARACTERS.map((character) => character.catalogNumber)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    )
    for (const character of CHARACTERS) {
      expect(character.id).toMatch(/^[a-z][a-z0-9-]+$/)
      expect(character.name.length).toBeGreaterThan(1)
      expect(character.nameEn.length).toBeGreaterThan(2)
      expect(character.title.length).toBeGreaterThan(2)
      expect(character.alt).toContain(character.name)
      expect(character.story.length).toBeGreaterThan(12)
      expect(character.image).toMatch(/^\/assets\//)
      expect(character.unlockAt % 20).toBe(0)
    }
  })

  it('matches the deliberate E through SSS distribution exactly', () => {
    const actual = Object.fromEntries(RARITY_ORDER.map((rarity) => [
      rarity,
      CHARACTERS.filter((character) => character.rarity === rarity).length,
    ]))
    expect(actual).toEqual(RARITY_COUNTS)
  })

  it('preserves all three legacy IDs and starter compatibility', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('tideglow')
    expect(getCharacter('tideglow')?.unlockAt).toBe(0)
    expect(getCharacter('cloudsail')?.unlockAt).toBe(100)
    expect(getCharacter('coralflare')?.unlockAt).toBe(220)
    expect(isCharacterId('tideglow')).toBe(true)
    expect(isCharacterId('astraltide')).toBe(true)
    expect(isCharacterId('unknown-companion')).toBe(false)
    expect(readEquippedCharacter('unknown-companion')).toBe(DEFAULT_CHARACTER_ID)
    expect(readEquippedCharacter(null)).toBe(DEFAULT_CHARACTER_ID)
  })

  it('publishes every referenced artwork with a content-matching immutable version', () => {
    for (const character of CHARACTERS) {
      const url = new URL(character.image, 'https://star-tide.test')
      const relativePath = url.pathname.replace(/^\//, '')
      const publishedPath = join(process.cwd(), 'public', relativePath)
      expect(existsSync(publishedPath), `${character.id} artwork is missing`).toBe(true)

      const actualHash = createHash('sha256').update(readFileSync(publishedPath)).digest('hex')
      expect(url.searchParams.get('v'), `${character.id} needs a content version`).toBe(actualHash.slice(0, 12))

      if (relativePath.startsWith('assets/companions/')) {
        const smallPath = publishedPath.replace(/\.webp$/, '-320.webp')
        expect(existsSync(smallPath), `${character.id} 320px artwork is missing`).toBe(true)
      }
    }
  })

  it('explains deterministic lesson unlocks without chance mechanics', () => {
    const target = getCharacter('pebblefin')!
    expect(isCharacterUnlocked(target, { masteryPoints: 39 })).toBe(false)
    expect(isCharacterUnlocked(target, { masteryPoints: 40 })).toBe(true)
    expect(getUnlockLabel(target, 0)).toContain('再完成 2 題')
    expect(getUnlockLabel(target, 40)).toBe('已解鎖')
  })

  it('filters and sorts without coupling the renderer to a 50-item ceiling', () => {
    const unlocked = filterAndSortCharacters(CHARACTERS, { status: 'unlocked', points: 100 })
    expect(unlocked.map((character) => character.id)).toEqual(['tideglow', 'pebblefin', 'foamferret', 'cloudsail'])

    const grade = filterAndSortCharacters(CHARACTERS, { rarity: 'SS', sort: 'name', points: 0 })
    expect(grade).toHaveLength(3)
    expect(grade.every((character) => character.rarity === 'SS')).toBe(true)

    const expanded = Array.from({ length: 201 }, (_, index) => ({
      ...CHARACTERS[index % CHARACTERS.length],
      id: `future-${index}`,
      catalogNumber: index + 1,
      name: `未來夥伴 ${index}`,
    })) satisfies Character[]
    expect(filterAndSortCharacters(expanded, { points: 0 })).toHaveLength(201)
    expect(filterAndSortCharacters(expanded, { query: '未來夥伴 200', points: 0 })).toHaveLength(1)
  })
})

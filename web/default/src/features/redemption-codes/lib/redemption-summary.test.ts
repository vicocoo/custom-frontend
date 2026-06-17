import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  buildCreatedRedemptionCodesText,
  buildRedemptionCodesFilename,
  downloadRedemptionCodesText,
  getCreatedRedemptionCodeCount,
} from './redemption-summary.ts'

describe('redemption code summary helpers', () => {
  test('formats created redemption codes as newline-separated text', () => {
    assert.equal(
      buildCreatedRedemptionCodesText([' first-code ', '', 'second-code']),
      'first-code\nsecond-code'
    )
  })

  test('builds a safe text filename from the redemption name', () => {
    assert.equal(
      buildRedemptionCodesFilename('Summer / Promo: 2026'),
      'Summer-Promo-2026.txt'
    )
  })

  test('counts only non-empty created redemption codes', () => {
    assert.equal(getCreatedRedemptionCodeCount(['first-code', ' ', 'second-code']), 2)
  })

  test('downloads non-empty created redemption code text', () => {
    let clicked = false
    let revokedUrl = ''
    const anchor = {
      href: '',
      download: '',
      click: () => {
        clicked = true
      },
    }

    downloadRedemptionCodesText('first-code', 'codes.txt', {
      createAnchor: () => anchor,
      createObjectUrl: () => 'blob:test',
      revokeObjectUrl: (url) => {
        revokedUrl = url
      },
    })

    assert.equal(anchor.href, 'blob:test')
    assert.equal(anchor.download, 'codes.txt')
    assert.equal(clicked, true)
    assert.equal(revokedUrl, 'blob:test')
  })
})

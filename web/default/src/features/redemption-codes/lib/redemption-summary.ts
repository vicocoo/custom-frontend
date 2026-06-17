/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
const FALLBACK_REDEMPTION_CODES_FILENAME = 'redemption-codes'

type DownloadAnchor = {
  href: string
  download: string
  click: () => void
}

type TextDownloadAdapter = {
  createAnchor: () => DownloadAnchor
  createObjectUrl: (blob: Blob) => string
  revokeObjectUrl: (url: string) => void
}

export function buildCreatedRedemptionCodesText(codes: string[]): string {
  return codes.map((code) => code.trim()).filter(Boolean).join('\n')
}

export function getCreatedRedemptionCodeCount(codes: string[]): number {
  return buildCreatedRedemptionCodesText(codes).split('\n').filter(Boolean)
    .length
}

export function buildRedemptionCodesFilename(name: string): string {
  const safeName = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${safeName || FALLBACK_REDEMPTION_CODES_FILENAME}.txt`
}

export function downloadRedemptionCodesText(
  text: string,
  filename: string,
  adapter: TextDownloadAdapter = {
    createAnchor: () => document.createElement('a'),
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  }
): void {
  if (!text.trim()) return

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = adapter.createObjectUrl(blob)
  const anchor = adapter.createAnchor()
  anchor.href = url
  anchor.download = filename
  anchor.click()
  adapter.revokeObjectUrl(url)
}

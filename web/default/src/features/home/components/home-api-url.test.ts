import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  buildChatCompletionsUrl,
  getConfiguredServerAddress,
} from './home-api-url.ts'

describe('home API URL helpers', () => {
  test('builds the chat completions endpoint from ServerAddress', () => {
    assert.equal(
      buildChatCompletionsUrl('https://api.example.com'),
      'https://api.example.com/v1/chat/completions'
    )
  })

  test('does not duplicate an existing v1 suffix', () => {
    assert.equal(
      buildChatCompletionsUrl('https://api.example.com/v1/'),
      'https://api.example.com/v1/chat/completions'
    )
  })

  test('reads server_address from status data', () => {
    assert.equal(
      getConfiguredServerAddress({
        server_address: ' https://api.example.com/ ',
      }),
      'https://api.example.com'
    )
  })
})

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getConfiguredServerAddress(status: unknown) {
  const direct =
    status && typeof status === 'object'
      ? (status as { server_address?: unknown; serverAddress?: unknown })
      : null
  const nested =
    status &&
    typeof status === 'object' &&
    'data' in status &&
    typeof (status as { data?: unknown }).data === 'object'
      ? ((status as {
          data?: { server_address?: unknown; serverAddress?: unknown }
        }).data ?? null)
      : null

  const configured =
    (typeof direct?.server_address === 'string' && direct.server_address) ||
    (typeof direct?.serverAddress === 'string' && direct.serverAddress) ||
    (typeof nested?.server_address === 'string' && nested.server_address) ||
    (typeof nested?.serverAddress === 'string' && nested.serverAddress) ||
    ''

  if (configured.trim()) {
    return trimTrailingSlash(configured.trim())
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return trimTrailingSlash(window.location.origin)
  }

  return ''
}

export function buildChatCompletionsUrl(serverAddress: string) {
  const base = trimTrailingSlash(serverAddress.trim())
  if (!base) {
    return '/v1/chat/completions'
  }
  if (base.endsWith('/v1/chat/completions')) {
    return base
  }
  if (base.endsWith('/v1')) {
    return `${base}/chat/completions`
  }
  return `${base}/v1/chat/completions`
}

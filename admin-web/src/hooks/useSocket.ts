import { useEffect } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getStoredTokens } from '@/api/client'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:4000'

let shared: Socket | null = null

export function useTrackSenseSocket(onPosition?: (payload: unknown) => void) {
  useEffect(() => {
    const { accessToken } = getStoredTokens()
    if (!accessToken) return

    if (!shared) {
      shared = io(WS_URL, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
      })
    }

    const handler = (payload: unknown) => onPosition?.(payload)
    shared.on('position:update', handler)

    return () => {
      shared?.off('position:update', handler)
    }
  }, [onPosition])
}
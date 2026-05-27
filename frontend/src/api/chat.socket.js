// 채팅 WebSocket(STOMP) 클라이언트.
// - 같은 ws 연결을 여러 화면(목록/방)에서 공유하는 싱글톤
// - 토큰은 localStorage.accessToken 사용 (axios client와 동일)
// - 자동 재연결 + 가시성/오프라인 변화 대응

import { Client } from '@stomp/stompjs'
import { Capacitor } from '@capacitor/core'

let client = null
let connecting = null // Promise 캐시
const subs = new Map() // destination -> { stompSub, callbacks: Set }

/** 운영/개발/모바일 환경 별 ws URL 결정 */
function resolveSocketUrl() {
  // 1) 환경변수가 있으면 최우선
  const envUrl = import.meta.env.VITE_WS_URL
  if (envUrl) return envUrl

  // 2) Capacitor(네이티브) 앱은 운영 도메인 직결
  if (Capacitor.isNativePlatform()) {
    return 'wss://locapick.mjb.diskstation.me/ws'
  }

  // 3) 브라우저: 현재 페이지 호스트의 /ws 로 (Nginx/Vite proxy가 백엔드로 포워딩)
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}

function getToken() {
  return localStorage.getItem('accessToken') || ''
}

/** 클라이언트 인스턴스 한 번만 생성 */
function ensureClient() {
  if (client) return client

  client = new Client({
    brokerURL: resolveSocketUrl(),
    connectHeaders: { Authorization: `Bearer ${getToken()}` },
    reconnectDelay: 3000, // 3초 후 자동 재연결
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {}, // 필요 시 console.log 로 교체
  })

  // 재연결 시 최신 토큰을 다시 실어보내기
  client.beforeConnect = () => {
    client.connectHeaders = { Authorization: `Bearer ${getToken()}` }
  }

  // 끊겼다 다시 연결되면 기존 구독 모두 복원
  client.onConnect = () => {
    for (const [destination, entry] of subs.entries()) {
      entry.stompSub = client.subscribe(destination, (message) => {
        let payload
        try {
          payload = JSON.parse(message.body)
        } catch {
          payload = message.body
        }
        entry.callbacks.forEach((cb) => {
          try {
            cb(payload)
          } catch (e) {
            console.error('[chat.socket] handler error', e)
          }
        })
      })
    }
  }

  client.onStompError = (frame) => {
    console.warn('[chat.socket] STOMP error:', frame.headers['message'], frame.body)
  }

  return client
}

/** 명시적 연결 (이미 연결 중이면 같은 Promise 반환) */
export function connectChatSocket() {
  const c = ensureClient()
  if (c.connected) return Promise.resolve()
  if (connecting) return connecting

  connecting = new Promise((resolve, reject) => {
    const prevOnConnect = c.onConnect
    c.onConnect = (frame) => {
      try {
        prevOnConnect && prevOnConnect(frame)
      } finally {
        resolve()
      }
    }
    c.onWebSocketError = (e) => reject(e)
    try {
      c.activate()
    } catch (e) {
      reject(e)
    }
  }).finally(() => {
    connecting = null
  })

  return connecting
}

/**
 * destination 구독.
 * @returns unsubscribe 함수
 */
export function subscribe(destination, callback) {
  const c = ensureClient()
  let entry = subs.get(destination)
  if (!entry) {
    entry = { stompSub: null, callbacks: new Set() }
    subs.set(destination, entry)
  }
  entry.callbacks.add(callback)

  // 이미 연결되어 있으면 즉시 stomp subscribe
  if (c.connected && !entry.stompSub) {
    entry.stompSub = c.subscribe(destination, (message) => {
      let payload
      try {
        payload = JSON.parse(message.body)
      } catch {
        payload = message.body
      }
      entry.callbacks.forEach((cb) => {
        try {
          cb(payload)
        } catch (e) {
          console.error('[chat.socket] handler error', e)
        }
      })
    })
  }

  // 아직 연결 전이면 연결 후 onConnect 훅에서 자동 구독 처리됨
  if (!c.connected && !c.active) {
    connectChatSocket().catch((e) => console.warn('[chat.socket] connect failed', e))
  } else if (!c.connected && c.active) {
    // 연결 시도 중 — onConnect 콜백에서 처리됨
  }

  return () => {
    const e = subs.get(destination)
    if (!e) return
    e.callbacks.delete(callback)
    if (e.callbacks.size === 0) {
      try {
        e.stompSub && e.stompSub.unsubscribe()
      } catch {
        /* noop */
      }
      subs.delete(destination)
    }
  }
}

/**
 * 메시지 발행
 */
export function publish(destination, body) {
  const c = ensureClient()
  const send = () => {
    c.publish({
      destination,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    })
  }
  if (c.connected) {
    send()
  } else {
    connectChatSocket().then(send).catch((e) => console.warn('[chat.socket] publish failed', e))
  }
}

/** 모든 구독 해제 + 연결 종료 (로그아웃 등에서 호출) */
export function disconnectChatSocket() {
  if (!client) return
  for (const [, entry] of subs.entries()) {
    try {
      entry.stompSub && entry.stompSub.unsubscribe()
    } catch {
      /* noop */
    }
  }
  subs.clear()
  try {
    client.deactivate()
  } catch {
    /* noop */
  }
  client = null
}

// 도움 함수: destination 빌더
export const chatTopic = (roomId) => `/topic/chat.room.${roomId}`
export const chatMetaTopic = (roomId) => `/topic/chat.room.${roomId}.meta`
export const chatSendDest = (roomId) => `/app/chat.send/${roomId}`

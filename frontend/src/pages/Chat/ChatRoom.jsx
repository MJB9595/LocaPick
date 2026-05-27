import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth.store'
import {
  getChatRoom,
  getChatMessages,
  markChatRoomRead,
  openChatRoom,
  setChatAppointment,
  uploadChatImage,
  sendChatHeartbeat,
  manualArrive,
  cancelChatAppointment,
} from '../../api/chat.api'
import {
  connectChatSocket,
  subscribe,
  publish,
  chatTopic,
  chatMetaTopic,
  chatSendDest,
} from '../../api/chat.socket'
import { getCurrentPosition } from '../../api/geo'
import { getRouteByMode } from '../../api/route.api'
import PlacePickerModal from './PlacePickerModal'
import './ChatRoom.scss'

/**
 * 1:1 채팅방.
 *
 * 메시지 타입:
 *  - TEXT / IMAGE / PLACE / ETA
 *  - 시스템: APPOINTMENT_SET / ARRIVED / APPOINTMENT_DONE / APPOINTMENT_CANCELED
 *
 * 약속이 활성화된 동안 클라이언트가 15초 주기로 heartbeat 를 보내고,
 * 서버가 100m 임계 안이면 자동으로 도착 처리한다.
 */
const ETA_MODES = [
  { key: 'WALK', label: '도보', emoji: '🚶' },
  { key: 'CAR', label: '자동차', emoji: '🚗' },
  { key: 'TRANSIT', label: '대중교통', emoji: '🚌' },
]

const HEARTBEAT_INTERVAL_MS = 15_000

const ChatRoom = () => {
  const { roomId: roomIdParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const myId = user?.memberId

  const [roomId, setRoomId] = useState(roomIdParam !== 'new' ? roomIdParam : null)
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)

  const [plusOpen, setPlusOpen] = useState(false)

  // 장소 모달
  const [placeModalMode, setPlaceModalMode] = useState(null)

  // ETA 다이얼로그 (이동수단 선택)
  const [etaDialog, setEtaDialog] = useState(null) // { loading, results: { mode, minutes, ok }[] }

  const messagesEndRef = useRef(null)
  const messagesScrollRef = useRef(null)
  const initialScrollDoneRef = useRef(false)
  const subRef = useRef(null)
  const metaSubRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  // ── new 진입 처리
  useEffect(() => {
    if (roomIdParam !== 'new') return
    const params = new URLSearchParams(location.search)
    const opponentId = Number(params.get('opponentId'))
    const postId = params.get('postId') ? Number(params.get('postId')) : null

    if (!opponentId) {
      Promise.resolve().then(() => {
        setError('상대 정보가 없습니다.')
        setLoading(false)
      })
      return
    }
    openChatRoom({ opponentId, postId })
      .then((r) => {
        setRoom(r)
        setRoomId(r.roomId)
        navigate(`/app/chat/${r.roomId}`, { replace: true })
      })
      .catch((e) => {
        console.error(e)
        setError(e?.response?.data?.message || '채팅방을 열 수 없어요.')
        setLoading(false)
      })
  }, [roomIdParam, location.search, navigate])

  // ── 방 정보 + 이전 메시지 로드
  useEffect(() => {
    if (!roomId) return
    let alive = true

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [r, msgs] = await Promise.all([
          getChatRoom(roomId),
          getChatMessages(roomId),
        ])
        if (!alive) return
        setRoom(r)
        setMessages(Array.isArray(msgs) ? msgs : [])
      } catch (e) {
        if (!alive) return
        console.error(e)
        setError(e?.response?.data?.message || '채팅방을 불러올 수 없어요.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()

    return () => { alive = false }
  }, [roomId])

  // ── STOMP 연결 + 토픽 구독
  useEffect(() => {
    if (!roomId) return

    let mounted = true
    connectChatSocket()
      .then(() => {
        if (!mounted) return
        setConnected(true)
        subRef.current = subscribe(chatTopic(roomId), (msg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        })
        metaSubRef.current = subscribe(chatMetaTopic(roomId), (meta) => {
          // 방이 삭제된 경우: 즉시 목록으로 이탈
          if (meta?.event === 'roomDeleted') {
            navigate('/app/chat', { replace: true })
            return
          }
          getChatRoom(roomId).then((r) => setRoom(r)).catch(() => {})
        })
      })
      .catch((e) => {
        console.warn('[ChatRoom] socket connect failed', e)
      })

    return () => {
      mounted = false
      if (subRef.current) { subRef.current(); subRef.current = null }
      if (metaSubRef.current) { metaSubRef.current(); metaSubRef.current = null }
    }
  }, [roomId, navigate])

  // ── 방 변경 시 스크롤 상태 초기화
  useEffect(() => {
    initialScrollDoneRef.current = false
  }, [roomId])

  // ── 메시지 추가될 때 자동 스크롤 + 읽음 처리.
  //   1) 처음 메시지가 로드된 직후엔 한 번만 즉시 맨 아래로 점프 (애니메이션 없음)
  //   2) 그 이후엔 사용자가 입력창 근처(120px 이내)에 있을 때만 부드럽게 따라감
  useEffect(() => {
    const container = messagesScrollRef.current
    if (!container || messages.length === 0) return

    if (!initialScrollDoneRef.current) {
      // 첫 로드 — 즉시 맨 아래
      container.scrollTop = container.scrollHeight
      initialScrollDoneRef.current = true

      // 이미지가 늦게 로드되어 컨텐츠 높이가 변할 수 있으니
      // 모든 이미지 로드 완료 후 한 번 더 정확히 맨 아래로 보정
      const imgs = Array.from(container.querySelectorAll('.image-bubble img'))
      if (imgs.length > 0) {
        let remaining = imgs.length
        const onSettled = () => {
          remaining -= 1
          if (remaining <= 0 && messagesScrollRef.current) {
            messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight
          }
        }
        imgs.forEach((img) => {
          if (img.complete) {
            onSettled()
          } else {
            img.addEventListener('load', onSettled, { once: true })
            img.addEventListener('error', onSettled, { once: true })
          }
        })
      }
    } else {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceFromBottom < 120) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      }
    }

    if (roomId) {
      markChatRoomRead(roomId).catch(() => {})
    }
  }, [messages, roomId])

  // ── 약속 활성 시 heartbeat (15초마다 위치 보고)
  const hasAppointment = !!(
    room?.appointmentPlaceName &&
    room?.appointmentLat &&
    room?.appointmentLng &&
    !room?.appointmentEndedAt
  )
  const myArrived = !!room?.myArrivedAt
  const oppArrived = !!room?.opponentArrivedAt

  useEffect(() => {
    if (!roomId || !hasAppointment || myArrived) return

    let timer = null
    let cancelled = false

    const tick = async () => {
      try {
        const pos = await getCurrentPosition({ timeout: 8000 })
        if (cancelled) return
        await sendChatHeartbeat(roomId, {
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.accuracy ?? null,
        })
      } catch (e) {
        // 권한 거부/실패는 조용히 무시 (수동 도착 버튼이 있음)
        console.debug('[ChatRoom] heartbeat skip', e?.message)
      }
    }

    tick() // 즉시 한 번
    timer = setInterval(tick, HEARTBEAT_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [roomId, hasAppointment, myArrived])

  // ── 텍스트 전송
  const handleSend = useCallback(
    (e) => {
      e?.preventDefault?.()
      const text = inputText.trim()
      if (!text || !roomId) return
      publish(chatSendDest(roomId), { type: 'TEXT', content: text })
      setInputText('')
      inputRef.current?.focus()
    },
    [inputText, roomId]
  )

  // ── 사진
  const handleClickPhoto = () => {
    setPlusOpen(false)
    fileRef.current?.click()
  }
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !roomId) return
    if (!file.type?.startsWith('image/')) return alert('이미지 파일만 업로드 가능해요.')
    if (file.size > 5 * 1024 * 1024) return alert('5MB 이하의 이미지만 가능해요.')
    try {
      const res = await uploadChatImage(file)
      publish(chatSendDest(roomId), { type: 'IMAGE', imageUrl: res.url })
    } catch (err) {
      console.error(err)
      alert('사진 업로드에 실패했어요.')
    }
  }

  // ── 약속 잡기
  const handleOpenAppointment = () => {
    setPlusOpen(false)
    setPlaceModalMode('appointment')
  }
  const handleSubmitAppointment = async ({ placeName, placeAddress, lat, lng }) => {
    setPlaceModalMode(null)
    if (!roomId) return
    try {
      await setChatAppointment(roomId, { placeName, placeAddress, lat, lng })
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || '약속 설정에 실패했어요.')
    }
  }

  // ── 도착시간 다이얼로그 열기 (이동수단 선택)
  const handleOpenETA = useCallback(async () => {
    setPlusOpen(false)
    if (!roomId) return
    if (!hasAppointment) {
      alert('먼저 약속 장소를 정해주세요.')
      return
    }
    setEtaDialog({ loading: true, results: [] })
    try {
      const me = await getCurrentPosition()
      const start = { lat: me.lat, lng: me.lng }
      const end = { lat: room.appointmentLat, lng: room.appointmentLng }

      const modesResults = await Promise.all(
        ETA_MODES.map(async (m) => {
          const r = await getRouteByMode(start, end, m.key)
          if (!r) return { mode: m.key, ok: false, minutes: null }
          return { mode: m.key, ok: true, minutes: Math.max(0, Math.round((r.time || 0) / 60)) }
        })
      )
      setEtaDialog({ loading: false, results: modesResults })
    } catch (e) {
      console.error(e)
      setEtaDialog(null)
      alert('도착 시간을 계산할 수 없어요. 위치 권한을 확인해 주세요.')
    }
  }, [roomId, hasAppointment, room])

  const handleSendETA = (mode, minutes) => {
    if (!roomId || minutes == null) return
    publish(chatSendDest(roomId), { type: 'ETA', etaMinutes: minutes, etaMode: mode })
    setEtaDialog(null)
  }

  // ── 수동 도착
  const handleManualArrive = useCallback(async () => {
    setPlusOpen(false)
    if (!roomId) return
    if (myArrived) return alert('이미 도착으로 표시되어 있어요.')
    if (!window.confirm('지금 약속 장소에 도착했다고 알릴까요?')) return
    try {
      await manualArrive(roomId)
    } catch (e) {
      alert(e?.response?.data?.message || '도착 처리 실패')
    }
  }, [roomId, myArrived])

  // ── 약속 종료
  const handleCancelAppointment = useCallback(async () => {
    setPlusOpen(false)
    if (!roomId || !hasAppointment) return
    if (!window.confirm('약속을 종료할까요? 종료 후엔 헤더 공지가 사라집니다.')) return
    try {
      await cancelChatAppointment(roomId)
    } catch (e) {
      alert(e?.response?.data?.message || '종료 실패')
    }
  }, [roomId, hasAppointment])

  // ── 헤더
  const opponentName = room?.opponentName || '상대'
  const opponentInitial = (opponentName || '?').trim().charAt(0)

  return (
    <div className="chatroom-root">
      <div className="chatroom-container">
        {/* 상단 헤더 */}
        <header className="chat-header">
          <button className="back-btn" onClick={() => navigate('/app/chat')} aria-label="뒤로가기">
            ←
          </button>
          <div className="header-avatar">
            {room?.opponentProfileImageUrl ? (
              <img src={room.opponentProfileImageUrl} alt={opponentName} />
            ) : (
              <span>{opponentInitial}</span>
            )}
          </div>
          <div className="header-info">
            <h2>{opponentName}</h2>
            <span className={`conn-status ${connected ? 'on' : 'off'}`}>
              {connected ? '● 실시간 연결됨' : '○ 연결 중...'}
            </span>
          </div>
        </header>

        {/* 약속 공지 배너 */}
        {hasAppointment && (
          <div className="appointment-banner">
            <span className="ab-icon">📍</span>
            <div className="ab-text">
              <span className="ab-label">예정된 약속</span>
              <strong className="ab-place">{room.appointmentPlaceName}</strong>
              {room.appointmentPlaceAddress && (
                <span className="ab-addr">{room.appointmentPlaceAddress}</span>
              )}
              <span className="ab-status">
                {myArrived && oppArrived
                  ? '두 분 모두 도착!'
                  : myArrived
                    ? '나 도착 · 상대 이동 중'
                    : oppArrived
                      ? '상대 도착 · 내가 이동 중'
                      : '둘 다 이동 중'}
              </span>
            </div>
            <div className="ab-actions">
              <button
                type="button"
                className="ab-btn primary"
                onClick={handleOpenETA}
                title="이동수단별 도착시간 보기"
              >
                도착시간
              </button>
              <button
                type="button"
                className="ab-btn"
                onClick={handleManualArrive}
                disabled={myArrived}
                title={myArrived ? '이미 도착 처리됨' : '수동 도착 처리'}
              >
                {myArrived ? '도착함' : '도착'}
              </button>
              <button
                type="button"
                className="ab-btn ghost"
                onClick={handleCancelAppointment}
                title="약속 종료"
              >
                종료
              </button>
            </div>
          </div>
        )}

        {/* 게시글 정보 바 */}
        {room?.postTitle && (
          <div className="post-bar">
            <span className="post-bar-icon">📌</span>
            <span className="post-bar-title">{room.postTitle}</span>
          </div>
        )}

        {/* 메시지 영역 */}
        <div className="chat-messages" ref={messagesScrollRef}>
          {loading && messages.length === 0 && (
            <div className="state-msg">메시지를 불러오는 중...</div>
          )}
          {!loading && error && (
            <div className="state-msg error">{error}</div>
          )}
          {!loading && !error && messages.length === 0 && (
            <div className="state-msg empty">
              아직 대화가 없어요. 먼저 인사를 건네 보세요 👋
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              prev={messages[idx - 1]}
              myId={myId}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 폼 */}
        <form className="chat-input-area" onSubmit={handleSend}>
          <div className={`plus-wrap ${plusOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="btn-plus"
              onClick={() => setPlusOpen((v) => !v)}
              aria-label="더보기"
              disabled={!roomId}
            >
              {plusOpen ? '✕' : '+'}
            </button>
            {plusOpen && (
              <div className="plus-menu">
                <button type="button" className="pm-item" onClick={handleClickPhoto}>
                  <span className="pm-emoji">🖼️</span>
                  <span>사진</span>
                </button>
                <button type="button" className="pm-item" onClick={handleOpenAppointment}>
                  <span className="pm-emoji">📍</span>
                  <span>약속 잡기</span>
                </button>
                <button
                  type="button"
                  className="pm-item"
                  onClick={handleOpenETA}
                  disabled={!hasAppointment}
                  title={hasAppointment ? '도착시간 확인' : '약속이 정해진 후 사용 가능'}
                >
                  <span className="pm-emoji">🏃</span>
                  <span>도착시간 확인</span>
                </button>
                <button
                  type="button"
                  className="pm-item"
                  onClick={handleManualArrive}
                  disabled={!hasAppointment || myArrived}
                  title={!hasAppointment ? '약속이 정해진 후 사용 가능' : (myArrived ? '이미 도착' : '수동 도착')}
                >
                  <span className="pm-emoji">✅</span>
                  <span>도착 알리기</span>
                </button>
                <button
                  type="button"
                  className="pm-item danger"
                  onClick={handleCancelAppointment}
                  disabled={!hasAppointment}
                  title={hasAppointment ? '약속 종료' : '진행 중인 약속이 없어요'}
                >
                  <span className="pm-emoji">🛑</span>
                  <span>약속 종료</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <input
            ref={inputRef}
            type="text"
            placeholder="메시지를 입력하세요..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!roomId}
            maxLength={1000}
          />
          <button type="submit" className="btn-send" disabled={!roomId || !inputText.trim()}>
            전송
          </button>
        </form>
      </div>

      {placeModalMode && (
        <PlacePickerModal
          mode={placeModalMode}
          onClose={() => setPlaceModalMode(null)}
          onSubmit={handleSubmitAppointment}
        />
      )}

      {etaDialog && (
        <EtaDialog
          loading={etaDialog.loading}
          results={etaDialog.results}
          onPick={handleSendETA}
          onClose={() => setEtaDialog(null)}
        />
      )}
    </div>
  )
}

// ─── 도착시간 다이얼로그 ─────────────────────────────────

const EtaDialog = ({ loading, results, onPick, onClose }) => {
  const findResult = (mode) => results.find((r) => r.mode === mode)
  return (
    <div className="eta-dialog-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="eta-dialog" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>도착시간 공유</h3>
          <button className="ed-close" onClick={onClose} aria-label="닫기">✕</button>
        </header>
        <p className="ed-desc">
          현재 위치에서 약속 장소까지 예상 시간이에요. 보낼 수단을 골라주세요.
        </p>
        <div className="ed-modes">
          {ETA_MODES.map((m) => {
            const r = findResult(m.key)
            const disabled = loading || !r?.ok
            return (
              <button
                key={m.key}
                type="button"
                className="ed-mode"
                disabled={disabled}
                onClick={() => onPick(m.key, r?.minutes)}
              >
                <span className="ed-emoji">{m.emoji}</span>
                <span className="ed-label">{m.label}</span>
                <span className="ed-min">
                  {loading ? '계산 중...' : r?.ok ? formatMinutes(r.minutes) : '계산 불가'}
                </span>
              </button>
            )
          })}
        </div>
        <p className="ed-hint">
          ※ 도보는 TMAP, 자동차는 카카오 모빌리티, 대중교통은 ODSAY 기준이에요.
        </p>
      </div>
    </div>
  )
}

// ─── 단일 메시지 컴포넌트 ────────────────────────────────

const MessageItem = ({ msg, prev, myId }) => {
  const isMe = Number(msg.senderId) === Number(myId)
  const showDateSeparator = shouldShowDateSeparator(prev, msg)
  const isSystem = ['ETA', 'APPOINTMENT_SET', 'ARRIVED', 'APPOINTMENT_DONE', 'APPOINTMENT_CANCELED'].includes(msg.type)

  const groupedWithPrev =
    !isSystem &&
    prev &&
    prev.senderId === msg.senderId &&
    !showDateSeparator &&
    Math.abs(new Date(msg.createdAt) - new Date(prev.createdAt)) < 60_000 &&
    !['ETA', 'APPOINTMENT_SET', 'ARRIVED', 'APPOINTMENT_DONE', 'APPOINTMENT_CANCELED'].includes(prev.type)

  return (
    <>
      {showDateSeparator && (
        <div className="date-sep">
          <span>{formatDateSeparator(msg.createdAt)}</span>
        </div>
      )}

      {msg.type === 'ETA' && (
        <div className="message-wrapper system">
          <div className="eta-bubble">
            <span className="eta-icon">🏃‍♂️💨</span>
            <span>
              <strong>{msg.senderName || (isMe ? '나' : '상대')}</strong>님이 약속 장소까지{' '}
              <strong className="highlight">{formatMinutes(msg.etaMinutes)}</strong>{' '}
              <em className="eta-mode">({modeKor(msg.etaMode)})</em>
            </span>
            <span className="msg-time">{formatTimeOnly(msg.createdAt)}</span>
          </div>
        </div>
      )}

      {msg.type === 'APPOINTMENT_SET' && (
        <div className="message-wrapper system">
          <div className="appointment-bubble">
            <span className="apb-icon">📍</span>
            <div className="apb-text">
              <span className="apb-line">
                <strong>{msg.senderName || '누군가'}</strong>님이 약속을 잡았어요
              </span>
              <strong className="apb-place">{msg.placeName}</strong>
              {msg.placeAddress && <span className="apb-addr">{msg.placeAddress}</span>}
            </div>
            <span className="msg-time">{formatTimeOnly(msg.createdAt)}</span>
          </div>
        </div>
      )}

      {msg.type === 'ARRIVED' && (
        <div className="message-wrapper system">
          <div className="arrived-bubble">
            <span className="arr-icon">✅</span>
            <span>
              <strong>{msg.senderName || (isMe ? '나' : '상대')}</strong>님이 약속 장소에 <strong className="highlight">도착</strong>했어요!
            </span>
            <span className="msg-time">{formatTimeOnly(msg.createdAt)}</span>
          </div>
        </div>
      )}

      {msg.type === 'APPOINTMENT_DONE' && (
        <div className="message-wrapper system">
          <div className="done-bubble">
            <span className="done-icon">🎉</span>
            <span>두 분 모두 약속 장소에 도착했어요. 좋은 시간 보내세요!</span>
            <span className="msg-time">{formatTimeOnly(msg.createdAt)}</span>
          </div>
        </div>
      )}

      {msg.type === 'APPOINTMENT_CANCELED' && (
        <div className="message-wrapper system">
          <div className="canceled-bubble">
            <span className="canc-icon">🛑</span>
            <span>{msg.content || '약속이 종료되었어요.'}</span>
            <span className="msg-time">{formatTimeOnly(msg.createdAt)}</span>
          </div>
        </div>
      )}

      {(msg.type === 'TEXT' || msg.type === 'IMAGE' || msg.type === 'PLACE') && (
        <div className={`message-wrapper ${isMe ? 'me' : 'other'} ${groupedWithPrev ? 'grouped' : ''}`}>
          {!isMe && !groupedWithPrev && (
            <div className="avatar">
              {msg.senderProfileImageUrl ? (
                <img src={msg.senderProfileImageUrl} alt={msg.senderName} />
              ) : (
                (msg.senderName || '?').charAt(0)
              )}
            </div>
          )}
          {!isMe && groupedWithPrev && <div className="avatar avatar-spacer" />}

          <div className="msg-content">
            {!isMe && !groupedWithPrev && (
              <span className="sender-name">{msg.senderName}</span>
            )}
            <div className="bubble-row">
              {msg.type === 'TEXT' && (
                <div className="text-bubble">{msg.content}</div>
              )}
              {msg.type === 'IMAGE' && (
                <a className="image-bubble" href={msg.imageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={msg.imageUrl}
                    alt="첨부 사진"
                    loading="lazy"
                    onLoad={(e) => {
                      // 이미지 로드 후 부모 컨테이너의 스크롤을 살짝 따라가게 함.
                      // 단, 사용자가 이미 위로 올려서 보고 있으면 건드리지 않음.
                      const container = e.currentTarget.closest('.chat-messages')
                      if (!container) return
                      const distanceFromBottom =
                        container.scrollHeight - container.scrollTop - container.clientHeight
                      // 입력창 근처(80px 이내)에서 보고 있을 때만 자동 스크롤
                      if (distanceFromBottom < 80) {
                        container.scrollTop = container.scrollHeight
                      }
                    }}
                  />
                </a>
              )}
              {msg.type === 'PLACE' && (
                <PlaceCardBubble msg={msg} />
              )}
              <span className="msg-time">{formatTimeOnly(msg.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const PlaceCardBubble = ({ msg }) => {
  const mapsUrl = `https://map.kakao.com/link/map/${encodeURIComponent(msg.placeName || '약속 장소')},${msg.placeLat},${msg.placeLng}`
  return (
    <a className="place-bubble" href={mapsUrl} target="_blank" rel="noreferrer">
      <span className="pb-icon">📍</span>
      <div className="pb-text">
        <strong>{msg.placeName}</strong>
        {msg.placeAddress && <span>{msg.placeAddress}</span>}
        <em>지도에서 보기 →</em>
      </div>
    </a>
  )
}

// ─── 유틸 ─────────────────────────────────────────────────

function modeKor(mode) {
  if (mode === 'CAR') return '자동차'
  if (mode === 'TRANSIT') return '대중교통'
  return '도보'
}

/**
 * 분(min) 단위 시간을 사람이 읽기 좋은 한국어로.
 * 0       → "곧 도착"
 * 1~59    → "23분"
 * 60      → "1시간"
 * 61~     → "1시간 23분"
 */
function formatMinutes(min) {
  if (min == null || Number.isNaN(min)) return ''
  const m = Math.max(0, Math.round(min))
  if (m === 0) return '곧 도착'
  if (m < 60) return `${m}분`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h}시간` : `${h}시간 ${r}분`
}

function shouldShowDateSeparator(prev, curr) {
  if (!curr) return false
  if (!prev) return true
  const a = new Date(prev.createdAt)
  const b = new Date(curr.createdAt)
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  )
}

function formatDateSeparator(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function formatTimeOnly(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default ChatRoom

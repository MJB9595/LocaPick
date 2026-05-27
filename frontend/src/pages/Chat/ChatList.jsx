import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyChatRooms, deleteChatRoom } from '../../api/chat.api'
import NewChatPicker from './NewChatPicker'
import './ChatList.scss'

/**
 * 채팅 목록 (ChatLayout 좌측 패널).
 *
 * Props:
 * - activeRoomId: 현재 선택된 방 ID (하이라이트용)
 */
const ChatList = ({ activeRoomId = null }) => {
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getMyChatRooms()
      setRooms(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setError('채팅 목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  /* 다른 방으로 진입할 때마다 즉시 한 번 더 새로고침
     (ChatRoom 의 markRead 가 호출되어 서버 unread 가 0 으로 갱신된 직후 반영) */
  useEffect(() => {
    if (!activeRoomId) return
    const t = setTimeout(load, 500)
    return () => clearTimeout(t)
  }, [activeRoomId, load])

  const handleDelete = useCallback(async (roomId, opponentName) => {
    if (deletingId) return
    if (!window.confirm(`'${opponentName || '상대'}'님과의 채팅을 삭제할까요? 메시지가 모두 사라져요. (친구 관계는 유지됩니다)`)) {
      return
    }
    try {
      setDeletingId(roomId)
      await deleteChatRoom(roomId)
      // 즉시 로컬에서 제거
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
      // 현재 방을 삭제했다면 ChatEmpty로 이동
      if (Number(activeRoomId) === Number(roomId)) {
        navigate('/app/chat')
      }
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.message || '삭제 실패')
    } finally {
      setDeletingId(null)
    }
  }, [deletingId, activeRoomId, navigate])

  const handleOpenPicker = () => setPickerOpen(true)
  const handlePickerCreated = (roomId) => {
    setPickerOpen(false)
    load()
    navigate(`/app/chat/${roomId}`)
  }

  return (
    <>
      <div className="chatlist-pane">
        <header className="list-header">
          <h2>채팅</h2>
          <div className="list-header-actions">
            <button
              type="button"
              className="new-btn"
              onClick={handleOpenPicker}
              title="새 채팅 시작"
              aria-label="새 채팅 시작"
            >
              ✏️
            </button>
            <button
              type="button"
              className="refresh-btn"
              onClick={load}
              aria-label="새로고침"
              title="새로고침"
            >
              ↻
            </button>
          </div>
        </header>

        {loading && rooms.length === 0 && (
          <div className="state-msg">불러오는 중...</div>
        )}

        {!loading && error && (
          <div className="state-msg error">{error}</div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <div className="empty-title">아직 진행 중인 채팅이 없어요</div>
            <div className="empty-desc">
              아래 버튼을 눌러 친구와 새 채팅을 시작해보세요.
            </div>
            <button
              type="button"
              className="empty-cta"
              onClick={handleOpenPicker}
            >
              ✏️ 새 채팅 시작
            </button>
          </div>
        )}

        {!loading && !error && rooms.length > 0 && (
          <ul className="room-list">
            {rooms.map((room) => {
              const isActive = Number(room.roomId) === Number(activeRoomId)
              // 활성 방에 들어가 있으면 unreadCount를 즉시 0으로 표시 (서버 동기화는 polling/메시지 도착에서)
              const displayRoom = isActive
                ? { ...room, unreadCount: 0 }
                : room
              return (
                <ChatRoomItem
                  key={room.roomId}
                  room={displayRoom}
                  active={isActive}
                  deleting={deletingId === room.roomId}
                  onClick={() => navigate(`/app/chat/${room.roomId}`)}
                  onDelete={() => handleDelete(room.roomId, room.opponentName)}
                />
              )
            })}
          </ul>
        )}
      </div>

      {pickerOpen && (
        <NewChatPicker
          onClose={() => setPickerOpen(false)}
          onCreated={handlePickerCreated}
        />
      )}
    </>
  )
}

const ChatRoomItem = ({ room, active, deleting, onClick, onDelete }) => {
  const {
    opponentName,
    opponentProfileImageUrl,
    lastMessage,
    lastMessageAt,
    unreadCount,
    postTitle,
  } = room

  const initial = (opponentName || '?').trim().charAt(0)
  const timeStr = formatChatTime(lastMessageAt)

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    onDelete?.()
  }

  return (
    <li
      className={`room-item ${unreadCount > 0 ? 'has-unread' : ''} ${active ? 'is-active' : ''} ${deleting ? 'is-deleting' : ''}`}
      onClick={() => !deleting && onClick?.()}
    >
      <div className="profile-avatar">
        {opponentProfileImageUrl ? (
          <img src={opponentProfileImageUrl} alt={opponentName || '상대'} />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="room-info">
        <div className="info-top">
          <span className="name">{opponentName || '알 수 없음'}</span>
          <span className="time">{timeStr}</span>
        </div>
        {postTitle && (
          <div className="post-tag" title={postTitle}>
            <span className="post-tag-icon">📌</span>
            <span className="post-tag-text">{postTitle}</span>
          </div>
        )}
        <div className="info-bottom">
          <span className="last-msg">
            {lastMessage || '아직 대화가 없어요'}
          </span>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="room-delete-btn"
        onClick={handleDeleteClick}
        title="채팅 삭제"
        aria-label={`${opponentName || '상대'}와의 채팅 삭제`}
        disabled={deleting}
      >
        {deleting ? '⏳' : '✕'}
      </button>
    </li>
  )
}

function formatChatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return '어제'

  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default ChatList

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyFriends, addFriendByCode, removeFriend } from '../../api/friend.api'
import { openChatRoom } from '../../api/chat.api'

/**
 * 마이페이지의 "친구와 채팅하기" 카드 내부 패널.
 *
 * - 내 친구 코드 표시 + 복사
 * - 친구 코드로 친구 추가 → 자동 채팅방 생성 → 바로 이동(선택)
 * - 친구 목록 표시 (클릭 시 해당 채팅방으로 이동)
 */
const FriendsPanel = ({ myFriendCode }) => {
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [codeInput, setCodeInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'ok'|'err', message }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getMyFriends()
      setFriends(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCopy = async () => {
    if (!myFriendCode) return
    try {
      await navigator.clipboard.writeText(myFriendCode)
      setFeedback({ type: 'ok', message: '친구 코드가 복사되었어요.' })
    } catch {
      // 일부 모바일 환경 폴백
      const ta = document.createElement('textarea')
      ta.value = myFriendCode
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setFeedback({ type: 'ok', message: '친구 코드가 복사되었어요.' })
      } catch {
        setFeedback({ type: 'err', message: '복사에 실패했어요. 직접 복사해주세요.' })
      } finally {
        document.body.removeChild(ta)
      }
    }
    setTimeout(() => setFeedback(null), 2200)
  }

  const handleAdd = async (e) => {
    e?.preventDefault?.()
    const code = codeInput.trim()
    if (!code) return
    try {
      setAdding(true)
      setFeedback(null)
      const res = await addFriendByCode(code)
      setCodeInput('')
      if (res?.alreadyFriend) {
        setFeedback({ type: 'ok', message: '이미 친구예요. 채팅방으로 이동할 수 있어요.' })
      } else {
        setFeedback({ type: 'ok', message: `${res?.friend?.name || '친구'}님과 친구가 되었어요!` })
      }
      await load()
      // 자동 이동: 새로 추가된 경우만
      if (!res?.alreadyFriend && res?.roomId) {
        setTimeout(() => navigate(`/app/chat/${res.roomId}`), 600)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || '친구를 추가할 수 없어요.'
      setFeedback({ type: 'err', message: msg })
    } finally {
      setAdding(false)
      setTimeout(() => setFeedback(null), 2500)
    }
  }

  const handleOpenChat = async (friend) => {
    try {
      // 기존 방이 있으면 그 방으로, 없으면 즉시 새로 만들고 이동
      const room = await openChatRoom({ opponentId: friend.memberId })
      navigate(`/app/chat/${room.roomId}`)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.message || '채팅을 시작할 수 없어요.')
    }
  }

  const handleRemove = async (friend) => {
    if (!window.confirm(`'${friend.name}'님을 친구에서 삭제할까요? (채팅 기록은 유지됩니다)`)) {
      return
    }
    try {
      await removeFriend(friend.memberId)
      setFeedback({ type: 'ok', message: '친구를 삭제했어요.' })
      await load()
    } catch (e) {
      setFeedback({ type: 'err', message: e?.response?.data?.message || '삭제 실패' })
    } finally {
      setTimeout(() => setFeedback(null), 2200)
    }
  }

  return (
    <div className="friends-panel">
      {/* 상단: 좌(내 친구 코드) / 우(친구 추가) */}
      <div className="top-row">
        {/* 내 친구 코드 */}
        <div className="my-code-row">
          <div className="my-code-label">내 친구 코드</div>
          <div className="my-code-value">
            <code>{myFriendCode || '발급 중...'}</code>
            <button
              type="button"
              className="copy-btn"
              onClick={handleCopy}
              disabled={!myFriendCode}
            >
              복사
            </button>
          </div>
        </div>

        {/* 친구 추가 입력 */}
        <form className="add-friend-row" onSubmit={handleAdd}>
          <div className="add-friend-label">친구 추가</div>
          <div className="add-friend-inputs">
            <input
              type="text"
              placeholder="친구 코드 입력"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={12}
              disabled={adding}
            />
            <button type="submit" className="add-btn" disabled={adding || !codeInput.trim()}>
              {adding ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>

      {feedback && (
        <div className={`fp-feedback ${feedback.type === 'err' ? 'err' : 'ok'}`}>
          {feedback.message}
        </div>
      )}

      {/* 친구 목록 */}
      <div className="friends-list-wrap">
        <div className="friends-list-head">
          <span>내 친구 ({friends.length})</span>
          <button type="button" className="all-chat-btn" onClick={() => navigate('/app/chat')}>
            모든 채팅 →
          </button>
        </div>

        {loading && friends.length === 0 ? (
          <div className="friends-empty">불러오는 중...</div>
        ) : friends.length === 0 ? (
          <div className="friends-empty">
            아직 친구가 없어요. 위 입력창에 친구 코드를 넣어 추가해보세요.
          </div>
        ) : (
          <ul className="friend-items">
            {friends.map((f) => (
              <li key={f.memberId} className="friend-item">
                <div className="fi-avatar">
                  {f.profileImageUrl ? (
                    <img src={f.profileImageUrl} alt={f.name} />
                  ) : (
                    <span>{(f.name || '?').charAt(0)}</span>
                  )}
                </div>
                <div className="fi-info">
                  <div className="fi-name">{f.name}</div>
                  <div className="fi-code">@{f.friendCode}</div>
                </div>
                <div className="fi-actions">
                  <button
                    type="button"
                    className="fi-chat-btn"
                    onClick={() => handleOpenChat(f)}
                    title="채팅 시작"
                  >
                    💬 채팅
                  </button>
                  <button
                    type="button"
                    className="fi-del-btn"
                    onClick={() => handleRemove(f)}
                    title="친구 삭제"
                    aria-label={`${f.name} 친구 삭제`}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default FriendsPanel

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { getMyFriends } from '../../api/friend.api'
import { openChatRoom } from '../../api/chat.api'
import './NewChatPicker.scss'

/**
 * 친구 목록에서 한 명을 골라 채팅을 시작하는 모달.
 *
 * - 친구가 없으면 마이페이지로 안내
 * - 선택 시 openChatRoom 으로 방 가져오고/만들기 → onCreated(roomId)
 */
const NewChatPicker = ({ onClose, onCreated }) => {
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let alive = true
    getMyFriends()
      .then((data) => {
        if (!alive) return
        setFriends(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (!alive) return
        console.error(e)
        setError('친구 목록을 불러올 수 없어요.')
      })
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) =>
      (f.name || '').toLowerCase().includes(q) ||
      (f.friendCode || '').toLowerCase().includes(q)
    )
  }, [friends, keyword])

  const handlePick = useCallback(async (friend) => {
    if (creating) return
    try {
      setCreating(true)
      const room = await openChatRoom({ opponentId: friend.memberId })
      onCreated?.(room.roomId)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.message || '채팅을 시작할 수 없어요.')
    } finally {
      setCreating(false)
    }
  }, [creating, onCreated])

  return (
    <div className="new-chat-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>새 채팅 시작</h3>
          <button className="ncp-close" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <div className="ncp-search">
          <input
            type="text"
            placeholder="친구 이름 또는 코드 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoFocus
          />
        </div>

        {loading && (
          <div className="ncp-state">친구 목록을 불러오는 중...</div>
        )}

        {!loading && error && (
          <div className="ncp-state error">{error}</div>
        )}

        {!loading && !error && friends.length === 0 && (
          <div className="ncp-empty">
            <div className="ncp-empty-icon">👥</div>
            <div className="ncp-empty-title">아직 친구가 없어요</div>
            <div className="ncp-empty-desc">
              마이페이지에서 친구 코드를 입력해 친구를 먼저 추가해보세요.
            </div>
          </div>
        )}

        {!loading && !error && friends.length > 0 && (
          <ul className="ncp-list">
            {filtered.length === 0 ? (
              <li className="ncp-no-match">검색 결과가 없어요.</li>
            ) : (
              filtered.map((f) => (
                <li
                  key={f.memberId}
                  className={`ncp-item ${creating ? 'is-creating' : ''}`}
                  onClick={() => handlePick(f)}
                >
                  <div className="ncp-avatar">
                    {f.profileImageUrl ? (
                      <img src={f.profileImageUrl} alt={f.name} />
                    ) : (
                      <span>{(f.name || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="ncp-info">
                    <div className="ncp-name">{f.name}</div>
                    <div className="ncp-code">@{f.friendCode}</div>
                  </div>
                  <div className="ncp-action">
                    {f.roomId ? <span className="ncp-tag existing">기존 방으로</span> : <span className="ncp-tag new">새 방 시작</span>}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

export default NewChatPicker

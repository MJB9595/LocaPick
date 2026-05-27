import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NewChatPicker from './NewChatPicker'
import './ChatEmpty.scss'

/**
 * 데스크탑에서 어떤 채팅방도 선택하지 않았을 때 우측에 표시되는 안내.
 * 모바일에서는 layout의 room-active 토글에 의해 화면에 보이지 않는다.
 */
const ChatEmpty = () => {
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="chat-empty">
      <div className="chat-empty__inner">
        <div className="chat-empty__icon">💬</div>
        <h2>대화를 시작해보세요</h2>
        <p>왼쪽 목록에서 친구를 선택하거나, 새 채팅을 시작해 보세요.</p>

        <button
          type="button"
          className="chat-empty__cta"
          onClick={() => setPickerOpen(true)}
        >
          ✏️ 새 채팅 시작
        </button>

        <ul className="chat-empty__hints">
          <li>📍 약속 장소를 잡고 도착시간을 자동으로 공유할 수 있어요.</li>
          <li>🖼️ 사진을 빠르게 주고받을 수 있어요.</li>
          <li>🏃 도착 반경 안에 들어가면 자동으로 도착 알림이 떠요.</li>
        </ul>
      </div>

      {pickerOpen && (
        <NewChatPicker
          onClose={() => setPickerOpen(false)}
          onCreated={(roomId) => {
            setPickerOpen(false)
            navigate(`/app/chat/${roomId}`)
          }}
        />
      )}
    </div>
  )
}

export default ChatEmpty

import React, { useMemo, useEffect } from 'react'
import { Outlet, useParams, useLocation } from 'react-router-dom'
import ChatList from './ChatList'
import './ChatLayout.scss'

/**
 * 채팅 화면 셸 (좌: 목록, 우: 방).
 *
 * 동작:
 * - 데스크탑(>768px): 좌측 패널 고정 폭 + 우측 컨텐츠
 * - 모바일(≤768px): 한 화면에 한 패널만. 방이 선택되면 우측 풀스크린, 뒤로가기로 목록.
 *   → 클래스 `room-active` 토글로 처리
 *
 * 채팅 페이지는 fixed positioning 으로 헤더 아래 영역을 차지하므로
 * 페이지 본문 흐름이 비어있다. body 에 `chat-page` 클래스를 추가해
 * 푸터가 viewport 아래로 자연스럽게 위치하도록 SCSS 가 보정한다.
 */
const ChatLayout = () => {
  const { roomId } = useParams()
  const location = useLocation()

  const roomActive = useMemo(() => {
    return Boolean(roomId) || /\/app\/chat\/.+$/.test(location.pathname)
  }, [roomId, location.pathname])

  // 채팅 페이지에서만 body 스크롤/푸터 위치 보정 클래스 부여
  useEffect(() => {
    document.body.classList.add('chat-page')
    return () => {
      document.body.classList.remove('chat-page')
    }
  }, [])

  return (
    <div className={`chat-layout ${roomActive ? 'room-active' : ''}`}>
      <div className="chat-layout__list">
        <ChatList activeRoomId={roomId} />
      </div>
      <div className="chat-layout__detail">
        <Outlet />
      </div>
    </div>
  )
}

export default ChatLayout

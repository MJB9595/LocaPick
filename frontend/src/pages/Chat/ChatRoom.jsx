import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatRoom.scss';

const ChatRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // 🌟 테스트용 가상 데이터 (추후 백엔드 웹소켓 연동 시 대체됨)
  const currentUserId = 'user1';
  const [messages, setMessages] = useState([
    { id: 1, type: 'text', senderId: 'user2', senderName: '상원', content: '어디쯤이야?', timestamp: '오후 8:45' },
    { id: 2, type: 'text', senderId: 'user1', senderName: '나', content: '거의 다 왔어!', timestamp: '오후 8:46' },
    { id: 3, type: 'eta', senderId: 'user1', senderName: '나', remainingMinutes: 5, timestamp: '오후 8:46' },
    { id: 4, type: 'eta', senderId: 'user2', senderName: '상원', remainingMinutes: 2, timestamp: '오후 8:48' },
  ]);
  const [inputText, setInputText] = useState('');

  // 새 메시지가 올 때마다 스크롤을 맨 아래로 내리는 함수
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 일반 텍스트 메시지 전송
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      type: 'text',
      senderId: currentUserId,
      senderName: '나',
      content: inputText,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
  };

  // 🌟 남은 시간 공유 버튼 클릭 (추후 지도 API 연동)
  const handleShareETA = () => {
    // 임시로 1~15분 사이의 랜덤 시간을 보냅니다.
    const randomMins = Math.floor(Math.random() * 15) + 1;
    const newMessage = {
      id: Date.now(),
      type: 'eta', // 특수 타입 지정
      senderId: currentUserId,
      senderName: '나',
      remainingMinutes: randomMins, 
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="chatroom-root app-bg">
      <div className="chatroom-container card">
        
        {/* 상단 헤더 */}
        <header className="chat-header">
          <button className="back-btn" onClick={() => navigate(-1)}>⬅</button>
          <h2>상원 님과의 채팅</h2>
        </header>

        {/* 메시지 출력 영역 */}
        <div className="chat-messages">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;

            // 🌟 1. 남은 시간(ETA) 특수 메시지 렌더링
            if (msg.type === 'eta') {
              return (
                <div key={msg.id} className="message-wrapper system">
                  <div className="eta-bubble">
                    <span className="eta-icon">🏃‍♂️💨</span>
                    <span><strong>{msg.senderName}</strong>님이 약속 장소까지 <strong className="highlight">{msg.remainingMinutes}분</strong> 남았습니다!</span>
                    <span className="msg-time">{msg.timestamp}</span>
                  </div>
                </div>
              );
            }

            // 🌟 2. 일반 텍스트 메시지 렌더링
            return (
              <div key={msg.id} className={`message-wrapper ${isMe ? 'me' : 'other'}`}>
                {!isMe && <div className="avatar">{msg.senderName.charAt(0)}</div>}
                <div className="msg-content">
                  {!isMe && <span className="sender-name">{msg.senderName}</span>}
                  <div className="bubble-row">
                    <div className="text-bubble">{msg.content}</div>
                    <span className="msg-time">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 하단 입력 폼 */}
        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <button type="button" className="btn-eta" onClick={handleShareETA} title="내 도착 시간 공유하기">
            📍 시간공유
          </button>
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="btn-send">전송</button>
        </form>
        
      </div>
    </div>
  );
};

export default ChatRoom;
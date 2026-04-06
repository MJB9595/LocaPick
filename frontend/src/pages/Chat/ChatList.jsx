import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatList.scss';

const ChatList = () => {
  const navigate = useNavigate();

  // 💡 백엔드 연결 전까지 사용할 가짜 데이터입니다.
  const chatRooms = [
    {
      id: '123',
      targetName: '상원',
      lastMessage: '프로젝트 거의 다 끝났어!',
      lastTime: '오후 8:46',
      unreadCount: 0,
    },
    {
      id: '456',
      targetName: '민지',
      lastMessage: '내일 어디서 볼까?',
      lastTime: '오후 7:10',
      unreadCount: 1,
    }
  ];

  return (
    <div className="chatlist-root app-bg">
      <div className="chatlist-container card">
        <header className="list-header">
          <h2>채팅 목록</h2>
        </header>

        <ul className="room-list">
          {chatRooms.map((room) => (
            <li key={room.id} className="room-item" onClick={() => navigate(`/app/chat/${room.id}`)}>
              <div className="profile-avatar">{room.targetName.charAt(0)}</div>
              <div className="room-info">
                <div className="info-top">
                  <span className="name">{room.targetName}</span>
                  <span className="time">{room.lastTime}</span>
                </div>
                <div className="info-bottom">
                  <span className="last-msg">{room.lastMessage}</span>
                  {room.unreadCount > 0 && (
                    <span className="unread-badge">{room.unreadCount}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ChatList;
import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ProtectApp from './ProtectApp'
import PublicLayout from './PublicLayout'
import Landing from '../pages/Landing/Landing'
import Login from '../pages/Auth/Login'
import Signup from '../pages/Auth/Signup'
import Dashboard from '../pages/Dashboard/Dashboard'
import AdminDashboard from '../pages/Admin/AdminDashboard'
import ProtectRoute from '../store/ProtectRoute'
import MapHome from '../pages/Map/MapHome'
import MyPage from '../pages/MyPage/MyPage'
import Favorites from '../pages/Favorites/Favorites'
import Memo from '../pages/Memo/Memo'
import MemoWrite from '../pages/Memo/MemoWrite'; // 🌟 새로 만들 페이지
import MemoDetail from '../pages/Memo/MemoDetail'; // (선택) 상세 보기 페이지
import ChatList from '../pages/Chat/ChatList'; 
import ChatRoom from '../pages/Chat/ChatRoom'; 

export const router = createBrowserRouter([
  {
    // 공개 영역 (헤더/푸터 없음)
    element: <PublicLayout />,
    children: [
      { path: '/',        element: <Landing /> },
      { path: '/login',   element: <Login /> },
      { path: '/signup',  element: <Signup /> },
    ],
  },
  {
    // 인증 영역 (헤더/푸터 있음)
    path: '/app',
    element: (
      <ProtectRoute>
        <ProtectApp />
      </ProtectRoute>
    ),
    children: [
      { index: true, element: <MapHome /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'mypage', element: <MyPage /> },
      { path: 'favorites', element: <Favorites /> },
      { 
        path: 'memo', 
        children: [
          { index: true, element: <Memo /> }, // 목록
          { path: 'write', element: <MemoWrite /> }, // 새 글 작성
          { path: 'edit/:id', element: <MemoWrite /> }, // 글 수정 (파라미터로 id 받기)
          { path: ':id', element: <MemoDetail /> } // 글 상세
        ]
      },
      {
        path: 'chat',
        children: [
          { index: true, element: <ChatList /> }, // 채팅방 목록 (/app/chat)
          { path: ':roomId', element: <ChatRoom /> } // 개별 채팅방 (/app/chat/123)
        ]
      }

    ],
  },
  {
    // 어드민 전용 영역
    path: '/admin',
    element: (
      <ProtectRoute role="ADMIN">
        <ProtectApp />
      </ProtectRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
    ],
  },
])

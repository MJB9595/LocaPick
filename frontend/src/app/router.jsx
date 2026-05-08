import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ProtectApp from './ProtectApp'
import PublicLayout from './PublicLayout'
import Landing from '../pages/Landing/Landing'
import Login from '../pages/Auth/Login'
import Signup from '../pages/Auth/Signup'
import KakaoCallback from '../pages/Auth/KakaoCallback'  // ✅ 신규
import Dashboard from '../pages/Dashboard/Dashboard'
import AdminDashboard from '../pages/Admin/AdminDashboard'
import ProtectRoute from '../store/ProtectRoute'
import MapHome from '../pages/Map/MapHome'
import MyPage from '../pages/MyPage/MyPage'
import Favorites from '../pages/Favorites/Favorites'
import Memo from '../pages/Memo/Memo'
import MemoWrite from '../pages/Memo/MemoWrite'
import MemoDetail from '../pages/Memo/MemoDetail'
import MemoEdit from '../pages/Memo/MemoEdit'
import ChatList from '../pages/Chat/ChatList'
import ChatRoom from '../pages/Chat/ChatRoom'

export const router = createBrowserRouter([
  {
    // 공개 영역 (헤더/푸터 없음)
    element: <PublicLayout />,
    children: [
      { path: '/',               element: <Landing /> },
      { path: '/login',          element: <Login /> },
      { path: '/signup',         element: <Signup /> },
      { path: '/kakao-callback', element: <KakaoCallback /> },  // ✅ 신규: 카카오 콜백 (퍼블릭)
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
      { path: 'mypage',    element: <MyPage /> },
      { path: 'favorites', element: <Favorites /> },
      {
        path: 'memo',
        children: [
          { index: true,        element: <Memo /> },
          { path: 'write',      element: <MemoWrite /> },
          { path: ':id',        element: <MemoDetail /> },
          { path: 'edit/:id',   element: <MemoEdit /> },
        ]
      },
      {
        path: 'chat',
        children: [
          { index: true,         element: <ChatList /> },
          { path: ':roomId',     element: <ChatRoom /> },
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
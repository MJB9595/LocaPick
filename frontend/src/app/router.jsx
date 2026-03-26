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

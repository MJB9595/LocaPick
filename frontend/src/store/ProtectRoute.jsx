import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './auth.store'

/**
 * 인증 필요 라우트 가드
 * @param {string} [role] - 'ADMIN' 전달 시 어드민만 접근 가능
 */
const ProtectRoute = ({ children, role }) => {
  const { isAuthed, isAdmin } = useAuth()

  if (!isAuthed) return <Navigate to="/login" replace />
  if (role === 'ADMIN' && !isAdmin) return <Navigate to="/app" replace />

  return children
}

export default ProtectRoute

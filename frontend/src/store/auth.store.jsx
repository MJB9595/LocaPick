import React, { createContext, useContext, useMemo, useState } from 'react'

const AuthCtx = createContext(null)

const parseUser = () => {
  try {
    const raw = localStorage.getItem('authUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('accessToken'))
  const [user,  setUser]    = useState(() => parseUser())

  /**
   * 로그인 성공 후 호출
   * @param {string} accessToken
   * @param {{ memberId, name, email, role }} userInfo
   */
  const login = (accessToken, userInfo) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('authUser', JSON.stringify(userInfo))
    setToken(accessToken)
    setUser(userInfo)
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('authUser')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({
    token,
    user,
    isAuthed : !!token,
    isAdmin  : user?.role === 'ADMIN',
    login,
    logout,
  }), [token, user])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

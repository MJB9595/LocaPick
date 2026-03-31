import React, { createContext, useContext, useMemo, useState } from 'react'

const AuthCtx = createContext(null) // 🌟 이름이 AuthCtx 입니다!

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
   * @param {{ memberId, name, email, role, profileImageUrl }} userInfo
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

  // 유저 정보의 일부(프로필 사진 등)만 업데이트
  const updateUser = (updatedData) => {
    setUser((prevUser) => {
      const newUser = { ...prevUser, ...updatedData }
      localStorage.setItem('authUser', JSON.stringify(newUser)) // 로컬스토리지도 즉시 갱신
      return newUser
    })
  }

  // useMemo 배열에 함수들을 매핑
  const value = useMemo(() => ({
    token,
    user,
    isAuthed : !!token,
    isAdmin  : user?.role === 'ADMIN',
    login,
    logout,
    updateUser, // 여기에 updateUser를 추가
  }), [token, user])
  

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
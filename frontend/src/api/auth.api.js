import client from './client'

/** 회원가입 */
export const signup = (data) =>
  client.post('/auth/signup', data).then((r) => r.data)

/** 로그인 → { accessToken, memberId, name, email, role } */
export const login = (data) =>
  client.post('/auth/login', data).then((r) => r.data)

/** 로그아웃 (서버 알림 + 클라이언트 정리는 store 에서) */
export const logout = () =>
  client.post('/auth/logout').then((r) => r.data)

export const checkEmail = (email) => 
  client.get(`/auth/check-email?email=${email}`).then((r) => r.data)
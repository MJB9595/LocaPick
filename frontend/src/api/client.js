import axios from 'axios'

// ✅ 프로덕션: nginx 프록시 (/api → backend:8080) 사용
// ✅ 개발:     VITE_API_URL 환경변수 또는 localhost:8080 fallback
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// 요청 인터셉터: 저장된 토큰 자동 첨부
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 401 시 로그아웃 처리
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('authUser')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client

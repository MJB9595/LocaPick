import axios from 'axios'
import { Capacitor } from '@capacitor/core'

// 1. 기존 로직 완벽 유지: 환경변수가 없으면 '/api'를 기본으로 사용
let apiBaseURL = import.meta.env.VITE_API_URL || '/api'

// 2. 안드로이드(모바일 앱) 환경일 때만 상대경로('/api')를 절대경로로 덮어쓰기
// (웹 브라우저에서는 이 코드가 무시되므로 기존 Nginx 프록시 통신이 완벽히 보장됩니다)
if (Capacitor.isNativePlatform() && apiBaseURL === '/api') {
  apiBaseURL = 'https://locapick.mjb.diskstation.me/api'
}

// 기존과 동일하게 client 생성
const client = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// 요청 인터셉터: 저장된 토큰 자동 첨부 (기존 코드 100% 동일)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 401 시 로그아웃 처리 (기존 코드 100% 동일)
client.interceptors.response.use(
  (response) => response, 
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("보안: 유효하지 않은 세션입니다. 로그아웃 처리합니다.");
      
      localStorage.removeItem('accessToken'); 
      localStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      
      // 로그인 페이지로 강제 추방
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default client
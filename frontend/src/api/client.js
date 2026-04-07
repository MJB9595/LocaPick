import axios from 'axios'

// 프로덕션: nginx 프록시 (/api → backend:8080) 사용
// 개발:     VITE_API_URL 환경변수 또는 localhost:8080 fallback
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
  (response) => response, 
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403 ||  error.response.status === 403 )) {
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

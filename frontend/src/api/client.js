import axios from 'axios';
import { Capacitor } from '@capacitor/core'; // 플랫폼 감지를 위해 추가

/**
 * [환경별 BaseURL 설정 로직]
 * 1. 앱(Native): .env의 VITE_API_URL을 최우선으로 사용 (절대 경로 필수)
 * 2. 웹(Browser): VITE_API_URL이 있으면 사용하고, 없으면 기존처럼 '/api' 사용
 */
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // 안드로이드/iOS 앱 환경인 경우
  if (Capacitor.isNativePlatform()) {
    // 앱은 상대 경로(/api)를 인식 못하므로 반드시 절대 주소가 필요합니다.
    return envUrl || 'https://locapick.mjb.diskstation.me'; 
  }
  
  // 일반 웹 브라우저 환경인 경우 (기존 로직 유지)
  return envUrl || '/api';
};

const client = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// 요청 인터셉터: 저장된 토큰 자동 첨부
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 시 로그아웃 처리
client.interceptors.response.use(
  (response) => response, 
  (error) => {
    // 401(미인증) 또는 403(권한없음) 에러 시 처리
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("보안: 유효하지 않은 세션입니다. 로그아웃 처리합니다.");
      
      // 로컬/세션 스토리지 정리
      localStorage.removeItem('accessToken'); 
      localStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      
      // 앱 환경에서 강제 이동 시 라우팅 꼬임을 방지하기 위해 간단히 처리
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default client;
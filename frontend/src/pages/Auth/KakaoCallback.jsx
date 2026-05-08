import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/auth.store'

/**
 * 카카오 OAuth 콜백 처리 페이지
 * 백엔드가 /kakao-callback?token=...&memberId=...&name=...&email=...&role=...&profileImageUrl=... 로 리디렉션
 * 또는 에러 시: /login?error=kakao_cancelled
 */
const KakaoCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const token          = searchParams.get('token')
    const error          = searchParams.get('error')

    // 에러가 있거나 토큰이 없으면 로그인 페이지로
    if (error || !token) {
      const msg = error || 'kakao_failed'
      const errorDesc = searchParams.get('error_desc')
      let url = `/login?error=${encodeURIComponent(msg)}`
      if (errorDesc) {
        url += `&error_desc=${encodeURIComponent(errorDesc)}`
      }
      navigate(url, { replace: true })
      return
    }

    const memberId       = Number(searchParams.get('memberId'))
    const name           = searchParams.get('name')          || ''
    const email          = searchParams.get('email')         || ''
    const role           = searchParams.get('role')          || 'USER'
    const profileImageUrl = searchParams.get('profileImageUrl') || ''

    // auth store에 저장 (localStorage 포함)
    // updateUser 함수도 auth store에서 꺼내와서 활용 가능 (현재는 login으로 덮어씀)
    login(token, { memberId, name, email, role, profileImageUrl })

    const proceedToNext = () => {
      // 어드민이면 /admin, 일반 유저면 /app
      navigate(role === 'ADMIN' ? '/admin' : '/app', { replace: true })
    }

    // 만약 profileImageUrl이 비어있다면 (백엔드에서 길이가 너무 길어 잘라낸 경우)
    // 백엔드 API를 직접 호출해서 유저 정보를 다시 가져온 뒤 프로필 이미지를 채워넣습니다!
    if (!profileImageUrl) {
      fetch('/api/members/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.profileImageUrl) {
          // 백엔드에서 가져온 실제 (긴 Base64) 이미지로 덮어쓰기!
          login(token, { memberId, name, email, role, profileImageUrl: data.profileImageUrl })
        }
        proceedToNext()
      })
      .catch(err => {
        console.error('프로필 이미지 가져오기 실패:', err)
        proceedToNext()
      })
    } else {
      proceedToNext()
    }

  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: '16px',
      fontFamily: 'sans-serif',
      color: '#6b7280',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #6d28d9',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p>카카오 로그인 처리 중...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default KakaoCallback
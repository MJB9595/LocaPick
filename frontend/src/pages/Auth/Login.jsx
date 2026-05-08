import React, { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/auth.store'
import { login as loginApi } from '../../api/auth.api'
import './auth.scss'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 회원가입 완료 후 넘어온 메시지
  const successMsg = location.state?.message || ''

  // 카카오 로그인 취소/에러 시 넘어온 에러
  const kakaoError = searchParams.get('error')
  const kakaoErrorDesc = searchParams.get('error_desc')
  
  if (kakaoError === 'kakao_error' && kakaoErrorDesc) {
    console.error("카카오 로그인 백엔드 에러 상세:", kakaoErrorDesc);
  }

  const kakaoErrorMsg = kakaoError
    ? (kakaoError === 'kakao_cancelled' ? '카카오 로그인이 취소되었습니다.' : `카카오 로그인 중 오류가 발생했습니다. (사유: ${kakaoErrorDesc || '알 수 없음'})`)
    : ''

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('이메일과 비밀번호를 입력해 주세요.')
      return
    }
    try {
      setLoading(true)
      const data = await loginApi(form)
      login(data.accessToken, {
        memberId: data.memberId,
        name: data.name,
        email: data.email,
        role: data.role,
        profileImageUrl: data.profileImageUrl,
      })
      navigate(data.role === 'ADMIN' ? '/admin' : '/app', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // ✅ 카카오 로그인: 백엔드 OAuth 진입점으로 브라우저 이동
  const handleKakaoLogin = () => {
    const base = import.meta.env.VITE_API_URL || '/api'
    // 브라우저가 302 리다이렉트를 캐시하여 옛날 코드(Code)를 재사용(KOE320 에러)하는 것을 방지하기 위해 타임스탬프 추가
    window.location.href = `${base}/auth/kakao?t=${new Date().getTime()}`
  }

  return (
    <section className="auth-section app-bg">
      <div className="auth-card">
        <span className="auth-logo">LocaPick</span>
        <h1 className="auth-title">로그인</h1>
        <p className="auth-sub">계정에 접속해 사진과 메모를 확인하세요</p>

        {successMsg && <p className="auth-success">{successMsg}</p>}
        {kakaoErrorMsg && <p className="auth-error">{kakaoErrorMsg}</p>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email" name="email" type="email"
              placeholder="example@email.com"
              value={form.email} onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password" name="password" type="password"
              placeholder="비밀번호를 입력하세요"
              value={form.password} onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        {/* ✅ 소셜 로그인 구분선 */}
        <div className="auth-divider">
          <span>또는</span>
        </div>

        {/* ✅ 카카오 로그인 버튼 */}
        <button type="button" className="kakao-btn" onClick={handleKakaoLogin}>
          <svg className="kakao-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C7.029 3 3 6.363 3 10.5C3 13.05 4.545 15.3 6.9 16.65L6 21L10.35 18.45C10.89 18.525 11.445 18.6 12 18.6C16.971 18.6 21 15.237 21 10.5C21 6.363 16.971 3 12 3Z" fill="#3C1E1E" />
          </svg>
          카카오로 로그인
        </button>

        <p className="auth-footer">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </section>
  )
}

export default Login
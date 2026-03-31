import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth.store'
import { login as loginApi } from '../../api/auth.api'
import './auth.scss'

const Login = () => {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // 회원가입 완료 후 넘어온 메시지
  const successMsg = location.state?.message || ''

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
        memberId : data.memberId,
        name     : data.name,
        email    : data.email,
        role     : data.role,
        profileImageUrl: data.profileImageUrl
      })
      navigate(data.role === 'ADMIN' ? '/admin' : '/app', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-section app-bg">
      <div className="auth-card">
        <span className="auth-logo">LocaPick</span>
        <h1 className="auth-title">로그인</h1>
        <p className="auth-sub">계정에 접속해 사진과 메모를 확인하세요</p>

        {successMsg && <p className="auth-success">{successMsg}</p>}

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

        <p className="auth-footer">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </section>
  )
}

export default Login

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup as signupApi } from '../../api/auth.api'
import './auth.scss'

const Signup = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', passwordConfirm: '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // 전화번호 하이픈 자동 생성기
  const formatPhoneNumber = (value) => {
    if (!value) return '';
    // 숫자 이외의 문자는 모두 제거
    const onlyNums = value.replace(/[^\d]/g, '');
    
    // 길이에 맞춰 하이픈 삽입
    if (onlyNums.length <= 3) return onlyNums;
    if (onlyNums.length <= 7) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
    // 최대 11자리까지만 허용 (010-1234-5678)
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 7)}-${onlyNums.slice(7, 11)}`;
  }

  const [isEmailChecked, setIsEmailChecked] = useState(false);

  const handleCheckEmail = async () => {
    if (!form.email.includes('@')) return alert("올바른 이메일을 입력하세요.");
    try {
      const res = await checkEmail(form.email);
      if (res.available) {
        alert("사용 가능한 이메일입니다.");
        setIsEmailChecked(true);
      } else {
        alert("이미 존재하는 이메일입니다.");
        setIsEmailChecked(false);
      }
    } catch (e) { alert("서버 오류"); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // name이 phone일 경우 포맷팅 적용
    if (name === 'phone') {
      finalValue = formatPhoneNumber(value);
    }

    setForm((prev) => ({ ...prev, [name]: finalValue }))
    setError('')
  }

  const validate = () => {
    if (!form.name) return '이름을 입력해 주세요.'
    
    // 이메일 정규식 검사 추가
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email) return '이메일을 입력해 주세요.'
    if (!emailRegex.test(form.email)) return '유효한 이메일 형식을 입력해 주세요.'
    
    if (!form.password) return '비밀번호를 입력해 주세요.'
    if (form.password.length < 6) return '비밀번호는 최소 6자 이상이어야 합니다.'
    if (form.password !== form.passwordConfirm) return '비밀번호 확인이 일치하지 않습니다.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    try {
      setLoading(true)
      await signupApi({
        name: form.name, 
        email: form.email,
        phone: form.phone || null,
        password: form.password, 
        passwordConfirm: form.passwordConfirm,
      })
      navigate('/login', { state: { message: '회원가입 완료! 로그인해 주세요.' } })
    } catch (err) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-section app-bg">
      <div className="auth-card">
        <span className="auth-logo">LocaPick</span>
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-sub">새 계정을 만들어 LocaPick을 시작하세요</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">이름 <span className="required">*</span></label>
            <input id="name" name="name" type="text" placeholder="홍길동"
              value={form.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일 <span className="required">*</span></label>
            <input id="email" name="email" type="email" placeholder="example@email.com"
              value={form.email} onChange={handleChange} autoComplete="email" />
          </div>

          <div className="form-group">
            <label htmlFor="phone">전화번호 <span className="optional">(선택)</span></label>
            {/* type="text" 로 변경 (tel은 모바일 키보드용, maxLength 설정으로 길이 제한) */}
            <input id="phone" name="phone" type="text" placeholder="010-0000-0000" maxLength="13"
              value={form.phone} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호 <span className="required">*</span></label>
            <input id="password" name="password" type="password" placeholder="최소 6자 이상"
              value={form.password} onChange={handleChange} autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인 <span className="required">*</span></label>
            <input id="passwordConfirm" name="passwordConfirm" type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={form.passwordConfirm} onChange={handleChange} autoComplete="new-password" />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '처리 중…' : '회원가입'}
          </button>
        </form>

        <p className="auth-footer">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </section>
  )
}

export default Signup
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../store/auth.store'
import { getMembers } from '../../api/member.api'
import { updateMemberStatus } from '../../api/member.api' // 새로 추가한 API 임포트
import './AdminDashboard.scss'

const STATUS_LABEL = { ACTIVE: '활성', SUSPENDED: '정지', DELETED: '탈퇴' }
const ROLE_LABEL   = { USER: '유저', ADMIN: '관리자' }

const AdminDashboard = () => {
  const { user }  = useAuth()
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState('')
  const [search,  setSearch]    = useState('')

  useEffect(() => {
    fetchMembers()
  }, [])

  // 회원 목록 새로고침을 위한 함수 분리
  const fetchMembers = () => {
    setLoading(true)
    getMembers()
      .then(setMembers)
      .catch(() => setError('회원 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  // 상태 변경 핸들러
  const handleStatusChange = async (memberId, newStatus) => {
    if (!window.confirm(`정말 ${STATUS_LABEL[newStatus]} 상태로 변경하시겠습니까?`)) return;

    try {
      await updateMemberStatus(memberId, newStatus);
      // 성공 시 로컬 상태 업데이트 (화면 즉시 반영)
      setMembers(members.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
      alert('상태가 변경되었습니다.');
    } catch (err) {
      alert(err.response?.data?.message || '상태 변경에 실패했습니다.');
    }
  }

  const filtered = members.filter(
    (m) => m.name.includes(search) || m.email.includes(search)
  )

  const stats = [
    { label: '전체 회원',   value: members.length,                                  color: 'default' },
    { label: '활성 회원',   value: members.filter(m => m.status === 'ACTIVE').length, color: 'active'  },
    { label: '관리자',      value: members.filter(m => m.role === 'ADMIN').length,    color: 'admin'   },
    { label: '정지 회원',   value: members.filter(m => m.status === 'SUSPENDED').length, color: 'warn' },
  ]

  return (
    <main className="admin page app-bg">
      <div className="container">

        <div className="admin-header">
          <div>
            <h1>어드민 대시보드</h1>
            <p>관리자 <strong>{user?.name}</strong>으로 로그인 중</p>
          </div>
        </div>

        {/* 통계 */}
        <div className="admin-stats">
          {stats.map((s) => (
            <div key={s.label} className={`stat-card card stat-card--${s.color}`}>
              <span className="stat-card__num">{s.value}</span>
              <span className="stat-card__label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* 회원 목록 */}
        <div className="admin-table-wrap card">
          <div className="admin-table-top">
            <h2>회원 목록</h2>
            <input
              type="text"
              placeholder="이름 또는 이메일 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-search"
            />
          </div>

          {loading && <p className="admin-msg">불러오는 중…</p>}
          {error   && <p className="admin-msg admin-msg--error">{error}</p>}

          {!loading && !error && (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    {['ID','이름','이메일','전화번호','역할','상태 관리','가입일'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="admin-table__empty">검색 결과가 없습니다.</td></tr>
                  ) : filtered.map((m) => (
                    <tr key={m.id}>
                      <td className="td-id">{m.id}</td>
                      <td>{m.name}</td>
                      <td className="td-email">{m.email}</td>
                      <td>{m.phone || '—'}</td>
                      <td>
                        <span className={`tbadge tbadge--role-${m.role.toLowerCase()}`}>
                          {ROLE_LABEL[m.role] ?? m.role}
                        </span>
                      </td>
                      <td>
                        <select
                          value={m.status}
                          onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          className={`tbadge tbadge--status-${m.status.toLowerCase()}`}
                          style={{ cursor: 'pointer', outline: 'none', appearance: 'auto' }}
                        >
                          <option value="ACTIVE" style={{ color: '#000', background: '#fff' }}>활성</option>
                          <option value="SUSPENDED" style={{ color: '#000', background: '#fff' }}>정지</option>
                          <option value="DELETED" style={{ color: '#000', background: '#fff' }}>탈퇴</option>
                        </select>
                      </td>
                      <td className="td-date">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('ko-KR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}

export default AdminDashboard
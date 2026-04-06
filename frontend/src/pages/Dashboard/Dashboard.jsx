import React from 'react'
import { useAuth } from '../../store/auth.store'
import './Dashboard.scss'

const Dashboard = () => {
  const { user } = useAuth()

  return (
    <main className="dashboard page app-bg">
      <div className="container">

        <div className="dashboard-welcome">
          <h1>안녕하세요, <span className="highlight">{user?.name}</span>님 👋</h1>
        </div>

        <div className="dashboard-cards">
          {[
            { icon: '📸', title: '내 사진',  desc: '업로드한 사진을 확인하고 관리하세요.' },
            { icon: '📝', title: '메모',     desc: '사진에 메모를 달고 감정을 기록하세요.' },
            { icon: '🔍', title: '검색',     desc: '키워드로 사진과 메모를 빠르게 찾아보세요.' },
          ].map((card) => (
            <div key={card.title} className="d-card card">
              <span className="d-card__icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <button className="d-card__btn" disabled>준비 중</button>
            </div>
          ))}
        </div>

        <div className="dashboard-info card">
          <h2>내 계정 정보</h2>
          <table className="info-table">
            <tbody>
              <tr><th>이름</th><td>{user?.name}</td></tr>
              <tr><th>이메일</th><td>{user?.email}</td></tr>
              <tr>
                <th>역할</th>
                <td>
                  <span className={`role-badge role-badge--${user?.role?.toLowerCase()}`}>
                    {user?.role === 'ADMIN' ? '관리자' : '일반 유저'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}

export default Dashboard

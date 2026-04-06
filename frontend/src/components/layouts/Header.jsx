// src/components/layouts/Header.jsx (경로에 맞게 확인)
import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { logout as logoutApi } from '../../api/auth.api';
import './Header.scss';

// 🌟 추가: 마이페이지에 있던 SVG 생성 로직 복사
const generateAvatarSvg = (name) => {
  const initial = name ? name.charAt(0) : '?';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#8b5cf6'/><text x='50' y='50' font-size='45' fill='#ffffff' font-weight='bold' text-anchor='middle' dominant-baseline='central'>${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const Header = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await logoutApi(); } catch { /* 무시 */ }
    logout();
    setIsMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setIsMenuOpen(false);

  // 🌟 추가: 유저 이미지가 없으면 SVG를 기본값으로 사용
  const avatarSrc = user?.profileImageUrl || generateAvatarSvg(user?.name);

  return (
    <header className="header">
      <div className="header-inner container">
        
        <Link to={isAdmin ? '/admin' : '/app'} className="header-logo" onClick={closeMenu}>
          LocaPick
        </Link>

        <div className="header-right">
          <div className="header-user-info">
            {/* 🌟 수정: 조건부 렌더링을 빼고 무조건 avatarSrc를 띄우도록 변경 */}
            <img 
              src={avatarSrc} 
              alt="프로필" 
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span className="name">{user?.name}</span>
            {isAdmin && <span className="badge">ADMIN</span>}
          </div>
          
          <button 
            className={`hamburger-btn ${isMenuOpen ? 'open' : ''}`} 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="메뉴 열기"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

      </div>

      {/* 사이드바 메뉴 부분은 기존과 동일... */}
      <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
        <nav className="side-nav">
          <NavLink to="/app" end className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>홈</NavLink>
          <NavLink to="/app/mypage" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>마이페이지</NavLink>
          <NavLink to="/app/favorites" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>즐겨찾기</NavLink>
          <NavLink to="/app/memo" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>메모</NavLink>
          <NavLink to="/app/chat" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>채팅방</NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>어드민</NavLink>
          )}
        </nav>
        <div className="side-menu__footer">
          <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </div>
      {isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}
    </header>
  );
};

export default Header;
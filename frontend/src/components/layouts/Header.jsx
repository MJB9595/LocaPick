import React, { useState } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../store/auth.store';
import { logout as logoutApi } from '../../api/auth.api';
import './Header.scss';

const Header = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try { await logoutApi(); } catch { /* 무시 */ }
    logout();
    setIsMenuOpen(false); // 로그아웃 시 메뉴 닫기
    navigate('/login', { replace: true });
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="header">
      <div className="header-inner container">
        
        {/* 로고 */}
        <Link to={isAdmin ? '/admin' : '/app'} className="header-logo" onClick={closeMenu}>
          LocaPick
        </Link>

        {/* 우측 영역: 유저 정보 + 햄버거 버튼 */}
        <div className="header-right">
          <div className="header-user-info">
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

      {/* 🌟 사이드바 메뉴 */}
      <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
        <nav className="side-nav">
          <NavLink to="/app" end className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            홈
          </NavLink>
          <NavLink to="/app/mypage" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            마이페이지
          </NavLink>
          <NavLink to="/app/favorites" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            즐겨찾기
          </NavLink>
          <NavLink to="/app/memo" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            메모
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `side-nav__link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              어드민
            </NavLink>
          )}
        </nav>
        
        <div className="side-menu__footer">
          <button className="logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 🌟 어두운 배경 오버레이 (클릭 시 메뉴 닫힘) */}
      {isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}

    </header>
  );
};

export default Header;
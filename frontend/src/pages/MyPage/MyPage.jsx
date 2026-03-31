import React, { useState, useEffect, useRef } from 'react';
import { getMyInfo, uploadProfileImage } from '../../api/member.api';
import { getMyPosts } from '../../api/post.api';
import { getMyFavorites } from '../../api/favorite.api';
import { useAuth } from '../../store/auth.store';
import './MyPage.scss';

const generateAvatarSvg = (name) => {
  const initial = name ? name.charAt(0) : '?';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#8b5cf6'/><text x='50' y='50' font-size='45' fill='#ffffff' font-weight='bold' text-anchor='middle' dominant-baseline='central'>${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

// 🌟 기본 카테고리 아이콘 맵핑
const DEFAULT_CATEGORIES = [
  { id: 'date', icon: '💑' },
  { id: 'restaurant', icon: '🍽️' },
  { id: 'cafe', icon: '☕' },
  { id: 'parking', icon: '🅿️' },
  { id: 'uncategorized', icon: '📁' },
];

const MyPage = () => {
  const [userInfo, setUserInfo]       = useState(null);
  const [myPosts, setMyPosts]         = useState([]);
  const [myFavorites, setMyFavorites] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { user, updateUser } = useAuth();
  
  const [imgSrc, setImgSrc] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { fetchAllData(); }, []);

  const getProfileImageUrl = (url, name) => {
    if (!url) return generateAvatarSvg(name);
    return url; 
  };

  const fetchAllData = async () => {
    try {
      const [userData, posts, favs] = await Promise.all([
        getMyInfo(), getMyPosts(), getMyFavorites(),
      ]);
      setUserInfo(userData);
      setMyPosts(posts);
      setMyFavorites(favs);
      
      setImgSrc(getProfileImageUrl(userData.profileImageUrl, userData.name));
    } catch (err) {
      console.error('마이페이지 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('이미지 파일만 업로드 가능합니다.');
    
    try {
      setIsUploading(true);
      const res = await uploadProfileImage(file);
      const newUrl = res.profileImageUrl;
      setUserInfo(prev => ({ ...prev, profileImageUrl: newUrl }));
      setImgSrc(getProfileImageUrl(newUrl, userInfo?.name));
      if (updateUser) updateUser({ profileImageUrl: newUrl });
      alert('프로필 사진이 변경되었습니다!');
    } catch (err) {
      console.error('🚨 업로드 실패:', err);
      alert('업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      e.target.value = ''; 
    }
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = generateAvatarSvg(userInfo?.name);
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('ko-KR');

  // 🌟 카테고리 ID를 기반으로 아이콘을 찾아주는 함수 (커스텀 태그 포함)
  const getCategoryIcon = (categoryId) => {
    if (!categoryId || categoryId === 'uncategorized') return '📁';
    
    // 1. 기본 카테고리에서 검색
    const defCat = DEFAULT_CATEGORIES.find(c => c.id === categoryId);
    if (defCat) return defCat.icon;

    // 2. 사용자가 만든 커스텀 카테고리에서 검색
    const storageKey = `locapick_custom_tags_${user?.email || 'guest'}`;
    try {
      const customCats = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const custom = customCats.find(c => c.id === categoryId);
      if (custom) return custom.icon;
    } catch (e) {}

    return '📌'; // 둘 다 없으면 기본 핀
  };

  if (loading) return <main className="mypage-root app-bg"><div className="loading-text">로딩중...</div></main>;
  if (!userInfo) return null;

  const isAdmin = userInfo.role === 'ADMIN';

  return (
    <main className="mypage-root app-bg">
      <div className="mypage-wrapper">
        
        <header className="page-title-area">
          <h1>마이페이지</h1>
          <p>내 프로필과 기록들을 한눈에 확인하세요.</p>
        </header>

        <section className="profile-container card">
          <div className="avatar-section">
            <div className="avatar-circle" onClick={() => !isUploading && fileInputRef.current.click()}>
              <img 
                src={imgSrc} 
                alt="프로필" 
                onError={handleImageError}
                style={{ opacity: isUploading ? 0.3 : 1 }} 
              />
              <div className="cam-icon">📷 프로필</div>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          <div className="info-section">
            <div className="name-email">
              <h2>{userInfo.name}</h2>
              <p>{userInfo.email}</p>
            </div>
            <hr className="solid-line" />
            <div className="stats-grid">
              <div className="stat-box"><span className="s-label">가입일</span><span className="s-value">{formatDate(userInfo.createdAt)}</span></div>
              <div className="stat-box"><span className="s-label">즐겨찾기</span><span className="s-value">{myFavorites.length}개</span></div>
              <div className="stat-box"><span className="s-label">메모</span><span className="s-value">{myPosts.length}개</span></div>
              <div className="stat-box"><span className="s-label">권한</span><span className={`status-badge ${isAdmin ? 'is-admin' : 'is-user'}`}>{isAdmin ? '관리자' : '일반 유저'}</span></div>
            </div>
          </div>
        </section>

        {/* ── 대시보드 ── */}
        <div className="board-container">
          <div className="board-card card">
            <div className="b-header">
              <h3>⭐ 최근 즐겨찾기</h3>
              <span className="badge-count">{myFavorites.length}</span>
            </div>
            <div className="b-body">
              {myFavorites.length === 0 ? <div className="empty-msg">내역이 없습니다.</div> : (
                <ul className="b-list">
                  {myFavorites.slice(0, 5).map(fav => (
                    <li key={fav.id}>
                      {/* 🌟 각 카테고리에 맞는 이모지 렌더링 */}
                      <span className="i-emoji">{getCategoryIcon(fav.category)}</span>
                      <div className="i-text">
                        <strong>{fav.placeName}</strong>
                        <span>{fav.address}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="board-card card">
            <div className="b-header">
              <h3>✏️ 최근 작성한 메모</h3>
              <span className="badge-count">{myPosts.length}</span>
            </div>
            <div className="b-body">
              {myPosts.length === 0 ? <div className="empty-msg">내역이 없습니다.</div> : (
                <ul className="b-list">
                  {myPosts.slice(0, 5).map(post => (
                    <li key={post.id}>
                      <span className="i-emoji">📝</span>
                      <div className="i-text">
                        <strong>{post.title}</strong>
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
};

export default MyPage;
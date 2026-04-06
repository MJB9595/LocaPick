import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 🌟 페이지 이동을 위한 훅 추가
import { getMyInfo, uploadProfileImage } from '../../api/member.api';
import { getMyPosts } from '../../api/post.api';
import { getMyFavorites } from '../../api/favorite.api';
import { useLocation } from 'react-router-dom';
import './MyPage.scss';

// 자체 SVG 아바타 생성 (외부 API X)
const generateAvatarSvg = (name) => {
  const initial = name ? name.charAt(0) : '?';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#8b5cf6'/><text x='50' y='50' font-size='45' fill='#ffffff' font-weight='bold' text-anchor='middle' dominant-baseline='central'>${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const MyPage = () => {
  const navigate = useNavigate(); // 🌟 네비게이션 함수 초기화
  const [userInfo, setUserInfo]       = useState(null);
  const [myPosts, setMyPosts]         = useState([]);
  const [myFavorites, setMyFavorites] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [user, posts, favs] = await Promise.all([
        getMyInfo(), getMyPosts(), getMyFavorites(),
      ]);
      setUserInfo(user);
      setMyPosts(posts);
      setMyFavorites(favs);
      
      // 이미지 URL 세팅
      if (!user.profileImageUrl) {
        setImgSrc(generateAvatarSvg(user.name));
      } else if (user.profileImageUrl.startsWith('http') || user.profileImageUrl.startsWith('data:')) {
        setImgSrc(user.profileImageUrl);
      } else {
        setImgSrc(`${import.meta.env.VITE_API_URL || ''}${user.profileImageUrl}`);
      }
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
      setUserInfo(prev => ({ ...prev, profileImageUrl: res.profileImageUrl }));
      setImgSrc(`${import.meta.env.VITE_API_URL || ''}${res.profileImageUrl}`);
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

  // 클릭 이벤트 핸들러 모음
  const goToFavorites = () => navigate('/app/favorites');
  const goToMemos = () => navigate('/app/memo');
  const goToChat = () => navigate('/app/chat');
  
 // 마이페이지에서 클릭 시 데이터를 실어서 보내는 함수들
  const handleFavoriteItemClick = (fav) => {
    navigate('/app', { state: { destination: fav } }); // MapHome으로 fav 데이터 던지기
  };

  const handleMemoItemClick = (post) => {
    navigate(`/app/memo/${post.id}`);
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

        {/* ── 프로필 섹션 ── */}
        <section className="profile-container card">
          <div className="avatar-section">
            <div className="avatar-circle" onClick={() => !isUploading && fileInputRef.current.click()}>
              <img src={imgSrc} alt="프로필" onError={handleImageError} style={{ opacity: isUploading ? 0.3 : 1 }} />
              <div className="cam-icon">📷</div>
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
              <div className="stat-box">
                <span className="s-label">권한</span>
                <span className={`status-badge ${isAdmin ? 'is-admin' : 'is-user'}`}>{isAdmin ? '관리자' : '일반 유저'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 대시보드 ── */}
        <div className="board-container">

          {/* 🌟 1:1 채팅 문의 */}
          <div className="board-card card clickable-card" onClick={goToChat}>
            <div className="b-header">
              <h3>💬 1:1 채팅 문의</h3>
              <div className="h-right">
                <span className="badge-count">New</span>
                <span className="more-icon">❯</span>
              </div>
            </div>
            <div className="b-body">
              <div className="chat-shortcut">
                <p>진행 중인 대화가 있나요?</p>
                <span>상대방과 실시간으로 소통해 보세요.</span>
              </div>
            </div>
          </div>

          {/* 🌟 최근 즐겨찾기 */}
          <div className="board-card card">
            <div className="b-header clickable-header" onClick={goToFavorites} title="전체 즐겨찾기 보기">
              <h3>⭐ 최근 즐겨찾기</h3>
              <div className="h-right">
                <span className="badge-count">{myFavorites.length}</span>
                <span className="more-icon">❯</span>
              </div>
            </div>
            <div className="b-body">
              {myFavorites.length === 0 ? <div className="empty-msg">내역이 없습니다.</div> : (
                <ul className="b-list">
                  {myFavorites.slice(0, 5).map(fav => (
                    <li key={fav.id} className="clickable-item" onClick={() => handleFavoriteItemClick(fav)} title="지도로 이동">
                      <span className="i-emoji">📍</span>
                      <div className="i-text">
                        <strong>{fav.placeName}</strong>
                        <span>{fav.address || '주소 없음'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 🌟 최근 작성한 메모 */}
          <div className="board-card card">
            <div className="b-header clickable-header" onClick={goToMemos} title="전체 메모 보기">
              <h3>✏️ 최근 작성한 메모</h3>
              <div className="h-right">
                <span className="badge-count">{myPosts.length}</span>
                <span className="more-icon">❯</span>
              </div>
            </div>
            <div className="b-body">
              {myPosts.length === 0 ? <div className="empty-msg">내역이 없습니다.</div> : (
                <ul className="b-list">
                  {myPosts.slice(0, 5).map(post => (
                    <li key={post.id} className="clickable-item" onClick={() => handleMemoItemClick(post)} title="메모 상세보기">
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
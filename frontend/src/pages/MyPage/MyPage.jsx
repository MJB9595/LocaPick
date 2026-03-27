import React, { useState, useEffect } from 'react';
import { getMyInfo } from '../../api/member.api';
import { getMyPosts } from '../../api/post.api';
import { getMyFavorites } from '../../api/favorite.api';

const MyPage = () => {
  // 3가지 데이터를 담을 바구니(State)
  const [userInfo, setUserInfo] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [myFavorites, setMyFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // 🌟 Promise.all을 사용해 3가지 API를 동시에 쏴서 속도를 높입니다.
      const [user, posts, favs] = await Promise.all([
        getMyInfo(),
        getMyPosts(),
        getMyFavorites()
      ]);
      
      setUserInfo(user);
      setMyPosts(posts);
      setMyFavorites(favs);
    } catch (error) {
      console.error("마이페이지 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 데이터가 오기 전에는 로딩 화면 렌더링
  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>데이터를 불러오는 중...</div>;
  if (!userInfo) return <div style={{ padding: '100px', textAlign: 'center' }}>로그인이 필요합니다.</div>;

  return (
    <div style={{ padding: '100px 20px', maxWidth: '800px', margin: '0 auto', color: 'var(--text, #333)' }}>
      <h1>👤 마이페이지</h1>
      <hr style={{ margin: '20px 0' }} />

      {/* 1. 내 정보 구역 */}
      <section style={{ marginBottom: '40px' }}>
        <h2>📝 기본 정보</h2>
        <p><strong>이름:</strong> {userInfo.name}</p>
        <p><strong>이메일:</strong> {userInfo.email}</p>
        <p><strong>가입일:</strong> {new Date(userInfo.createdAt).toLocaleDateString()}</p>
      </section>

      {/* 2. 내 즐겨찾기 구역 */}
      <section style={{ marginBottom: '40px' }}>
        <h2>⭐ 내 즐겨찾기 ({myFavorites.length}개)</h2>
        <ul>
          {myFavorites.length === 0 ? <p>즐겨찾기한 장소가 없습니다.</p> : null}
          {myFavorites.map(fav => (
            <li key={fav.id} style={{ marginBottom: '10px' }}>
              <strong>{fav.placeName}</strong> <br/>
              <span style={{ fontSize: '0.9em', color: 'gray' }}>{fav.address}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. 내 장소 메모 구역 */}
      <section style={{ marginBottom: '40px' }}>
        <h2>✏️ 내가 쓴 메모 ({myPosts.length}개)</h2>
        <ul>
          {myPosts.length === 0 ? <p>작성한 메모가 없습니다.</p> : null}
          {myPosts.map(post => (
            <li key={post.id} style={{ marginBottom: '15px', border: '1px solid #ccc', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8em', background: '#eee', padding: '3px 6px', borderRadius: '4px' }}>{post.category}</span>
              <h4 style={{ margin: '5px 0' }}>{post.title}</h4>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9em' }}>{post.content}</p>
              <small style={{ color: 'gray' }}>{new Date(post.createdAt).toLocaleDateString()}</small>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
};

export default MyPage;
import React, { useState, useEffect } from 'react';
import { getMyFavorites } from '../../api/favorite.api'; // 경로 주의

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await getMyFavorites();
        setFavorites(data);
      } catch (error) {
        console.error("즐겨찾기를 불러오는 중 오류 발생:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  return (
    <div className="page container" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
      <h1>⭐ 내 즐겨찾기 목록</h1>
      <hr />
      
      {isLoading ? (
        <p>불러오는 중...</p>
      ) : favorites.length === 0 ? (
        <p>아직 등록된 즐겨찾기가 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {favorites.map((fav) => (
            <li key={fav.id} style={{ borderBottom: '1px solid #ddd', padding: '15px 0' }}>
              <h3 style={{ margin: '0 0 5px 0' }}>{fav.placeName}</h3>
              <p style={{ margin: 0, color: '#666' }}>주소: {fav.address || '주소 정보 없음'}</p>
              <small style={{ color: '#999' }}>
                등록일: {new Date(fav.createdAt).toLocaleDateString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Favorites;
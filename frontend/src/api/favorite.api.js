// src/api/favorite.api.js
import client from './client';

// 내 즐겨찾기 목록 가져오기
export const getMyFavorites = () => 
  client.get('/favorites').then((r) => r.data);

// 즐겨찾기 추가/삭제 (Toggle)
export const toggleFavorite = (placeData) => 
  client.post('/favorites/toggle', placeData).then((r) => r.data);

// 카테고리 업데이트 통신
export const updateFavoriteCategory = (id, category) => 
  client.patch(`/favorites/${id}/category`, { category }).then((r) => r.data);

export const getMyTags = () => 
  client.get('/favorites/tags').then((r) => r.data);
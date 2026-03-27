// src/api/post.api.js
import client from './client';

// 전체 메모(게시글) 불러오기
export const getPosts = () => 
  client.get('/posts').then((r) => r.data);

// 새 메모 작성하기
export const createPost = (data) => 
  client.post('/posts', data).then((r) => r.data);

// 기존 메모 수정하기
export const updatePost = (id, data) => 
  client.patch(`/posts/${id}`, data).then((r) => r.data);

// 메모 삭제하기
export const deletePost = (id) => 
  client.delete(`/posts/${id}`).then((r) => r.data);

export const getMyPosts = () => 
  client.get('/posts/my').then((r) => r.data);
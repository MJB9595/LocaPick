// src/pages/Memo/Memo.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPosts, deletePost } from '../../api/post.api';
import { useLocation } from 'react-router-dom'; // 🌟 추가
import './Memo.scss';

const Memo = () => {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  const location = useLocation();

  // 핵심: 마이페이지에서 'selectedPost' 데이터를 들고 넘어왔을 때 자동 실행
  useEffect(() => {
    if (location.state && location.state.selectedPost) {
      // Memo.jsx에 이미 만들어두신 상세창 여는 함수 호출!
      openPostDetail(location.state.selectedPost);
      
      // 무한 루프 방지
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const postsData = await getMyPosts();
      setPosts(postsData);
    } catch (error) {
      console.error("메모 로드 실패:", error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // 🌟 삭제 버튼 클릭 시 상세 페이지로 넘어가는 것 방지
    if (!window.confirm("정말 이 메모를 삭제하시겠습니까?")) return;
    try {
      await deletePost(id);
      fetchData(); // 삭제 후 목록 새로고침
    } catch (error) { 
      alert("삭제 권한이 없거나 오류가 발생했습니다."); 
    }
  };

  // 🌟 에디터로 작성된 HTML 태그(<p>, <img> 등)를 제거하고 순수 텍스트만 뽑아주는 함수
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  return (
    <div className="memo-page container">
      <div className="memo-header">
        <h2>내 장소 메모장</h2>
        <button className="write-btn" onClick={() => navigate('/app/memo/write')}>+ 새 메모 작성</button>
      </div>

      <div className="memo-grid">
        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>아직 작성된 메모가 없습니다.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="memo-card" onClick={() => navigate(`/app/memo/${post.id}`)}>
              <button 
                className="delete-btn" 
                onClick={(e) => handleDelete(e, post.id)}
              >✕</button>
              
              <span className="category-badge">{post.category}</span>
              <h3 className="memo-title">{post.title}</h3>
              
              {/* 🌟 본문 미리보기: HTML 태그를 지우고 글자만 80자 이내로 보여줌 */}
              <p className="memo-content">
                {stripHtml(post.content)}
              </p>
              
              <div className="memo-meta">
                <span>👤 {post.memberName}</span>
                <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Memo;
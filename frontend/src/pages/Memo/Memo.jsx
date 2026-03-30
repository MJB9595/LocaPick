import React, { useState, useEffect } from 'react';
import { getMyPosts, createPost, updatePost, deletePost } from '../../api/post.api';
import { getMyFavorites } from '../../api/favorite.api';
import './Memo.scss';

const Memo = () => {
  const [posts, setPosts] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  // 모달 상태 관리
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); // 클릭한 메모 데이터
  const [isEditMode, setIsEditMode] = useState(false);    // 상세창에서 수정 모드인지 확인

  // 폼 상태 관리 (작성 및 수정 공용)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('DAILY');
  const [taggedPlace, setTaggedPlace] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

 const fetchData = async () => {
    // 1. 메모 로드 (실패해도 밑에 코드 실행됨)
    try {
      const postsData = await getMyPosts();
      setPosts(postsData);
    } catch (error) {
      console.error("메모 로드 실패:", error);
    }
    
    // 2. 즐겨찾기 로드
    try {
      const favData = await getMyFavorites();
      setFavorites(favData);
    } catch (error) {
      console.error("즐겨찾기 로드 실패:", error);
    }
  };

  // 모달 닫기 및 초기화
  const closeModal = () => {
    setIsCreateModalOpen(false);
    setSelectedPost(null);
    setIsEditMode(false);
    setTitle(''); setContent(''); setCategory('DAILY'); setTaggedPlace('');
  };

  // 상세 모달 열기
  const openPostDetail = (post) => {
    setSelectedPost(post);
    setIsEditMode(false);
    // 수정 모드 진입 시 바로 쓸 수 있게 미리 데이터 세팅
    setTitle(post.title);
    setContent(post.content);
    setCategory(post.category);
  };

  // 새 메모 작성
  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요!");
    
    let finalContent = content;
    if (taggedPlace) finalContent = `[📍 ${taggedPlace}]\n\n${content}`;

    try {
      await createPost({ category, title, content: finalContent });
      alert("메모가 작성되었습니다!");
      closeModal();
      fetchData();
    } catch (error) { alert("작성 중 오류가 발생했습니다."); }
  };

  // 기존 메모 수정
  const handleUpdate = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요!");

    try {
      await updatePost(selectedPost.id, { category, title, content });
      alert("메모가 수정되었습니다!");
      closeModal();
      fetchData();
    } catch (error) { alert("수정 권한이 없거나 오류가 발생했습니다."); }
  };

  // 기존 메모 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말 이 메모를 삭제하시겠습니까?")) return;
    try {
      await deletePost(id);
      closeModal();
      fetchData();
    } catch (error) { alert("삭제 권한이 없거나 오류가 발생했습니다."); }
  };

  return (
    <div className="memo-page container">
      <div className="memo-header">
        <h2>내 장소 메모장</h2>
        <button className="write-btn" onClick={() => setIsCreateModalOpen(true)}>+ 새 메모 작성</button>
      </div>

      {/* 🌟 메모 목록 그리드 */}
      <div className="memo-grid">
        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>아직 작성된 메모가 없습니다.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="memo-card" onClick={() => openPostDetail(post)}>
              <button 
                className="delete-btn" 
                onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}
              >✕</button>
              <span className="category-badge">{post.category}</span>
              <h3 className="memo-title">{post.title}</h3>
              <p className="memo-content">{post.content}</p>
              <div className="memo-meta">
                <span>👤 {post.memberName}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🌟 1. 새 메모 작성 모달 */}
      {isCreateModalOpen && (
        <div className="memo-modal-overlay" onClick={closeModal}>
          <div className="memo-modal" onClick={e => e.stopPropagation()}>
            <h3>✏️ 새 장소 메모</h3>
            <div className="input-group">
              <label>카테고리</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="DAILY">일상</option>
                <option value="TRAVEL">여행</option>
                <option value="HOBBY">취미</option>
                <option value="ETC">기타</option>
              </select>
            </div>
            <div className="input-group">
              <label>장소 태그 (선택)</label>
              <select value={taggedPlace} onChange={e => setTaggedPlace(e.target.value)}>
                <option value="">태그할 장소 선택 안함</option>
                {favorites.map(fav => <option key={fav.id} value={fav.placeName}>{fav.placeName}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>제목</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" />
            </div>
            <div className="input-group">
              <label>내용</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="메모 내용" />
            </div>
            <div className="modal-actions">
              <button className="cancel" onClick={closeModal}>취소</button>
              <button className="submit" onClick={handleCreate}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 2. 메모 상세 보기 & 수정 모달 */}
      {selectedPost && (
        <div className="memo-modal-overlay" onClick={closeModal}>
          <div className="memo-modal" onClick={e => e.stopPropagation()}>
            
            {/* 읽기 모드 */}
            {!isEditMode ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3>{selectedPost.title}</h3>
                  <span className="category-badge" style={{ background: '#eee', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                    {selectedPost.category}
                  </span>
                </div>
                <div className="detail-meta">
                  <span>작성자: {selectedPost.memberName}</span>
                  <span>{new Date(selectedPost.createdAt).toLocaleString()}</span>
                </div>
                <div className="detail-content">{selectedPost.content}</div>
                
                <div className="modal-actions">
                  <button className="danger" onClick={() => handleDelete(selectedPost.id)}>삭제</button>
                  <button className="cancel" onClick={closeModal}>닫기</button>
                  <button className="submit" onClick={() => setIsEditMode(true)}>수정하기</button>
                </div>
              </>
            ) : (
              /* 수정 모드 */
              <>
                <h3>📝 메모 수정</h3>
                <div className="input-group">
                  <label>카테고리</label>
                  <select value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="DAILY">일상</option>
                    <option value="TRAVEL">여행</option>
                    <option value="HOBBY">취미</option>
                    <option value="ETC">기타</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>제목</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>내용</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)} />
                </div>
                
                <div className="modal-actions">
                  <button className="cancel" onClick={() => setIsEditMode(false)}>취소</button>
                  <button className="submit" onClick={handleUpdate}>수정 완료</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Memo;
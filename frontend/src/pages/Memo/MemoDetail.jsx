// src/pages/Memo/MemoDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMyPosts, deletePost } from '../../api/post.api';
import './Memo.scss';

const MemoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const posts = await getMyPosts();
        const found = posts.find(p => p.id === parseInt(id));
        if (found) {
          setPost(found);
        } else {
          alert('존재하지 않는 글이거나 권한이 없습니다.');
          navigate('/app/memo');
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPost();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deletePost(id);
      alert("삭제되었습니다.");
      navigate('/app/memo');
    } catch (e) { 
      alert("삭제 실패"); 
    }
  };

  if (!post) return <div className="memo-page container"><p>불러오는 중...</p></div>;

  return (
    <div className="memo-page container detail-page">
      
      {/* 글 제목 및 메타 정보 */}
      <div className="detail-header">
        <span className="category-badge">{post.category}</span>
        <h1 className="detail-title">{post.title}</h1>
        <div className="detail-meta">
          <span className="author">작성자: {post.memberName}</span>
          <span className="date">{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
        </div>
      </div>
      
      {/* 🌟 핵심: React Quill로 작성된 HTML(사진+글)을 화면에 렌더링하는 부분 */}
      <div 
        className="detail-content ql-editor" 
        dangerouslySetInnerHTML={{ __html: post.content }} 
      />

      {/* 하단 버튼 영역 */}
      <div className="detail-actions">
        <button className="btn-back" onClick={() => navigate('/app/memo')}>목록으로</button>
        <div className="right-btns">
          <button className="btn-edit" onClick={() => navigate(`/app/memo/edit/${post.id}`)}>수정</button>
          <button className="btn-delete" onClick={handleDelete}>삭제</button>
        </div>
      </div>

    </div>
  );
};

export default MemoDetail;
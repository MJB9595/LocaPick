// src/pages/Memo/MemoEdit.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { getMyPosts, updatePost, uploadPostImage } from '../../api/post.api';
import './Memo.scss';

const MemoEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const quillRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); 
  const [category, setCategory] = useState('DAILY');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const posts = await getMyPosts();
        const found = posts.find(p => p.id === parseInt(id));
        if (found) {
          setTitle(found.title);
          setContent(found.content);
          setCategory(found.category);
        } else {
          alert('존재하지 않는 글이거나 권한이 없습니다.');
          navigate('/app/memo');
        }
      } catch (e) {
        console.error(e);
        alert('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate]);

  // 이미지 업로드 핸들러 (Write와 동일)
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (file) {
        try {
          const res = await uploadPostImage(file);
          const imageUrl = res.url;

          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          const index = range ? range.index : editor.getLength();

          editor.insertEmbed(index, 'image', imageUrl);
          editor.setSelection(index + 1);
        } catch (error) {
          console.error('이미지 업로드 실패:', error);
          alert('이미지 업로드에 실패했습니다.');
        }
      }
    });
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
      ],
      handlers: {
        image: imageHandler, 
      }
    }
  }), []);

  // 수정 완료 시 서버로 업데이트 요청
  const handleUpdate = async () => {
    if (!title.trim() || !content.trim() || content === '<p><br></p>') {
      return alert("제목과 내용을 입력해주세요!");
    }
    try {
      // updatePost를 통해 수정 요청을 보냅니다.
      await updatePost(id, { category, title, content });
      alert("메모가 수정되었습니다!");
      navigate(`/app/memo/${id}`, { replace: true }); // 수정 완료 후 상세 페이지로 이동
    } catch (error) {
      alert("수정 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return <div className="memo-page container"><p>기존 메모를 불러오는 중...</p></div>;
  }

  return (
    <div className="memo-page container write-page">
      <div className="memo-header">
        <h2>✏️ 메모 수정</h2>
        <div className="actions">
          {/* 취소 시 바로 이전 페이지(상세 페이지)로 돌아감 */}
          <button className="cancel-btn" onClick={() => navigate(-1)}>취소</button>
          <button className="write-btn submit" onClick={handleUpdate}>수정완료</button>
        </div>
      </div>

      <div className="write-form card">
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-select">
          <option value="DAILY">일상</option>
          <option value="TRAVEL">여행</option>
          <option value="HOBBY">취미</option>
          <option value="ETC">기타</option>
        </select>
        <input 
          type="text" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="제목을 입력하세요." 
          className="w-input"
        />
        
        <div className="editor-container">
          <ReactQuill 
            ref={quillRef}
            theme="snow" 
            modules={modules}
            value={content} 
            onChange={setContent} 
            placeholder="내용을 작성하고 이미지를 첨부해보세요!"
          />
        </div>
      </div>
    </div>
  );
};

export default MemoEdit;
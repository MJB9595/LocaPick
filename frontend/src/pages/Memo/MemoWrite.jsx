// src/pages/Memo/MemoWrite.jsx
import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { createPost, uploadPostImage } from '../../api/post.api';
import './Memo.scss';

const MemoWrite = () => {
  const navigate = useNavigate();
  const quillRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // 에디터의 HTML 내용이 저장됨
  const [category, setCategory] = useState('DAILY');

  // 🌟 핵심: 에디터에서 사진 버튼을 눌렀을 때의 동작 가로채기
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (file) {
        try {
          // 1. 방금 만든 백엔드 DB 저장 API 호출
          const res = await uploadPostImage(file);
          const imageUrl = res.url; // 서버가 돌려준 URL (예: /api/images/1)

          // 2. 에디터 커서 위치에 이미지 태그(<img src="/api/images/1">) 삽입
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          editor.insertEmbed(range.index, 'image', imageUrl);
        } catch (error) {
          console.error(error);
          alert('이미지 서버 업로드에 실패했습니다.');
        }
      }
    });
  };

  // 에디터 툴바 옵션 설정 (이미지 핸들러 연결)
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'], // 이미지 버튼 포함
      ],
      handlers: {
        image: imageHandler, // 이미지 버튼 동작 커스텀
      }
    }
  }), []);

  const handleSave = async () => {
    if (!title.trim() || !content.trim() || content === '<p><br></p>') {
      return alert("제목과 내용을 입력해주세요!");
    }
    try {
      await createPost({ category, title, content });
      alert("메모가 저장되었습니다!");
      navigate('/app/memo'); // 목록으로 돌아가기
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="memo-page container write-page">
      <div className="memo-header">
        <h2>✏️ 메모 작성</h2>
        <div className="actions">
          <button className="cancel-btn" onClick={() => navigate(-1)}>취소</button>
          <button className="write-btn submit" onClick={handleSave}>등록</button>
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

export default MemoWrite;
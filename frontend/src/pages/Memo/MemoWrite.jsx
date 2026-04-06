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

  // src/pages/Memo/MemoWrite.jsx 내부의 imageHandler 함수 수정

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (file) {
        try {
          // 1. 서버에 업로드
          const res = await uploadPostImage(file);
          const imageUrl = res.url;

          // 2. 에디터 인스턴스 가져오기
          const editor = quillRef.current.getEditor();
          
          // 3. 현재 커서 위치(선택 영역) 가져오기
          const range = editor.getSelection();
          
          // range가 null이면 글의 맨 끝(editor.getLength())에 삽입
          const index = range ? range.index : editor.getLength();

          // 4. 이미지 삽입
          editor.insertEmbed(index, 'image', imageUrl);
          
          // 5. 삽입 후 커서를 이미지 다음으로 이동 (사용자 편의)
          editor.setSelection(index + 1);

        } catch (error) {
          console.error('이미지 업로드 실패:', error);
          alert('이미지 업로드에 실패했습니다.');
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
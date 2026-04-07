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

// 수정된 이미지 업로드 함수: 파일명 중복을 원천 차단
export const uploadPostImage = (file) => {
  // 기존 파일의 확장자 추출 (예: .png, .jpg)
  const extension = file.name.substring(file.name.lastIndexOf('.'));
  
  // 파일 이름의 본문 추출 (예: photo)
  const originalName = file.name.substring(0, file.name.lastIndexOf('.'));
  
  // 중복 방지를 위한 랜덤 문자열(고유 ID) 생성
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  
  // 새로운 파일 이름 조합 (예: photo_171249ab1x_a4b9c.png)
  const safeFileName = `${originalName}_${uniqueId}${extension}`;

  // 원래 파일을 새로운 이름의 파일 객체로 복제
  // File 생성자는 (데이터배열, 파일명, 옵션)을 받습니다.
  const safeFile = new File([file], safeFileName, { type: file.type });

  const formData = new FormData();
  formData.append('file', safeFile); // 원본 file 대신 이름이 바뀐 safeFile 전송

  return client.post('/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    transformRequest: [(data, headers) => {
      delete headers['Content-Type'];
      return data;
    }],
  }).then((r) => r.data);
};
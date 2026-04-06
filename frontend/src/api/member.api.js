import client from './client'

/** 전체 회원 목록 (ADMIN 전용) */
export const getMembers = () =>
  client.get('/members').then((r) => r.data)

/** 단일 회원 조회 */
export const getMember = (id) =>
  client.get(`/members/${id}`).then((r) => r.data)

/** 회원 상태 및 역할 변경 (ADMIN 전용) */
export const updateMemberStatus = (id, status, role = null) =>
  client.patch(`/admin/members/${id}/status`, { status, role }).then((r) => r.data)

/** 마이페이지용 내 정보 가져오기 */
export const getMyInfo = () => 
  client.get('/members/me').then((r) => r.data);

/** 프로필 이미지 업로드 */
export const uploadProfileImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return client.post('/members/me/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // 브라우저가 boundary를 자동 생성하도록 기존 JSON 헤더 설정 덮어쓰기
    transformRequest: [(data, headers) => {
      delete headers['Content-Type'];
      return data;
    }],
  }).then(r => r.data);
};
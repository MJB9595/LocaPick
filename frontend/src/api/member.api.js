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
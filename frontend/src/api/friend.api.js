import client from './client'

// 내 친구 목록 (각 친구별 channel roomId 포함)
export const getMyFriends = () =>
  client.get('/friends').then((r) => r.data)

// 친구 코드로 친구 추가 (성공 시 채팅방까지 자동 생성)
// payload: { friendCode }
export const addFriendByCode = (friendCode) =>
  client.post('/friends', { friendCode }).then((r) => r.data)

// 친구 삭제
export const removeFriend = (memberId) =>
  client.delete(`/friends/${memberId}`).then((r) => r.data)

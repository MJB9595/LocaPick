import client from './client'

// 내 채팅방 목록
export const getMyChatRooms = () =>
  client.get('/chat/rooms').then((r) => r.data)

// 채팅방 단건 조회
export const getChatRoom = (roomId) =>
  client.get(`/chat/rooms/${roomId}`).then((r) => r.data)

// 채팅방 생성/조회 (없으면 생성)
// payload: { opponentId, postId? }
export const openChatRoom = (payload) =>
  client.post('/chat/rooms', payload).then((r) => r.data)

// 방의 이전 메시지 전체
export const getChatMessages = (roomId) =>
  client.get(`/chat/rooms/${roomId}/messages`).then((r) => r.data)

// 읽음 처리
export const markChatRoomRead = (roomId) =>
  client.post(`/chat/rooms/${roomId}/read`).then((r) => r.data)

/**
 * 약속 설정 (서버가 APPOINTMENT_SET 시스템 메시지를 broadcast)
 * payload: { placeName, placeAddress?, lat, lng }
 */
export const setChatAppointment = (roomId, payload) =>
  client.post(`/chat/rooms/${roomId}/appointment`, payload).then((r) => r.data)

/**
 * 위치 신호 (heartbeat) — 도착 자동 판정.
 * payload: { lat, lng, accuracy? }
 * 응답: { distanceM, arrivedNow, bothArrived, active }
 */
export const sendChatHeartbeat = (roomId, payload) =>
  client.post(`/chat/rooms/${roomId}/heartbeat`, payload).then((r) => r.data)

/** 수동 도착 처리 */
export const manualArrive = (roomId) =>
  client.post(`/chat/rooms/${roomId}/arrive`).then((r) => r.data)

/** 약속 수동 종료/취소 */
export const cancelChatAppointment = (roomId) =>
  client.delete(`/chat/rooms/${roomId}/appointment`).then((r) => r.data)

/** 채팅방 삭제 (메시지/방 영구 삭제, 친구 관계는 유지) */
export const deleteChatRoom = (roomId) =>
  client.delete(`/chat/rooms/${roomId}`).then((r) => r.data)

/**
 * 채팅 첨부용 이미지 업로드.
 * 게시글에서 쓰는 /images 엔드포인트를 그대로 재사용.
 * 응답: { url: '/api/images/{uuid}', id }
 */
export const uploadChatImage = (file) => {
  const extension = file.name.includes('.')
    ? file.name.substring(file.name.lastIndexOf('.'))
    : ''
  const baseName = file.name.includes('.')
    ? file.name.substring(0, file.name.lastIndexOf('.'))
    : file.name
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
  const safeFile = new File([file], `${baseName}_${uniqueId}${extension}`, { type: file.type })

  const formData = new FormData()
  formData.append('file', safeFile)

  return client
    .post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: [(data, headers) => {
        delete headers['Content-Type']
        return data
      }],
    })
    .then((r) => r.data)
}

package picstory.backend.web.dto;

/**
 * 채팅방 생성/조회 (없으면 만든다).
 * - opponentId: 상대 멤버 ID
 * - postId: (선택) 게시글 기반 채팅 시작 시
 */
public record CreateChatRoomRequest(
        Long opponentId,
        Long postId
) {
}

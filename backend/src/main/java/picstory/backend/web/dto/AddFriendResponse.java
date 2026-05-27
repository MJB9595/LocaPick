package picstory.backend.web.dto;

/**
 * 친구 추가 결과 + 자동으로 열린 채팅방 ID.
 */
public record AddFriendResponse(
        FriendResponse friend,
        Long roomId,
        boolean alreadyFriend
) {
}

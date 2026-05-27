package picstory.backend.web.dto;

import picstory.backend.domain.Friendship;
import picstory.backend.domain.Member;

import java.time.LocalDateTime;

/**
 * "내 친구" 항목을 표현하는 응답.
 * roomId 가 있으면 바로 해당 채팅방으로 이동 가능.
 */
public record FriendResponse(
        Long memberId,
        String name,
        String email,
        String profileImageUrl,
        String friendCode,
        Long roomId,
        LocalDateTime since
) {
    public static FriendResponse of(Friendship f, Long myId, Long roomId) {
        Member opp = f.opponentOf(myId);
        return new FriendResponse(
                opp.getId(),
                opp.getName(),
                opp.getEmail(),
                opp.getProfileImageUrl(),
                opp.getFriendCode(),
                roomId,
                f.getCreatedAt()
        );
    }
}

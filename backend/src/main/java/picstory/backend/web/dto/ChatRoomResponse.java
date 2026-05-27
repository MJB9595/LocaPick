package picstory.backend.web.dto;

import picstory.backend.domain.ChatRoom;
import picstory.backend.domain.Member;

import java.time.LocalDateTime;

/**
 * 채팅방 목록/상세 응답 DTO.
 * - opponent: "나" 기준 상대방 정보
 * - 활성 약속/도착 상태 포함
 */
public record ChatRoomResponse(
        Long roomId,
        Long opponentId,
        String opponentName,
        String opponentProfileImageUrl,
        Long postId,
        String postTitle,
        String lastMessage,
        LocalDateTime lastMessageAt,
        long unreadCount,
        // 활성 약속
        String appointmentPlaceName,
        String appointmentPlaceAddress,
        Double appointmentLat,
        Double appointmentLng,
        LocalDateTime appointmentSetAt,
        // 도착 상태 (나/상대 기준)
        LocalDateTime myArrivedAt,
        LocalDateTime opponentArrivedAt,
        LocalDateTime appointmentEndedAt
) {
    public static ChatRoomResponse of(ChatRoom room, Long myId, long unreadCount) {
        Member opp = room.opponentOf(myId);
        return new ChatRoomResponse(
                room.getId(),
                opp.getId(),
                opp.getName(),
                opp.getProfileImageUrl(),
                room.getPost() == null ? null : room.getPost().getId(),
                room.getPost() == null ? null : room.getPost().getTitle(),
                room.getLastMessage(),
                room.getLastMessageAt(),
                unreadCount,
                room.getAppointmentPlaceName(),
                room.getAppointmentPlaceAddress(),
                room.getAppointmentLat(),
                room.getAppointmentLng(),
                room.getAppointmentSetAt(),
                room.arrivedAtOf(myId),
                room.arrivedAtOf(opp.getId()),
                room.getAppointmentEndedAt()
        );
    }
}

package picstory.backend.web.dto;

import picstory.backend.domain.ChatMessage;
import picstory.backend.domain.ChatMessageType;

import java.time.LocalDateTime;

public record ChatMessageResponse(
        Long id,
        Long roomId,
        Long senderId,
        String senderName,
        String senderProfileImageUrl,
        ChatMessageType type,
        String content,
        Integer etaMinutes,
        String etaMode,
        String imageUrl,
        String placeName,
        String placeAddress,
        Double placeLat,
        Double placeLng,
        LocalDateTime createdAt
) {
    public static ChatMessageResponse from(ChatMessage m) {
        return new ChatMessageResponse(
                m.getId(),
                m.getRoom().getId(),
                m.getSender().getId(),
                m.getSender().getName(),
                m.getSender().getProfileImageUrl(),
                m.getType(),
                m.getContent(),
                m.getEtaMinutes(),
                m.getEtaMode(),
                m.getImageUrl(),
                m.getPlaceName(),
                m.getPlaceAddress(),
                m.getPlaceLat(),
                m.getPlaceLng(),
                m.getCreatedAt()
        );
    }
}

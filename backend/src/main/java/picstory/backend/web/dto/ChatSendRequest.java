package picstory.backend.web.dto;

import picstory.backend.domain.ChatMessageType;

/**
 * 클라이언트 STOMP 송신 페이로드.
 *
 * - TEXT  : content 필수
 * - ETA   : etaMinutes 필수, etaMode 선택 ("WALK" / "CAR" / "TRANSIT")
 * - IMAGE : imageUrl 필수
 * - PLACE : placeName, placeLat, placeLng 필수
 *
 * APPOINTMENT_SET / ARRIVED / APPOINTMENT_DONE / APPOINTMENT_CANCELED 는 REST 전용.
 */
public record ChatSendRequest(
        ChatMessageType type,
        String content,
        Integer etaMinutes,
        String etaMode,
        String imageUrl,
        String placeName,
        String placeAddress,
        Double placeLat,
        Double placeLng
) {
}

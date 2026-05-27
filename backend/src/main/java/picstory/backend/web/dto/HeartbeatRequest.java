package picstory.backend.web.dto;

/**
 * 채팅방 활성 사용자 위치 신호.
 * - lat/lng: 현재 위치
 * - accuracy: GPS 추정 정확도(m). 없으면 null.
 */
public record HeartbeatRequest(
        Double lat,
        Double lng,
        Double accuracy
) {
}

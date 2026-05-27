package picstory.backend.web.dto;

/**
 * 채팅방 약속 설정.
 */
public record SetAppointmentRequest(
        String placeName,
        String placeAddress,
        Double lat,
        Double lng
) {
}

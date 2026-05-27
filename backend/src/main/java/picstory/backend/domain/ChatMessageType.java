package picstory.backend.domain;

public enum ChatMessageType {
    /** 일반 텍스트 메시지 */
    TEXT,
    /** 도착 예정 시간(ETA) 공유 — etaMinutes / etaMode 사용 */
    ETA,
    /** 사진 — imageUrl 사용 */
    IMAGE,
    /** 장소 카드 (약속 없이 장소만 공유) */
    PLACE,
    /** 약속 잡힘 시스템 공지 */
    APPOINTMENT_SET,
    /** 한 명 도착 시스템 공지 */
    ARRIVED,
    /** 양쪽 모두 도착 / 약속 종료 시스템 공지 */
    APPOINTMENT_DONE,
    /** 약속 수동 취소 시스템 공지 */
    APPOINTMENT_CANCELED
}

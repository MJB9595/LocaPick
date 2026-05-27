package picstory.backend.web.dto;

/**
 * Heartbeat 결과.
 * - distanceM: 약속 장소까지 직선거리(m). 약속 없으면 null.
 * - arrivedNow: 이번 호출에서 도착 처리됐는지
 * - bothArrived: 양쪽 모두 도착해서 자동 종료됐는지
 * - active: 약속이 아직 진행 중인지 (false 면 종료됨/없음)
 */
public record HeartbeatResponse(
        Double distanceM,
        boolean arrivedNow,
        boolean bothArrived,
        boolean active
) {
}

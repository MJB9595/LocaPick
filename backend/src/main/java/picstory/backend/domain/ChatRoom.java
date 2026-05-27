package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 1:1 채팅방.
 * - 두 명의 멤버(memberA, memberB)로 구성.
 * - 게시글(Post)에서 채팅 시작 시 post 연결 가능 (선택).
 * - 마지막 메시지/시간/읽음 위치는 목록 정렬·미읽음 카운트 산출용 캐시.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "chat_rooms",
        indexes = {
                @Index(name = "idx_chat_rooms_member_a", columnList = "member_a_id"),
                @Index(name = "idx_chat_rooms_member_b", columnList = "member_b_id"),
                @Index(name = "idx_chat_rooms_post", columnList = "post_id")
        }
)
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 작은 ID쪽 멤버를 항상 memberA에 둔다 (중복 방 생성 방지용 정규화). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_a_id")
    private Member memberA;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_b_id")
    private Member memberB;

    /** 어떤 게시물에서 시작된 채팅인지 (선택). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    /** 마지막 메시지 미리보기 (목록에서 사용) */
    @Column(length = 500)
    private String lastMessage;

    private LocalDateTime lastMessageAt;

    /** 각자 마지막으로 읽은 메시지 ID — 미읽음 카운트 산출 */
    private Long memberALastReadMessageId;
    private Long memberBLastReadMessageId;

    /** ── 현재 활성 약속 (1방 1약속) ── */
    @Column(length = 200)
    private String appointmentPlaceName;

    @Column(length = 300)
    private String appointmentPlaceAddress;

    private Double appointmentLat;

    private Double appointmentLng;

    private LocalDateTime appointmentSetAt;

    /** 도착 시각 — null 이면 미도착 */
    private LocalDateTime memberAArrivedAt;
    private LocalDateTime memberBArrivedAt;

    /** 약속 종료 시각 (양쪽 도착 또는 수동 종료) */
    private LocalDateTime appointmentEndedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.lastMessageAt = this.createdAt;
    }

    public ChatRoom(Member memberA, Member memberB, Post post) {
        // 항상 작은 ID가 A에 오도록 정규화
        if (memberA.getId() <= memberB.getId()) {
            this.memberA = memberA;
            this.memberB = memberB;
        } else {
            this.memberA = memberB;
            this.memberB = memberA;
        }
        this.post = post;
    }

    public void updateLastMessage(String preview, LocalDateTime at) {
        this.lastMessage = preview;
        this.lastMessageAt = at;
    }

    public void markRead(Long memberId, Long lastMessageId) {
        if (memberA.getId().equals(memberId)) {
            this.memberALastReadMessageId = lastMessageId;
        } else if (memberB.getId().equals(memberId)) {
            this.memberBLastReadMessageId = lastMessageId;
        }
    }

    public boolean hasMember(Long memberId) {
        return memberA.getId().equals(memberId) || memberB.getId().equals(memberId);
    }

    public Member opponentOf(Long memberId) {
        return memberA.getId().equals(memberId) ? memberB : memberA;
    }

    public Long lastReadMessageIdOf(Long memberId) {
        return memberA.getId().equals(memberId) ? memberALastReadMessageId : memberBLastReadMessageId;
    }

    /** 약속 갱신 (덮어쓰기) — 도착 상태 초기화 */
    public void setAppointment(String name, String address, Double lat, Double lng) {
        this.appointmentPlaceName = name;
        this.appointmentPlaceAddress = address;
        this.appointmentLat = lat;
        this.appointmentLng = lng;
        this.appointmentSetAt = LocalDateTime.now();
        this.memberAArrivedAt = null;
        this.memberBArrivedAt = null;
        this.appointmentEndedAt = null;
    }

    /** 약속 취소(수동 종료) — 약속 자체를 비운다 */
    public void clearAppointment() {
        this.appointmentPlaceName = null;
        this.appointmentPlaceAddress = null;
        this.appointmentLat = null;
        this.appointmentLng = null;
        this.appointmentSetAt = null;
        this.memberAArrivedAt = null;
        this.memberBArrivedAt = null;
        this.appointmentEndedAt = LocalDateTime.now();
    }

    /** 한 명 도착 처리. 이미 도착했거나 약속 종료된 상태면 false. */
    public boolean markArrived(Long memberId) {
        if (appointmentEndedAt != null) return false;
        if (appointmentLat == null) return false;
        LocalDateTime now = LocalDateTime.now();
        if (memberA.getId().equals(memberId)) {
            if (memberAArrivedAt != null) return false;
            this.memberAArrivedAt = now;
            return true;
        }
        if (memberB.getId().equals(memberId)) {
            if (memberBArrivedAt != null) return false;
            this.memberBArrivedAt = now;
            return true;
        }
        return false;
    }

    /** 양쪽 모두 도착했는지. */
    public boolean isBothArrived() {
        return memberAArrivedAt != null && memberBArrivedAt != null;
    }

    /** 양쪽 도착으로 자동 종료 처리 */
    public void completeByArrival() {
        if (this.appointmentEndedAt == null) {
            this.appointmentEndedAt = LocalDateTime.now();
        }
    }

    public boolean hasActiveAppointment() {
        return appointmentLat != null && appointmentLng != null && appointmentEndedAt == null;
    }

    public LocalDateTime arrivedAtOf(Long memberId) {
        if (memberA.getId().equals(memberId)) return memberAArrivedAt;
        if (memberB.getId().equals(memberId)) return memberBArrivedAt;
        return null;
    }
}

package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 채팅 메시지.
 * - 다형 메시지: TEXT / ETA / IMAGE / PLACE / APPOINTMENT_SET
 * - 타입별로 사용하는 필드가 다르며, 사용하지 않는 필드는 null.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "chat_messages",
        indexes = {
                @Index(name = "idx_chat_msg_room_id", columnList = "room_id, id"),
                @Index(name = "idx_chat_msg_sender", columnList = "sender_id")
        }
)
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id")
    private ChatRoom room;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id")
    private Member sender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ChatMessageType type;

    /** TEXT 본문 또는 시스템 공지(APPOINTMENT_SET) 본문 */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** ETA: 남은 분(min) */
    private Integer etaMinutes;

    /** ETA 산출 기준 — WALK / CAR / TRANSIT 중 하나 (옵션) */
    @Column(length = 16)
    private String etaMode;

    /** IMAGE: 이미지 URL (예: /api/images/{uuid}) */
    @Column(length = 500)
    private String imageUrl;

    /** PLACE / APPOINTMENT_SET: 장소 정보 */
    @Column(length = 200)
    private String placeName;

    @Column(length = 300)
    private String placeAddress;

    private Double placeLat;

    private Double placeLng;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    private ChatMessage(ChatRoom room, Member sender, ChatMessageType type) {
        this.room = room;
        this.sender = sender;
        this.type = type;
    }

    public static ChatMessage text(ChatRoom room, Member sender, String content) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.TEXT);
        m.content = content;
        return m;
    }

    public static ChatMessage eta(ChatRoom room, Member sender, int minutes, String mode) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.ETA);
        m.etaMinutes = minutes;
        m.etaMode = mode;
        return m;
    }

    public static ChatMessage image(ChatRoom room, Member sender, String imageUrl) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.IMAGE);
        m.imageUrl = imageUrl;
        return m;
    }

    public static ChatMessage place(ChatRoom room, Member sender,
                                    String name, String address, double lat, double lng) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.PLACE);
        m.placeName = name;
        m.placeAddress = address;
        m.placeLat = lat;
        m.placeLng = lng;
        return m;
    }

    public static ChatMessage appointmentSet(ChatRoom room, Member sender,
                                             String name, String address,
                                             double lat, double lng) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.APPOINTMENT_SET);
        m.placeName = name;
        m.placeAddress = address;
        m.placeLat = lat;
        m.placeLng = lng;
        m.content = "📍 약속 장소가 정해졌어요: " + name;
        return m;
    }

    public static ChatMessage arrived(ChatRoom room, Member who) {
        ChatMessage m = new ChatMessage(room, who, ChatMessageType.ARRIVED);
        m.content = (who.getName() == null ? "상대" : who.getName()) + "님이 약속 장소에 도착했어요!";
        return m;
    }

    public static ChatMessage appointmentDone(ChatRoom room, Member sender) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.APPOINTMENT_DONE);
        m.content = "🎉 두 분 모두 약속 장소에 도착했어요! 좋은 시간 보내세요.";
        return m;
    }

    public static ChatMessage appointmentCanceled(ChatRoom room, Member sender) {
        ChatMessage m = new ChatMessage(room, sender, ChatMessageType.APPOINTMENT_CANCELED);
        m.content = (sender.getName() == null ? "상대" : sender.getName()) + "님이 약속을 종료했어요.";
        return m;
    }
}

package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.ChatMessage;
import picstory.backend.domain.ChatMessageType;
import picstory.backend.domain.ChatRoom;
import picstory.backend.domain.Member;
import picstory.backend.domain.Post;
import picstory.backend.repository.ChatMessageRepository;
import picstory.backend.repository.ChatRoomRepository;
import picstory.backend.repository.MemberRepository;
import picstory.backend.repository.PostRepository;
import picstory.backend.web.dto.ChatMessageResponse;
import picstory.backend.web.dto.ChatRoomResponse;
import picstory.backend.web.dto.ChatSendRequest;
import picstory.backend.web.dto.CreateChatRoomRequest;
import picstory.backend.web.dto.HeartbeatRequest;
import picstory.backend.web.dto.SetAppointmentRequest;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    /** 도착 판정 반경(m) */
    public static final double ARRIVAL_RADIUS_M = 100.0;
    /** GPS 정확도가 너무 나쁠 때(>200m) 도착 판정 보류 */
    public static final double MAX_ACCEPTABLE_ACCURACY_M = 200.0;

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final PostRepository postRepository;

    /** 내 채팅방 목록 (미읽음 카운트 포함, 최신순) */
    public List<ChatRoomResponse> findMyRooms(Long myId) {
        List<ChatRoom> rooms = chatRoomRepository.findAllMyRooms(myId);
        List<ChatRoomResponse> result = new ArrayList<>(rooms.size());
        for (ChatRoom r : rooms) {
            result.add(ChatRoomResponse.of(r, myId, calcUnread(r, myId)));
        }
        return result;
    }

    /** 채팅방 단건 조회 (권한 확인) */
    public ChatRoomResponse findRoom(Long roomId, Long myId) {
        ChatRoom room = getRoomAndCheckMember(roomId, myId);
        return ChatRoomResponse.of(room, myId, calcUnread(room, myId));
    }

    /** 방의 모든 메시지 조회 */
    public List<ChatMessageResponse> findMessages(Long roomId, Long myId) {
        getRoomAndCheckMember(roomId, myId);
        return chatMessageRepository.findByRoomIdOrderByIdAsc(roomId)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    /** 채팅방 생성/조회 (없으면 만든다) */
    @Transactional
    public ChatRoomResponse openRoom(CreateChatRoomRequest req, Long myId) {
        if (req.opponentId() == null) {
            throw new IllegalArgumentException("상대 멤버 ID가 필요합니다.");
        }
        if (req.opponentId().equals(myId)) {
            throw new IllegalArgumentException("자기 자신과는 채팅방을 만들 수 없습니다.");
        }

        Member me = memberRepository.findById(myId)
                .orElseThrow(() -> new IllegalArgumentException("내 계정을 찾을 수 없습니다."));
        Member opponent = memberRepository.findById(req.opponentId())
                .orElseThrow(() -> new IllegalArgumentException("상대 회원을 찾을 수 없습니다."));

        Long aId = Math.min(me.getId(), opponent.getId());
        Long bId = Math.max(me.getId(), opponent.getId());

        ChatRoom room = chatRoomRepository.findRoom(aId, bId, req.postId())
                .orElseGet(() -> {
                    Post post = req.postId() == null ? null
                            : postRepository.findById(req.postId())
                            .orElseThrow(() -> new IllegalArgumentException("연결할 게시글이 존재하지 않습니다."));
                    return chatRoomRepository.save(new ChatRoom(me, opponent, post));
                });

        return ChatRoomResponse.of(room, myId, calcUnread(room, myId));
    }

    /**
     * STOMP/REST 로 들어온 일반 메시지 저장.
     * 시스템 메시지(약속/도착/종료)는 별도 메서드에서 생성한다.
     */
    @Transactional
    public ChatMessageResponse sendMessage(Long roomId, Long senderId, ChatSendRequest req) {
        ChatRoom room = getRoomAndCheckMember(roomId, senderId);
        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("발신자를 찾을 수 없습니다."));

        if (req.type() == null) {
            throw new IllegalArgumentException("메시지 타입이 필요합니다.");
        }

        ChatMessage saved;
        String preview;

        switch (req.type()) {
            case ETA -> {
                if (req.etaMinutes() == null || req.etaMinutes() < 0 || req.etaMinutes() > 999) {
                    throw new IllegalArgumentException("ETA(분)은 0~999 범위여야 합니다.");
                }
                String mode = req.etaMode() == null ? "WALK" : req.etaMode();
                saved = chatMessageRepository.save(ChatMessage.eta(room, sender, req.etaMinutes(), mode));
                preview = "🏃 약속 장소까지 " + formatMinutesKo(req.etaMinutes()) + " (" + modeLabel(mode) + ")";
            }
            case IMAGE -> {
                if (req.imageUrl() == null || req.imageUrl().isBlank()) {
                    throw new IllegalArgumentException("이미지 URL이 비어있습니다.");
                }
                saved = chatMessageRepository.save(ChatMessage.image(room, sender, req.imageUrl()));
                preview = "📷 사진";
            }
            case PLACE -> {
                if (req.placeName() == null || req.placeLat() == null || req.placeLng() == null) {
                    throw new IllegalArgumentException("장소 정보가 부족합니다.");
                }
                saved = chatMessageRepository.save(ChatMessage.place(
                        room, sender, req.placeName(), req.placeAddress(),
                        req.placeLat(), req.placeLng()
                ));
                preview = "📍 " + req.placeName();
            }
            case TEXT -> {
                if (req.content() == null || req.content().isBlank()) {
                    throw new IllegalArgumentException("메시지 내용이 비어있습니다.");
                }
                String trimmed = req.content().length() > 1000 ? req.content().substring(0, 1000) : req.content();
                saved = chatMessageRepository.save(ChatMessage.text(room, sender, trimmed));
                preview = trimmed.length() > 100 ? trimmed.substring(0, 100) : trimmed;
            }
            case APPOINTMENT_SET, ARRIVED, APPOINTMENT_DONE, APPOINTMENT_CANCELED ->
                    throw new IllegalArgumentException("이 타입은 시스템 전용입니다.");
            default -> throw new IllegalArgumentException("지원하지 않는 메시지 타입입니다: " + req.type());
        }

        room.updateLastMessage(preview, saved.getCreatedAt());
        room.markRead(senderId, saved.getId());

        return ChatMessageResponse.from(saved);
    }

    /** 약속 설정/변경 — APPOINTMENT_SET 시스템 메시지 발급 */
    @Transactional
    public ChatMessageResponse setAppointment(Long roomId, Long memberId, SetAppointmentRequest req) {
        if (req.placeName() == null || req.placeName().isBlank()
                || req.lat() == null || req.lng() == null) {
            throw new IllegalArgumentException("약속 장소 정보가 부족합니다.");
        }
        ChatRoom room = getRoomAndCheckMember(roomId, memberId);
        Member sender = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        room.setAppointment(req.placeName(), req.placeAddress(), req.lat(), req.lng());

        ChatMessage saved = chatMessageRepository.save(
                ChatMessage.appointmentSet(room, sender,
                        req.placeName(), req.placeAddress(), req.lat(), req.lng())
        );
        room.updateLastMessage("📍 약속 장소: " + req.placeName(), saved.getCreatedAt());
        room.markRead(memberId, saved.getId());

        return ChatMessageResponse.from(saved);
    }

    /**
     * Heartbeat — 사용자의 현재 위치를 받고, 약속 장소와 거리 계산 후 자동 도착 판정.
     * @return [HeartbeatSummary, 새로 발생한 시스템 메시지 목록]
     *         (발생한 메시지가 있으면 컨트롤러가 broadcast 한다)
     */
    @Transactional
    public HeartbeatOutcome heartbeat(Long roomId, Long memberId, HeartbeatRequest req) {
        ChatRoom room = getRoomAndCheckMember(roomId, memberId);

        if (!room.hasActiveAppointment()) {
            return new HeartbeatOutcome(null, false, false, false, List.of());
        }
        if (req.lat() == null || req.lng() == null) {
            return new HeartbeatOutcome(null, false, false, true, List.of());
        }

        double distance = haversineMeters(req.lat(), req.lng(),
                room.getAppointmentLat(), room.getAppointmentLng());

        // GPS 정확도가 너무 나쁘면 도착 판정 유보 (거리만 알려준다)
        if (req.accuracy() != null && req.accuracy() > MAX_ACCEPTABLE_ACCURACY_M) {
            return new HeartbeatOutcome(distance, false, false, true, List.of());
        }

        // 이미 도착했거나 도착 임계 밖이면 그대로
        if (distance > ARRIVAL_RADIUS_M) {
            return new HeartbeatOutcome(distance, false, false, true, List.of());
        }

        boolean wasAlreadyArrived = room.arrivedAtOf(memberId) != null;
        boolean justArrived = false;
        boolean bothArrived = false;
        List<ChatMessage> generated = new ArrayList<>();

        if (!wasAlreadyArrived) {
            Member me = memberRepository.findById(memberId)
                    .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
            if (room.markArrived(memberId)) {
                justArrived = true;
                ChatMessage arrived = chatMessageRepository.save(ChatMessage.arrived(room, me));
                generated.add(arrived);
                room.updateLastMessage(arrived.getContent(), arrived.getCreatedAt());
                room.markRead(memberId, arrived.getId());

                if (room.isBothArrived()) {
                    room.completeByArrival();
                    ChatMessage done = chatMessageRepository.save(ChatMessage.appointmentDone(room, me));
                    generated.add(done);
                    room.updateLastMessage(done.getContent(), done.getCreatedAt());
                    room.markRead(memberId, done.getId());
                    bothArrived = true;
                }
            }
        }

        return new HeartbeatOutcome(distance, justArrived, bothArrived,
                room.hasActiveAppointment(), generated);
    }

    /** 수동 도착 처리 (버튼) */
    @Transactional
    public HeartbeatOutcome manualArrive(Long roomId, Long memberId) {
        ChatRoom room = getRoomAndCheckMember(roomId, memberId);
        if (!room.hasActiveAppointment()) {
            throw new IllegalStateException("진행 중인 약속이 없습니다.");
        }
        if (room.arrivedAtOf(memberId) != null) {
            return new HeartbeatOutcome(null, false, false, room.hasActiveAppointment(), List.of());
        }
        Member me = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        List<ChatMessage> generated = new ArrayList<>();
        boolean bothArrived = false;
        if (room.markArrived(memberId)) {
            ChatMessage arrived = chatMessageRepository.save(ChatMessage.arrived(room, me));
            generated.add(arrived);
            room.updateLastMessage(arrived.getContent(), arrived.getCreatedAt());
            room.markRead(memberId, arrived.getId());

            if (room.isBothArrived()) {
                room.completeByArrival();
                ChatMessage done = chatMessageRepository.save(ChatMessage.appointmentDone(room, me));
                generated.add(done);
                room.updateLastMessage(done.getContent(), done.getCreatedAt());
                room.markRead(memberId, done.getId());
                bothArrived = true;
            }
        }
        return new HeartbeatOutcome(null, true, bothArrived, room.hasActiveAppointment(), generated);
    }

    /** 약속 수동 종료/취소 — APPOINTMENT_CANCELED 시스템 메시지 발급 */
    @Transactional
    public List<ChatMessage> cancelAppointment(Long roomId, Long memberId) {
        ChatRoom room = getRoomAndCheckMember(roomId, memberId);
        if (!room.hasActiveAppointment()) {
            throw new IllegalStateException("진행 중인 약속이 없습니다.");
        }
        Member me = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        ChatMessage canceled = chatMessageRepository.save(ChatMessage.appointmentCanceled(room, me));
        room.clearAppointment();
        room.updateLastMessage(canceled.getContent(), canceled.getCreatedAt());
        room.markRead(memberId, canceled.getId());
        return List.of(canceled);
    }

    /** 방을 본 시점에 호출 — 읽음 위치를 마지막 메시지로 갱신 */
    @Transactional
    public void markRoomAsRead(Long roomId, Long myId) {
        ChatRoom room = getRoomAndCheckMember(roomId, myId);
        List<ChatMessage> messages = chatMessageRepository.findByRoomIdOrderByIdAsc(roomId);
        if (messages.isEmpty()) return;
        Long lastId = messages.get(messages.size() - 1).getId();
        room.markRead(myId, lastId);
    }

    /**
     * 채팅방 삭제 (멤버 둘 중 누구든 가능).
     * - 모든 메시지 + 방 자체 삭제
     * - 친구 관계는 별도이므로 유지
     */
    @Transactional
    public void deleteRoom(Long roomId, Long memberId) {
        ChatRoom room = getRoomAndCheckMember(roomId, memberId);
        chatMessageRepository.deleteByRoomId(room.getId());
        chatRoomRepository.delete(room);
    }

    // ─── 내부 도우미 ─────────────────────────────────────────

    private ChatRoom getRoomAndCheckMember(Long roomId, Long memberId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 존재하지 않습니다."));
        if (!room.hasMember(memberId)) {
            throw new IllegalStateException("이 채팅방에 접근할 권한이 없습니다.");
        }
        return room;
    }

    private long calcUnread(ChatRoom room, Long myId) {
        Long lastReadId = room.lastReadMessageIdOf(myId);
        if (lastReadId == null) {
            return chatMessageRepository.countByRoomIdAndSenderIdNot(room.getId(), myId);
        }
        return chatMessageRepository.countByRoomIdAndIdGreaterThanAndSenderIdNot(
                room.getId(), lastReadId, myId);
    }

    private static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371000.0;
        double p1 = Math.toRadians(lat1);
        double p2 = Math.toRadians(lat2);
        double dp = Math.toRadians(lat2 - lat1);
        double dl = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dp / 2) * Math.sin(dp / 2)
                + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private static String modeLabel(String mode) {
        if (mode == null) return "도보";
        return switch (mode) {
            case "CAR" -> "자동차";
            case "TRANSIT" -> "대중교통";
            default -> "도보";
        };
    }

    /** "23분" / "1시간" / "1시간 23분" 형태 */
    private static String formatMinutesKo(int min) {
        int m = Math.max(0, min);
        if (m == 0) return "곧 도착";
        if (m < 60) return m + "분";
        int h = m / 60;
        int r = m % 60;
        return r == 0 ? h + "시간" : h + "시간 " + r + "분";
    }

    /** Heartbeat / manualArrive 의 공통 결과 컨테이너 (컨트롤러에서 broadcast 처리) */
    public record HeartbeatOutcome(
            Double distanceM,
            boolean arrivedNow,
            boolean bothArrived,
            boolean active,
            List<ChatMessage> generatedMessages
    ) {
    }
}

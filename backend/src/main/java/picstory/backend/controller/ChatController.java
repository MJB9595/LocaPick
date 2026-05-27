package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import picstory.backend.domain.ChatMessage;
import picstory.backend.service.ChatService;
import picstory.backend.web.dto.ChatMessageResponse;
import picstory.backend.web.dto.ChatRoomResponse;
import picstory.backend.web.dto.CreateChatRoomRequest;
import picstory.backend.web.dto.HeartbeatRequest;
import picstory.backend.web.dto.HeartbeatResponse;
import picstory.backend.web.dto.SetAppointmentRequest;

import java.util.List;
import java.util.Map;

/**
 * 채팅 REST API.
 * 실시간 송수신은 STOMP(/ws), 방 메타/위치/약속 운영은 REST.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/chat")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    /** 내 채팅방 목록 */
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponse>> myRooms(Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.findMyRooms(myId));
    }

    /** 채팅방 단건 정보 */
    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<ChatRoomResponse> room(@PathVariable Long roomId, Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.findRoom(roomId, myId));
    }

    /** 채팅방 생성/조회 (이미 있으면 같은 방 반환) */
    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomResponse> openRoom(
            @RequestBody CreateChatRoomRequest req,
            Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.openRoom(req, myId));
    }

    /** 방의 이전 메시지 전체 조회 */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> messages(
            @PathVariable Long roomId, Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(chatService.findMessages(roomId, myId));
    }

    /** 읽음 처리 */
    @PostMapping("/rooms/{roomId}/read")
    public ResponseEntity<?> markRead(@PathVariable Long roomId, Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        chatService.markRoomAsRead(roomId, myId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /** 약속 설정/변경 */
    @PostMapping("/rooms/{roomId}/appointment")
    public ResponseEntity<ChatMessageResponse> setAppointment(
            @PathVariable Long roomId,
            @RequestBody SetAppointmentRequest req,
            Authentication auth
    ) {
        Long myId = (Long) auth.getPrincipal();
        ChatMessageResponse msg = chatService.setAppointment(roomId, myId, req);

        broadcastMessage(roomId, msg);
        broadcastMeta(roomId, "appointmentChanged");
        return ResponseEntity.ok(msg);
    }

    /**
     * 위치 신호 (heartbeat).
     * - 도착 판정 자동 처리 + 양쪽 도착 시 자동 종료
     * - 발생한 시스템 메시지는 즉시 broadcast
     */
    @PostMapping("/rooms/{roomId}/heartbeat")
    public ResponseEntity<HeartbeatResponse> heartbeat(
            @PathVariable Long roomId,
            @RequestBody HeartbeatRequest req,
            Authentication auth
    ) {
        Long myId = (Long) auth.getPrincipal();
        ChatService.HeartbeatOutcome outcome = chatService.heartbeat(roomId, myId, req);
        broadcastGenerated(roomId, outcome.generatedMessages());
        if (outcome.arrivedNow() || outcome.bothArrived()) {
            broadcastMeta(roomId, "arrivalChanged");
        }
        return ResponseEntity.ok(new HeartbeatResponse(
                outcome.distanceM(),
                outcome.arrivedNow(),
                outcome.bothArrived(),
                outcome.active()
        ));
    }

    /** 수동 도착 처리 (버튼) */
    @PostMapping("/rooms/{roomId}/arrive")
    public ResponseEntity<HeartbeatResponse> manualArrive(
            @PathVariable Long roomId,
            Authentication auth
    ) {
        Long myId = (Long) auth.getPrincipal();
        ChatService.HeartbeatOutcome outcome = chatService.manualArrive(roomId, myId);
        broadcastGenerated(roomId, outcome.generatedMessages());
        broadcastMeta(roomId, "arrivalChanged");
        return ResponseEntity.ok(new HeartbeatResponse(
                outcome.distanceM(),
                outcome.arrivedNow(),
                outcome.bothArrived(),
                outcome.active()
        ));
    }

    /** 약속 수동 종료/취소 */
    @DeleteMapping("/rooms/{roomId}/appointment")
    public ResponseEntity<?> cancelAppointment(@PathVariable Long roomId, Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        List<ChatMessage> generated = chatService.cancelAppointment(roomId, myId);
        for (ChatMessage m : generated) {
            broadcastMessage(roomId, ChatMessageResponse.from(m));
        }
        broadcastMeta(roomId, "appointmentChanged");
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 채팅방 삭제 — 메시지/방 모두 영구 삭제. 친구 관계는 유지.
     * 상대방 화면이 즉시 갱신되도록 메타 토픽으로 deleted 신호.
     */
    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long roomId, Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        // 삭제 직전에 메타 신호 broadcast (구독자가 떨어지기 전 상대에게도 알림)
        broadcastMeta(roomId, "roomDeleted");
        chatService.deleteRoom(roomId, myId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ─── helpers ─────────────────────────────────────────────

    private void broadcastMessage(Long roomId, ChatMessageResponse msg) {
        messagingTemplate.convertAndSend("/topic/chat.room." + roomId, msg);
    }

    private void broadcastGenerated(Long roomId, List<ChatMessage> generated) {
        if (generated == null || generated.isEmpty()) return;
        for (ChatMessage m : generated) {
            broadcastMessage(roomId, ChatMessageResponse.from(m));
        }
    }

    private void broadcastMeta(Long roomId, String event) {
        messagingTemplate.convertAndSend(
                "/topic/chat.room." + roomId + ".meta",
                Map.of("event", event, "roomId", roomId)
        );
    }
}

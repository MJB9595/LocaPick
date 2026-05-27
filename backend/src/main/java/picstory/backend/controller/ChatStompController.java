package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import picstory.backend.service.ChatService;
import picstory.backend.web.dto.ChatMessageResponse;
import picstory.backend.web.dto.ChatSendRequest;

/**
 * STOMP 채팅 메시지 처리.
 *
 * 클라이언트 publish:  /app/chat.send/{roomId}
 * 서버 broadcast:      /topic/chat.room.{roomId}
 *
 * 에러 발생 시 송신자 본인 큐로 push: /user/queue/errors
 */
@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send/{roomId}")
    public void sendMessage(
            @DestinationVariable Long roomId,
            ChatSendRequest payload,
            Authentication auth
    ) {
        if (auth == null || auth.getPrincipal() == null) {
            // 인증 누락
            return;
        }
        Long senderId = (Long) auth.getPrincipal();

        try {
            ChatMessageResponse saved = chatService.sendMessage(roomId, senderId, payload);
            // 방의 모든 구독자에게 broadcast
            messagingTemplate.convertAndSend("/topic/chat.room." + roomId, saved);
        } catch (RuntimeException e) {
            // 송신자 개인에게 에러 알림
            messagingTemplate.convertAndSendToUser(
                    auth.getName(),
                    "/queue/errors",
                    java.util.Map.of("roomId", roomId, "message", e.getMessage())
            );
        }
    }

    /** 핑(타이핑/생존 신호) — 추후 확장용. 지금은 echo 만 */
    @MessageMapping("/chat.ping/{roomId}")
    @SendToUser("/queue/pong")
    public Object ping(@DestinationVariable Long roomId) {
        return java.util.Map.of("roomId", roomId, "ok", true);
    }
}

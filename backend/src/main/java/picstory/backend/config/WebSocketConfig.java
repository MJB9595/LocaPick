package picstory.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import picstory.backend.domain.MemberRole;
import picstory.backend.security.JwtUtil;

import java.util.List;

/**
 * 채팅용 WebSocket(STOMP) 설정.
 *
 * - 클라이언트 연결 endpoint: /ws
 * - 클라이언트 → 서버 prefix: /app  (e.g. /app/chat.send/{roomId})
 * - 서버 → 클라이언트 broadcast prefix: /topic  (e.g. /topic/chat.room.{roomId})
 * - JWT 검증은 STOMP CONNECT 헤더의 Authorization 에서 수행 (ChannelInterceptor).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 순수 WebSocket 엔드포인트. SockJS는 사용하지 않음.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "http://192.168.50.182:5173",
                        "https://locapick.mjb.diskstation.me",
                        "capacitor://localhost",
                        "https://localhost",
                        "http://localhost"
                );
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue");
    }

    /**
     * STOMP CONNECT 시점에 JWT를 검증하고 Principal(memberId)을 세팅한다.
     * 이후 핸들러에서 SimpMessageHeaderAccessor.getUser()로 접근 가능.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
                        message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String bearer = accessor.getFirstNativeHeader("Authorization");
                    String token = null;
                    if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
                        token = bearer.substring(7);
                    }
                    if (token == null || !jwtUtil.validateToken(token)) {
                        // 유효하지 않은 토큰은 연결 거부
                        throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
                    }

                    Long memberId = jwtUtil.getMemberId(token);
                    MemberRole role = jwtUtil.getRole(token);

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    memberId, null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
                            );
                    accessor.setUser(auth);
                }
                return message;
            }
        });
    }
}

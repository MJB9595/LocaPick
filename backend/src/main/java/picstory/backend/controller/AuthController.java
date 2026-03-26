package picstory.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import picstory.backend.service.AuthService;
import picstory.backend.web.dto.LoginRequest;
import picstory.backend.web.dto.LoginResponse;
import picstory.backend.web.dto.SignupRequest;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    /** POST /auth/signup - 회원가입 */
    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody SignupRequest request) {
        Long memberId = authService.signup(request);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "memberId", memberId,
                "message", "회원가입이 완료되었습니다."
        ));
    }

    /** POST /auth/login - 로그인 (JWT 반환) */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /auth/logout - 로그아웃
     * 현재는 클라이언트 토큰 삭제만으로 처리.
     * 추후 Redis 블랙리스트 방식으로 확장 가능.
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "로그아웃 되었습니다."
        ));
    }
}

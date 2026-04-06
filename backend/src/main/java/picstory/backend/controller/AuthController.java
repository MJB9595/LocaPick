package picstory.backend.controller;

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

    // 🌟 이메일 중복 체크 API
    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Object>> checkEmail(@RequestParam String email) {
        boolean isUsed = authService.existsByEmail(email);
        return ResponseEntity.ok(Map.of("available", !isUsed));
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signup(@RequestBody SignupRequest request) {
        Long memberId = authService.signup(request);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "memberId", memberId,
                "message", "회원가입이 완료되었습니다."
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        return ResponseEntity.ok(Map.of("success", true, "message", "로그아웃 되었습니다."));
    }
}
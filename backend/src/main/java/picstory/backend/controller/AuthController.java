package picstory.backend.controller;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import picstory.backend.domain.Member;
import picstory.backend.service.AuthService;
import picstory.backend.service.KakaoAuthService;
import picstory.backend.web.dto.LoginRequest;
import picstory.backend.web.dto.LoginResponse;
import picstory.backend.web.dto.SignupRequest;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    // ✅ [카카오 로그인 추가]
    private final KakaoAuthService kakaoAuthService;

    @Value("${kakao.client-id}")
    private String kakaoClientId;

    @Value("${kakao.redirect-uri}")
    private String kakaoRedirectUri;

    @Value("${kakao.frontend-redirect}")
    private String frontendRedirect;

    // ──────────────────────────────────────────────────────────────
    // 기존 일반 로그인/회원가입/로그아웃 (변경 없음)
    // ──────────────────────────────────────────────────────────────

    /** 이메일 중복 체크 */
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

    // ──────────────────────────────────────────────────────────────
    // ✅ [카카오 로그인 추가] 카카오 OAuth2 엔드포인트
    // ──────────────────────────────────────────────────────────────

    /**
     * GET /auth/kakao
     * → 프론트엔드 버튼 클릭 시 window.location.href 로 호출
     * → 카카오 인증 페이지로 리디렉션
     */
    @GetMapping("/kakao")
    public void kakaoLogin(HttpServletResponse response) throws IOException {
        String kakaoAuthUrl = "https://kauth.kakao.com/oauth/authorize"
                + "?client_id=" + kakaoClientId
                + "&redirect_uri=" + URLEncoder.encode(kakaoRedirectUri, StandardCharsets.UTF_8)
                + "&response_type=code";

        response.sendRedirect(kakaoAuthUrl);
    }

    /**
     * GET /auth/kakao/callback?code=xxx
     * → 카카오 서버가 인가 코드와 함께 호출
     *
     * [JWT 방식 처리]
     * Session 기반이 아니므로, JWT 토큰을 URL 파라미터로 담아
     * 프론트엔드로 리디렉션합니다.
     * 프론트엔드에서 ?token=xxx 를 파싱해 localStorage에 저장합니다.
     */
    // ✅ 브라우저/확장프로그램의 중복 요청(Pre-fetch 등)으로 인한 KOE320 에러 방지용 캐시
    private final java.util.Map<String, String> codeCache = new java.util.concurrent.ConcurrentHashMap<>();

    @GetMapping("/kakao/callback")
    public void kakaoCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {

        System.out.println("=== [KakaoCallback] 진입 ===");
        System.out.println("전달받은 Code: " + code);
        System.out.println("전달받은 Error: " + error);

        // 사용자가 카카오 로그인 취소한 경우
        if (error != null || code == null) {
            String loginUrl = frontendRedirect.replace("/app", "/login") + "?error=kakao_cancelled";
            response.sendRedirect(loginUrl);
            return;
        }

        // 이미 처리된 코드인 경우 성공했던 URL로 똑같이 리다이렉트
        if (codeCache.containsKey(code)) {
            System.out.println("중복 요청 감지됨! 기존 성공 URL로 리다이렉트합니다. Code: " + code);
            response.sendRedirect(codeCache.get(code));
            return;
        }

        try {
            // 1. 인가 코드 → 카카오 액세스 토큰
            String kakaoAccessToken = kakaoAuthService.getAccessToken(code);

            // 2. 카카오 액세스 토큰 → 카카오 유저 정보
            Map<String, Object> userInfo = kakaoAuthService.getKakaoUserInfo(kakaoAccessToken);

            // 3. 회원 find or create
            Member member = kakaoAuthService.findOrCreateMember(userInfo);

            // 4. LocaPick JWT 발급
            LoginResponse loginResponse = kakaoAuthService.buildLoginResponse(member);

            // 5. JWT를 URL 파라미터로 담아 프론트엔드 /app 으로 리디렉션
            // ✅ 헤더 크기 초과(500 에러) 방지를 위해 프로필 이미지가 너무 긴 경우(Base64) URL 파라미터에서 생략
            String safeProfileUrl = loginResponse.profileImageUrl() != null ? loginResponse.profileImageUrl() : "";
            if (safeProfileUrl.length() > 1000) {
                safeProfileUrl = "";
            }

            String redirectUrl = frontendRedirect
                    + "?token="            + URLEncoder.encode(loginResponse.accessToken(), StandardCharsets.UTF_8)
                    + "&memberId="         + loginResponse.memberId()
                    + "&name="             + URLEncoder.encode(loginResponse.name(), StandardCharsets.UTF_8)
                    + "&email="            + URLEncoder.encode(loginResponse.email(), StandardCharsets.UTF_8)
                    + "&role="             + loginResponse.role().name()
                    + "&profileImageUrl="  + URLEncoder.encode(safeProfileUrl, StandardCharsets.UTF_8);

            // 성공한 URL을 캐시에 저장
            codeCache.put(code, redirectUrl);

            response.sendRedirect(redirectUrl);

        } catch (Exception e) {
            // ✅ 서버 콘솔에 에러 전체 로그 출력
            e.printStackTrace();
            System.err.println("카카오 로그인 실패 원인: " + e.getMessage());

            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unknown Error";
            String loginUrl = frontendRedirect.replace("/app", "/login")
                    + "?error=kakao_error&error_desc=" + URLEncoder.encode(errorMessage, StandardCharsets.UTF_8);
            
            // 만약 실패했다면 캐시에 저장하지 않음 (또는 에러 URL을 저장할 수도 있음)
            response.sendRedirect(loginUrl);
        }
    }
}
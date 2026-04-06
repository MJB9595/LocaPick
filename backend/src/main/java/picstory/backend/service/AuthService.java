package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.Member;
import picstory.backend.repository.MemberRepository;
import picstory.backend.security.JwtUtil;
import picstory.backend.web.dto.LoginRequest;
import picstory.backend.web.dto.LoginResponse;
import picstory.backend.web.dto.SignupRequest;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder  passwordEncoder;
    private final JwtUtil          jwtUtil;

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return memberRepository.existsByEmail(email);
    }

    public Long signup(SignupRequest req) {
        if (memberRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("이미 사용중인 이메일입니다.");
        }
        if (req.password() == null || req.password().length() < 6) {
            throw new IllegalArgumentException("비밀번호는 최소 6자 이상이어야 합니다.");
        }
        if (!req.password().equals(req.passwordConfirm())) {
            throw new IllegalArgumentException("비밀번호 확인이 일치하지 않습니다.");
        }

        // 🌟 핵심 1: 외부 API 버리고 서버 내부에서 직접 SVG 아바타 생성 (절대 깨지지 않음)
        String initial = req.name().substring(0, 1);
        String svgImage = String.format(
                "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
                        "<rect width='100' height='100' fill='#8b5cf6'/>" +
                        "<text x='50' y='50' font-size='45' fill='#ffffff' font-weight='bold' text-anchor='middle' dominant-baseline='central'>%s</text>" +
                        "</svg>", initial
        );

        // SVG 문자열을 Base64로 인코딩하여 브라우저가 바로 읽을 수 있는 데이터 URI로 변환
        String base64Svg = Base64.getEncoder().encodeToString(svgImage.getBytes(StandardCharsets.UTF_8));
        String defaultProfileUrl = "data:image/svg+xml;base64," + base64Svg;

        String hash = passwordEncoder.encode(req.password());
        Member member = new Member(req.name(), req.email(), hash, req.phone(), defaultProfileUrl);
        return memberRepository.save(member).getId();
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        Member member = memberRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(req.password(), member.getPasswordHash())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        if (member.getStatus().name().equals("SUSPENDED")) {
            throw new IllegalStateException("정지된 계정입니다. 관리자에게 문의하세요.");
        }
        if (member.getStatus().name().equals("DELETED")) {
            throw new IllegalStateException("탈퇴한 계정입니다.");
        }

        String token = jwtUtil.generateToken(member.getId(), member.getEmail(), member.getRole());

        return new LoginResponse(
                token,
                member.getId(),
                member.getName(),
                member.getEmail(),
                member.getRole(),
                member.getProfileImageUrl()
        );
    }
}
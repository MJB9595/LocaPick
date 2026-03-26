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

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder  passwordEncoder;
    private final JwtUtil          jwtUtil;

    /** 회원가입 (일반 유저, role = USER 고정) */
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

        String hash = passwordEncoder.encode(req.password());
        Member member = new Member(req.name(), req.email(), hash, req.phone());
        return memberRepository.save(member).getId();
    }

    /** 로그인 → JWT 발급 */
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
                member.getRole()
        );
    }
}

package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.Member;
import picstory.backend.repository.MemberRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder  passwordEncoder;
    private final FriendCodeGenerator friendCodeGenerator;

    @Transactional(readOnly = true)
    public List<Member> findAll() {
        return memberRepository.findAll();
    }

    public void save(Member member) {
        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public Member findById(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
    }

    /**
     * 본인 정보 조회용. friendCode 가 비어 있으면 그 자리에서 즉시 발급한다.
     * (기존 회원 lazy 마이그레이션)
     */
    public Member findByIdEnsuringFriendCode(Long id) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        if (member.getFriendCode() == null || member.getFriendCode().isBlank()) {
            member.assignFriendCode(friendCodeGenerator.generateUnique());
            // JPA dirty checking 으로 트랜잭션 커밋 시 자동 update
        }
        return member;
    }
}

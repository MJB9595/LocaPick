package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.Member;
import picstory.backend.domain.MemberRole;
import picstory.backend.domain.MemberStatus;
import picstory.backend.repository.MemberRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final MemberRepository memberRepository;

    @Transactional(readOnly = true)
    public List<Member> findAll() {
        return memberRepository.findAll();
    }

    /**
     * 회원 상태/역할 변경
     * @param id     변경할 회원 ID
     * @param status null 이 아니면 상태 변경
     * @param role   null 이 아니면 역할 변경
     */
    public void updateMember(Long id, MemberStatus status, MemberRole role) {
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (status != null) member.changeStatus(status);
        if (role   != null) member.changeRole(role);
    }
}

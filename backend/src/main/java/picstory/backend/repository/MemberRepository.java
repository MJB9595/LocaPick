package picstory.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import picstory.backend.domain.Member;
import picstory.backend.domain.MemberRole;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    boolean existsByEmail(String email);

    Optional<Member> findByEmail(String email);

    List<Member> findAllByRole(MemberRole role);

    // ✅ [카카오 로그인 추가] kakaoId로 회원 조회
    Optional<Member> findByKakaoId(String kakaoId);

    // ✅ 친구 코드로 멤버 조회
    Optional<Member> findByFriendCode(String friendCode);

    boolean existsByFriendCode(String friendCode);

    // 친구 코드가 아직 없는 회원 조회 (마이그레이션용)
    List<Member> findAllByFriendCodeIsNull();
}
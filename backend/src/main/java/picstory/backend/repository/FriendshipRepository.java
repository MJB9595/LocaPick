package picstory.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import picstory.backend.domain.Friendship;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    /** 두 멤버 사이의 친구 관계 (정규화된 a < b 순서) */
    Optional<Friendship> findByMemberAIdAndMemberBId(Long aId, Long bId);

    /** 내가 포함된 모든 친구 관계 */
    @Query("""
            select f from Friendship f
            where f.memberA.id = :memberId or f.memberB.id = :memberId
            order by f.createdAt desc
            """)
    List<Friendship> findAllByMember(@Param("memberId") Long memberId);

    /** 두 멤버 사이의 친구 관계 단건 삭제 */
    void deleteByMemberAIdAndMemberBId(Long aId, Long bId);
}

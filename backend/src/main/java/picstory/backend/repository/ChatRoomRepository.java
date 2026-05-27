package picstory.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import picstory.backend.domain.ChatRoom;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /** 두 멤버 사이 (선택적으로 특정 게시글 기반) 채팅방 조회 */
    @Query("""
            select r from ChatRoom r
            where r.memberA.id = :aId
              and r.memberB.id = :bId
              and ( (:postId is null and r.post is null)
                    or (:postId is not null and r.post.id = :postId) )
            """)
    Optional<ChatRoom> findRoom(@Param("aId") Long aId,
                                @Param("bId") Long bId,
                                @Param("postId") Long postId);

    /** 내가 속한 모든 방 (최신 메시지 시간 내림차순) */
    @Query("""
            select r from ChatRoom r
            where r.memberA.id = :memberId or r.memberB.id = :memberId
            order by r.lastMessageAt desc
            """)
    List<ChatRoom> findAllMyRooms(@Param("memberId") Long memberId);
}

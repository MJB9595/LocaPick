package picstory.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import picstory.backend.domain.ChatMessage;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** 방의 메시지 시간순 조회 */
    List<ChatMessage> findByRoomIdOrderByIdAsc(Long roomId);

    /** 미읽음 메시지 카운트: 내가 마지막으로 읽은 ID 이후, 그리고 발신자가 내가 아닌 것 */
    long countByRoomIdAndIdGreaterThanAndSenderIdNot(Long roomId, Long lastReadId, Long myId);

    /** lastReadId 가 null 인 경우용 */
    long countByRoomIdAndSenderIdNot(Long roomId, Long myId);

    /** 방 삭제 시 메시지 일괄 삭제 */
    void deleteByRoomId(Long roomId);
}

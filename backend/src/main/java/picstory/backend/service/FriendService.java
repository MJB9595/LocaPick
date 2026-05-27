package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.ChatRoom;
import picstory.backend.domain.Friendship;
import picstory.backend.domain.Member;
import picstory.backend.repository.ChatRoomRepository;
import picstory.backend.repository.FriendshipRepository;
import picstory.backend.repository.MemberRepository;
import picstory.backend.web.dto.AddFriendResponse;
import picstory.backend.web.dto.FriendResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendService {

    private final MemberRepository memberRepository;
    private final FriendshipRepository friendshipRepository;
    private final ChatRoomRepository chatRoomRepository;

    /** 내가 가진 친구 목록. 각 친구별 채팅방 ID도 함께 반환. */
    public List<FriendResponse> findMyFriends(Long myId) {
        List<Friendship> list = friendshipRepository.findAllByMember(myId);
        List<FriendResponse> result = new ArrayList<>(list.size());
        for (Friendship f : list) {
            Long oppId = f.opponentOf(myId).getId();
            Long aId = Math.min(myId, oppId);
            Long bId = Math.max(myId, oppId);
            Long roomId = chatRoomRepository.findRoom(aId, bId, null)
                    .map(ChatRoom::getId)
                    .orElse(null);
            result.add(FriendResponse.of(f, myId, roomId));
        }
        return result;
    }

    /**
     * 친구 코드로 친구 추가 + 자동 채팅방 생성.
     * 이미 친구라면 alreadyFriend=true 로 응답하고 기존 방을 반환.
     */
    @Transactional
    public AddFriendResponse addFriendByCode(Long myId, String rawCode) {
        String code = FriendCodeGenerator.normalize(rawCode);
        if (code == null || code.length() < 4) {
            throw new IllegalArgumentException("올바른 친구 코드를 입력해주세요.");
        }

        Member me = memberRepository.findById(myId)
                .orElseThrow(() -> new IllegalArgumentException("내 계정을 찾을 수 없습니다."));

        Member opponent = memberRepository.findByFriendCode(code)
                .orElseThrow(() -> new IllegalArgumentException("해당 친구 코드를 가진 사용자가 없습니다."));

        if (opponent.getId().equals(myId)) {
            throw new IllegalArgumentException("자신의 친구 코드는 사용할 수 없습니다.");
        }

        Long aId = Math.min(myId, opponent.getId());
        Long bId = Math.max(myId, opponent.getId());

        Optional<Friendship> existing = friendshipRepository.findByMemberAIdAndMemberBId(aId, bId);
        boolean alreadyFriend = existing.isPresent();

        Friendship friendship = existing.orElseGet(
                () -> friendshipRepository.save(new Friendship(me, opponent))
        );

        // 자동으로 채팅방 생성/조회 (없으면 만든다)
        ChatRoom room = chatRoomRepository.findRoom(aId, bId, null)
                .orElseGet(() -> chatRoomRepository.save(new ChatRoom(me, opponent, null)));

        return new AddFriendResponse(
                FriendResponse.of(friendship, myId, room.getId()),
                room.getId(),
                alreadyFriend
        );
    }

    /** 친구 삭제 (양방향). 채팅방 자체는 보존. */
    @Transactional
    public void removeFriend(Long myId, Long opponentId) {
        if (myId.equals(opponentId)) {
            throw new IllegalArgumentException("잘못된 요청입니다.");
        }
        Long aId = Math.min(myId, opponentId);
        Long bId = Math.max(myId, opponentId);
        friendshipRepository.deleteByMemberAIdAndMemberBId(aId, bId);
    }
}

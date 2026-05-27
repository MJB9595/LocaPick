package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import picstory.backend.service.FriendService;
import picstory.backend.web.dto.AddFriendRequest;
import picstory.backend.web.dto.AddFriendResponse;
import picstory.backend.web.dto.FriendResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/friends")
public class FriendController {

    private final FriendService friendService;

    /** 내 친구 목록 (각 친구별 채팅방 ID 포함) */
    @GetMapping
    public ResponseEntity<List<FriendResponse>> myFriends(Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(friendService.findMyFriends(myId));
    }

    /** 친구 코드로 친구 추가 — 성공 시 채팅방도 자동 생성 */
    @PostMapping
    public ResponseEntity<AddFriendResponse> addFriend(
            @RequestBody AddFriendRequest req,
            Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(friendService.addFriendByCode(myId, req.friendCode()));
    }

    /** 친구 삭제 */
    @DeleteMapping("/{memberId}")
    public ResponseEntity<?> removeFriend(@PathVariable Long memberId, Authentication auth) {
        Long myId = (Long) auth.getPrincipal();
        friendService.removeFriend(myId, memberId);
        return ResponseEntity.ok(Map.of("success", true));
    }
}

# 홈 · 마이페이지 · 채팅 통합 정리 (백엔드 중심)

> 친구를 추가하고, 약속 장소를 잡고, 실시간으로 채팅하며 도착까지 자동 추적하는 기능 묶음.
> "어디서 데이터가 만들어지고, 어떻게 흘러가는지" 한 번에 파악하기 위한 문서.

---

## 목차

1. [전체 흐름 한눈에 보기](#1-전체-흐름-한눈에-보기)
2. [도메인 모델](#2-도메인-모델)
3. [REST API 전체 목록](#3-rest-api-전체-목록)
4. [STOMP(WebSocket) 토픽 맵](#4-stompwebsocket-토픽-맵)
5. [홈(MapHome)에서의 채팅 진입점](#5-홈maphome에서의-채팅-진입점)
6. [마이페이지의 친구·채팅 통합](#6-마이페이지의-친구채팅-통합)
7. [채팅방 핵심 시나리오](#7-채팅방-핵심-시나리오)
8. [도착 자동 감지 알고리즘](#8-도착-자동-감지-알고리즘)
9. [트랜잭션 경계와 broadcast 순서](#9-트랜잭션-경계와-broadcast-순서)
10. [보안 검증 포인트](#10-보안-검증-포인트)
11. [친구 코드 발급 정책](#11-친구-코드-발급-정책)
12. [메시지 미읽음·읽음 알고리즘](#12-메시지-미읽음읽음-알고리즘)

---

## 1. 전체 흐름 한눈에 보기

```
┌─────────────────────────────────────────────────────────────────┐
│  Member (회원)                                                   │
│   ├─ friend_code (8자, 가입 시 자동 발급)                         │
│   └─ profile_image_url (Base64 Data URI 또는 외부 URL)           │
└────────────┬───────────────────────────────────────┬─────────────┘
             │ 1:N (친구 추가는 양방향)                │ 1:N
             ▼                                       ▼
       ┌──────────┐                          ┌──────────┐
       │Friendship│  member_a < member_b     │ Favorite │
       │ (정규화)  │  unique pair             │  (즐겨찾기)│
       └──────────┘                          └──────────┘
             │
             │ 친구 추가 시 함께 자동 생성
             ▼
       ┌──────────┐ 1:N      ┌──────────────┐
       │ ChatRoom │─────────→│ ChatMessage   │
       │          │          │ (8 types)     │
       │ + 약속 캐시│          └──────────────┘
       │ + 도착 캐시│
       │ + 미읽음 │
       └──────────┘
             │
             │ optional FK
             ▼
        ┌────────┐
        │  Post  │  (게시글 기반 채팅 시작 시 연결)
        └────────┘
```

홈/마이페이지/채팅 모두 `Member` 한 점으로 연결돼 있어요. 친구 코드만으로 회원을 식별·관계를 형성하고, 그 위에 ChatRoom/ChatMessage가 쌓이는 구조.

---

## 2. 도메인 모델

### Member
```java
@Entity @Table(name = "members")
public class Member {
    @Id @GeneratedValue Long id;

    @Column(unique = true, length = 100) String email;
    String passwordHash;         // BCrypt
    @Column(unique = true) String phone;
    @Column(unique = true) String kakaoId;  // 소셜 로그인
    
    @Enumerated(EnumType.STRING) MemberRole role;     // USER / ADMIN
    @Enumerated(EnumType.STRING) MemberStatus status; // ACTIVE / SUSPENDED / DELETED
    boolean emailVerified;
    
    @Column(columnDefinition = "LONGTEXT") String profileImageUrl;
    @Column(unique = true, length = 12) String friendCode;  // 채팅 핵심 식별자

    LocalDateTime createdAt, updatedAt;
}
```

핵심 포인트
- `friendCode`는 가입 시 `FriendCodeGenerator.generateUnique()`가 발급. 헷갈리는 문자(0,O,1,I,L) 제외한 31자 알파벳에서 8자 추출
- 운영 안정성을 위해 `existsByFriendCode()`로 충돌 검사. 8자×31자 알파벳 = 약 8.5×10^11 조합으로 사실상 충돌 없음
- 기존 회원 (friendCode 컬럼 추가 전 가입자)은 `MemberService.findByIdEnsuringFriendCode()`에서 lazy 발급

### Friendship
```java
@Table(name = "friendships",
       uniqueConstraints = @UniqueConstraint(columnNames = {"member_a_id", "member_b_id"}))
public class Friendship {
    @Id Long id;
    @ManyToOne Member memberA;  // 항상 작은 ID
    @ManyToOne Member memberB;
    LocalDateTime createdAt;

    public Friendship(Member a, Member b) {
        // 정규화: 작은 ID가 무조건 A에 가도록
        if (a.getId() < b.getId()) { this.memberA = a; this.memberB = b; }
        else                       { this.memberA = b; this.memberB = a; }
    }
}
```

왜 정규화 하는가
- (A,B)와 (B,A)가 다른 행으로 저장되는 일이 없도록
- DB unique 제약 1개로 양방향 관계의 중복 방지
- 조회 시 항상 `findByMemberAIdAndMemberBId(min, max)` 한 번이면 끝

### ChatRoom
```java
@Table(name = "chat_rooms")
public class ChatRoom {
    @Id Long id;
    @ManyToOne Member memberA;       // 작은 ID (Friendship과 동일 정규화)
    @ManyToOne Member memberB;
    @ManyToOne Post post;             // 옵션: 게시글에서 시작된 채팅이면 연결

    // 목록 빠른 정렬용 캐시
    String lastMessage;
    LocalDateTime lastMessageAt;

    // 미읽음 카운트 산출용
    Long memberALastReadMessageId;
    Long memberBLastReadMessageId;

    // 활성 약속 (1방 1약속)
    String appointmentPlaceName, appointmentPlaceAddress;
    Double appointmentLat, appointmentLng;
    LocalDateTime appointmentSetAt;

    // 도착 상태 (양쪽)
    LocalDateTime memberAArrivedAt;
    LocalDateTime memberBArrivedAt;
    LocalDateTime appointmentEndedAt;

    LocalDateTime createdAt;
}
```

도메인 메서드
- `hasMember(Long memberId)` — 권한 체크
- `opponentOf(Long memberId)` — 상대방 반환
- `lastReadMessageIdOf(Long memberId)` — 미읽음 산출
- `markRead(memberId, messageId)` — 읽음 위치 갱신
- `setAppointment(name, addr, lat, lng)` — 약속 갱신 + 도착 상태 초기화
- `markArrived(memberId)` — 도착 처리, 양쪽 도착 여부 판정
- `isBothArrived()`, `completeByArrival()`
- `clearAppointment()` — 수동 종료 (약속을 비우고 종료 시각 기록)
- `hasActiveAppointment()` — 활성 약속 존재 여부

### ChatMessage (다형 메시지)
```java
public class ChatMessage {
    @Id Long id;
    @ManyToOne ChatRoom room;
    @ManyToOne Member sender;
    @Enumerated(EnumType.STRING) ChatMessageType type;
    
    String content;        // TEXT, 시스템 메시지 본문
    Integer etaMinutes;    // ETA
    String etaMode;        // ETA: WALK/CAR/TRANSIT
    String imageUrl;       // IMAGE
    String placeName, placeAddress;  // PLACE, APPOINTMENT_SET
    Double placeLat, placeLng;
    LocalDateTime createdAt;
}
```

타입별 정적 팩토리 메서드 (`ChatMessage.text()`, `.image()`, `.eta()`, `.place()`, `.appointmentSet()`, `.arrived()`, `.appointmentDone()`, `.appointmentCanceled()`)로 항상 일관된 객체 생성.

### ChatMessageType
```java
public enum ChatMessageType {
    TEXT,                   // 일반 텍스트
    ETA,                    // 도착 예정 시간 공유
    IMAGE,                  // 사진
    PLACE,                  // 장소 카드
    APPOINTMENT_SET,        // 약속 잡힘 (시스템)
    ARRIVED,                // 한 명 도착 (시스템)
    APPOINTMENT_DONE,       // 양쪽 도착 자동 종료 (시스템)
    APPOINTMENT_CANCELED    // 수동 종료 (시스템)
}
```

---

## 3. REST API 전체 목록

### 회원/인증
| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | /auth/signup | 일반 회원가입 (친구 코드 발급) | X |
| POST | /auth/login | 일반 로그인 | X |
| GET  | /auth/check-email | 이메일 중복 체크 | X |
| GET  | /auth/kakao | 카카오 인증 페이지 redirect | X |
| GET  | /auth/kakao/callback | 카카오 callback (JWT 발급 후 프론트로 redirect) | X |
| POST | /auth/logout | 로그아웃 (클라이언트 토큰 폐기) | X |
| GET  | /members/me | 내 정보 + friend_code 응답 (lazy 발급) | O |
| POST | /members/me/profile-image | 프로필 사진 (Base64 Data URI 저장) | O |
| GET  | /members/{id} | 단일 회원 조회 | O |

### 친구
| Method | Path | 설명 |
|---|---|---|
| GET    | /friends | 내 친구 목록 (각 친구의 roomId 포함) |
| POST   | /friends | `{ friendCode }`로 친구 추가 + 채팅방 자동 생성 |
| DELETE | /friends/{memberId} | 친구 삭제 (채팅방은 별개) |

### 채팅 (REST)
| Method | Path | 설명 |
|---|---|---|
| GET    | /chat/rooms | 내 채팅방 목록 (미읽음 카운트 + 약속 상태) |
| GET    | /chat/rooms/{id} | 채팅방 단건 |
| POST   | /chat/rooms | `{ opponentId, postId? }` — 방 생성/조회 |
| GET    | /chat/rooms/{id}/messages | 방의 모든 메시지 |
| POST   | /chat/rooms/{id}/read | 읽음 처리 |
| POST   | /chat/rooms/{id}/appointment | 약속 설정 (시스템 메시지 + 메타 broadcast) |
| DELETE | /chat/rooms/{id}/appointment | 약속 종료 |
| POST   | /chat/rooms/{id}/heartbeat | 위치 신호 (자동 도착 판정) |
| POST   | /chat/rooms/{id}/arrive | 수동 도착 |
| DELETE | /chat/rooms/{id} | 채팅방 영구 삭제 (메시지 포함, 친구는 유지) |

### 이미지 (사진 첨부)
| Method | Path | 설명 |
|---|---|---|
| POST | /images | multipart 업로드 (5MB, MIME image/* 검증) → DB Base64 저장 |
| GET  | /images/{uuid} | 디코드해서 byte[] 응답 (Cache-Control: public, max-age=86400) |

### 게시글/즐겨찾기/장소 추천 (참고)
| Method | Path | 설명 |
|---|---|---|
| GET/POST/PATCH/DELETE | /posts | 메모 CRUD (Jsoup XSS 정화) |
| GET/POST/PATCH         | /favorites | 즐겨찾기 |
| GET                    | /locapick/search | 장소 추천 (자체 가중치) |

---

## 4. STOMP(WebSocket) 토픽 맵

### Endpoint
- 핸드셰이크: `wss://locapick.mjb.diskstation.me/ws`
- 인증: STOMP `CONNECT` 헤더 `Authorization: Bearer <JWT>`
- 검증: `WebSocketConfig.configureClientInboundChannel()`의 `ChannelInterceptor.preSend()`에서 토큰 파싱 → `Authentication`을 STOMP 세션의 user로 세팅

### Destinations
| 방향 | Destination | 설명 |
|---|---|---|
| 클라 → 서버 | `/app/chat.send/{roomId}` | 메시지 전송 (TEXT/ETA/IMAGE/PLACE) |
| 클라 → 서버 | `/app/chat.ping/{roomId}` | 핑 (echo, 추후 타이핑 등에 활용) |
| 서버 → 클라 | `/topic/chat.room.{roomId}` | 방의 모든 새 메시지 broadcast |
| 서버 → 클라 | `/topic/chat.room.{roomId}.meta` | 메타 변경 신호 (약속·도착·삭제) |
| 서버 → 클라 | `/user/queue/errors` | 송신 실패 알림 (개인) |
| 서버 → 클라 | `/user/queue/pong` | 핑 응답 |

### Meta 이벤트 종류
```json
{ "event": "appointmentChanged", "roomId": 123 }
{ "event": "arrivalChanged",     "roomId": 123 }
{ "event": "roomDeleted",        "roomId": 123 }
```

프론트 ChatRoom은 두 토픽을 동시 구독:
- 메시지 토픽 → 새 메시지를 state에 push
- 메타 토픽 → 받으면 `GET /chat/rooms/{id}` 한 번 호출해 헤더(약속/도착) 갱신. `roomDeleted`면 즉시 `/app/chat`로 navigate

---

## 5. 홈(MapHome)에서의 채팅 진입점

홈은 메인 지도지만, 채팅 도메인과의 연결점이 있어요.

### 게시글에서 채팅 시작
- 메모 상세(`/app/memo/:id`) 또는 즐겨찾기 카드에서 "이 글 작성자와 채팅" 버튼을 누르면 `/app/chat/new?opponentId={memberId}&postId={postId}`로 이동
- ChatRoom 컴포넌트가 `roomIdParam === 'new'`를 detect → `POST /chat/rooms { opponentId, postId }` 호출 → 응답 받은 roomId로 URL 즉시 replace
- 백엔드 `ChatService.openRoom()`은 다음 순으로 동작
  1. 두 회원이 같은 사람이 아님 검증
  2. 두 ID 정규화 (작은 ID = aId)
  3. `chatRoomRepository.findRoom(aId, bId, postId)`로 기존 방 조회
  4. 없으면 (옵션 Post 검증 후) 새 방 생성
  5. 기존 방이 있어도 `postId` 인자가 다르면 다른 방으로 취급 (게시글별로 별도 방을 두고 싶을 때 활용 가능)

### 즐겨찾기/장소 → 채팅에서 장소 카드/약속 잡기
- 직접 진입은 아니지만, 채팅방 안의 `PlacePickerModal`이 카카오 Local API를 사용 (홈과 같은 SDK)
- 약속 장소 결정 시 → `POST /chat/rooms/{id}/appointment`로 ChatRoom의 약속 캐시 갱신

---

## 6. 마이페이지의 친구·채팅 통합

### 화면 구성
```
[마이페이지]
 └─ 프로필
 └─ "친구와 채팅하기" 카드
     └─ FriendsPanel.jsx
         ├─ 내 친구 코드 (복사 버튼)
         ├─ 친구 코드 입력 → "친구 추가"
         └─ 친구 목록 (각 항목에 [💬 채팅] [✕ 삭제] 버튼)
```

### 백엔드 역할

**`GET /members/me`**
```java
@GetMapping("/me")
public ResponseEntity<MemberResponse> getMyInfo(Authentication auth) {
    Long memberId = (Long) auth.getPrincipal();
    return ResponseEntity.ok(MemberResponse.from(
        memberService.findByIdEnsuringFriendCode(memberId)
    ));
}
```
- `findByIdEnsuringFriendCode()`가 핵심: 친구 코드가 비어 있으면 그 자리에서 즉시 발급
- 트랜잭션 안이므로 JPA dirty checking으로 자동 update

**`POST /friends`**
```java
@Transactional
public AddFriendResponse addFriendByCode(Long myId, String rawCode) {
    String code = FriendCodeGenerator.normalize(rawCode);   // 공백/대시 제거, 대문자
    if (code == null || code.length() < 4)
        throw new IllegalArgumentException("올바른 친구 코드를 입력해주세요.");
    
    Member me       = memberRepository.findById(myId).orElseThrow(...);
    Member opponent = memberRepository.findByFriendCode(code).orElseThrow(...);
    if (opponent.getId().equals(myId))
        throw new IllegalArgumentException("자신의 친구 코드는 사용할 수 없습니다.");
    
    Long aId = Math.min(myId, opponent.getId());
    Long bId = Math.max(myId, opponent.getId());
    
    Optional<Friendship> existing = friendshipRepository.findByMemberAIdAndMemberBId(aId, bId);
    boolean alreadyFriend = existing.isPresent();
    Friendship friendship = existing.orElseGet(
        () -> friendshipRepository.save(new Friendship(me, opponent))
    );
    
    // 같은 트랜잭션 안에서 채팅방도 자동 생성
    ChatRoom room = chatRoomRepository.findRoom(aId, bId, null)
        .orElseGet(() -> chatRoomRepository.save(new ChatRoom(me, opponent, null)));
    
    return new AddFriendResponse(
        FriendResponse.of(friendship, myId, room.getId()),
        room.getId(),
        alreadyFriend
    );
}
```

원자성 포인트
- 친구 추가 + 채팅방 생성이 **하나의 트랜잭션** 안에서 이뤄짐 → 한 쪽만 만들어지고 다른 쪽이 실패하는 일이 없음
- `@Transactional`이 클래스 레벨 readOnly이지만 메서드에 `@Transactional`을 붙여 readWrite 모드로 override

**`GET /friends`**
- `findAllByMember(myId)`로 내가 포함된 친구 관계 모두 조회
- 각 친구별로 `ChatRoom`을 추가 조회해서 `roomId`를 같이 반환 → 프론트가 친구 카드의 "채팅" 버튼을 즉시 navigate 가능

---

## 7. 채팅방 핵심 시나리오

### A. 텍스트 메시지 전송 (실시간)

```
[프론트 ChatRoom]
  publish('/app/chat.send/{roomId}', { type: 'TEXT', content: '안녕' })

[백엔드 ChatStompController]
  @MessageMapping("/chat.send/{roomId}")
  → ChatService.sendMessage(roomId, senderId, payload)
       ↳ 권한 검증 (방의 멤버인지)
       ↳ 메시지 저장 (TEXT 분기)
       ↳ ChatRoom.lastMessage 갱신
       ↳ 발신자 자동 읽음 처리

  → SimpMessagingTemplate.convertAndSend(
        "/topic/chat.room." + roomId,
        ChatMessageResponse.from(saved))

[양쪽 ChatRoom 클라이언트]
  /topic/chat.room.{id} 구독 콜백 → state.messages.push(msg)
  화면 자동 스크롤 (입력창 근처일 때만)
```

### B. 사진 전송

```
1) 프론트: 파일 선택 → 5MB / image/* 클라이언트 측 검증
2) POST /images (multipart) → ImageController
     ↳ MIME, 크기 백엔드 검증
     ↳ Base64 인코딩 → PostImage 엔티티 (UUID PK) 저장
     ↳ { url: "/api/images/{uuid}", id: uuid } 응답
3) 프론트: STOMP publish { type: 'IMAGE', imageUrl }
4) 이후는 텍스트와 동일한 broadcast 흐름
5) 다른 클라이언트가 imageUrl을 <img src>로 가져오면
   백엔드 GET /images/{uuid} → Base64 디코드 → byte[] 응답
   (Cache-Control: public, max-age=86400 으로 브라우저 캐싱)
```

### C. 약속 설정

```
[프론트] PlacePickerModal에서 장소 선택
  → POST /chat/rooms/{id}/appointment { placeName, placeAddress, lat, lng }

[백엔드 ChatController]
  → ChatService.setAppointment()
       ↳ 권한 검증
       ↳ ChatRoom.setAppointment() 도메인 메서드
            • 약속 캐시 4개 컬럼 갱신
            • appointmentSetAt = now()
            • 도착 상태 3개 컬럼 초기화 (재설정도 가능하게)
       ↳ APPOINTMENT_SET 시스템 메시지 저장
       ↳ lastMessage 갱신

  → broadcastMessage(roomId, msg)            // /topic/chat.room.{id}
  → broadcastMeta(roomId, "appointmentChanged") // /topic/chat.room.{id}.meta
```

두 토픽 broadcast하는 이유
- 메시지 토픽: 메시지 흐름에 시스템 카드를 즉시 보여줌
- 메타 토픽: 헤더의 약속 배너(상단 카카오톡 공지 스타일)를 즉시 갱신. 프론트는 이 신호를 받으면 `GET /chat/rooms/{id}` 한 번 호출해서 모든 메타(약속+도착 상태)를 fresh하게 받음

### D. 도착 자동 감지

→ [§8 알고리즘 섹션](#8-도착-자동-감지-알고리즘) 참조

### E. ETA 메시지

```
[프론트] (+) 메뉴 → "도착시간 확인"
  → getCurrentPosition() → start
  → getRouteByMode(start, appointment, mode) — TMAP/Kakao/ODsay
  → 사용자가 도보/자동차/대중교통 중 하나 선택
  → publish { type: 'ETA', etaMinutes, etaMode }

[백엔드] 텍스트 분기와 거의 같음
  ChatMessage.eta(room, sender, minutes, mode)
  preview = "🏃 약속 장소까지 " + formatMinutesKo(minutes) + " (도보)"

[프론트 렌더링]
  formatMinutes(75) === "1시간 15분"
  formatMinutes(60) === "1시간"
  formatMinutes(0)  === "곧 도착"
```

### F. 채팅방 삭제

```
DELETE /chat/rooms/{id}
 → broadcastMeta(roomId, "roomDeleted")  ← 삭제 직전에 broadcast
 → ChatService.deleteRoom()
      ↳ chatMessageRepository.deleteByRoomId()
      ↳ chatRoomRepository.delete()

다른 사용자의 ChatRoom 화면이 메타 신호를 받고
navigate('/app/chat', { replace: true }) → ChatList 자동 복귀
친구 관계는 보존됨
```

---

## 8. 도착 자동 감지 알고리즘

### 클라이언트 (15초 주기 heartbeat)

```javascript
// ChatRoom.jsx
useEffect(() => {
  if (!hasAppointment || myArrived) return  // 약속 있고 내가 아직 미도착일 때만
  
  const tick = async () => {
    const pos = await getCurrentPosition({ timeout: 8000 })
    await sendChatHeartbeat(roomId, {
      lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy
    })
  }
  
  tick()  // 즉시 1회
  const t = setInterval(tick, 15000)
  return () => clearInterval(t)
}, [roomId, hasAppointment, myArrived])
```

### 서버 (도착 판정)

```java
public HeartbeatOutcome heartbeat(Long roomId, Long memberId, HeartbeatRequest req) {
    ChatRoom room = getRoomAndCheckMember(roomId, memberId);
    
    // 1. 활성 약속 없으면 무시
    if (!room.hasActiveAppointment())
        return new HeartbeatOutcome(null, false, false, false, List.of());
    
    // 2. 좌표 누락 시 무시
    if (req.lat() == null || req.lng() == null)
        return new HeartbeatOutcome(null, false, false, true, List.of());
    
    // 3. 약속 장소까지 거리 (haversine)
    double distance = haversineMeters(
        req.lat(), req.lng(),
        room.getAppointmentLat(), room.getAppointmentLng()
    );
    
    // 4. GPS 정확도가 너무 나쁘면 (>200m) 도착 판정 보류
    if (req.accuracy() != null && req.accuracy() > MAX_ACCEPTABLE_ACCURACY_M)
        return new HeartbeatOutcome(distance, false, false, true, List.of());
    
    // 5. 100m 밖이면 그대로
    if (distance > ARRIVAL_RADIUS_M)
        return new HeartbeatOutcome(distance, false, false, true, List.of());
    
    // 6. 도착 처리
    boolean wasAlreadyArrived = room.arrivedAtOf(memberId) != null;
    List<ChatMessage> generated = new ArrayList<>();
    boolean justArrived = false, bothArrived = false;
    
    if (!wasAlreadyArrived && room.markArrived(memberId)) {
        justArrived = true;
        // ARRIVED 시스템 메시지 발급
        ChatMessage arrived = chatMessageRepository.save(
            ChatMessage.arrived(room, me)
        );
        generated.add(arrived);
        room.updateLastMessage(arrived.getContent(), arrived.getCreatedAt());
        room.markRead(memberId, arrived.getId());
        
        // 양쪽 다 도착했으면 자동 종료
        if (room.isBothArrived()) {
            room.completeByArrival();  // appointmentEndedAt = now()
            ChatMessage done = chatMessageRepository.save(
                ChatMessage.appointmentDone(room, me)
            );
            generated.add(done);
            room.updateLastMessage(done.getContent(), done.getCreatedAt());
            bothArrived = true;
        }
    }
    
    return new HeartbeatOutcome(distance, justArrived, bothArrived,
                                room.hasActiveAppointment(), generated);
}
```

### 컨트롤러 broadcast

```java
@PostMapping("/rooms/{roomId}/heartbeat")
public ResponseEntity<HeartbeatResponse> heartbeat(...) {
    HeartbeatOutcome outcome = chatService.heartbeat(roomId, myId, req);
    
    // 새로 발생한 시스템 메시지들 broadcast
    broadcastGenerated(roomId, outcome.generatedMessages());
    if (outcome.arrivedNow() || outcome.bothArrived()) {
        broadcastMeta(roomId, "arrivalChanged");
    }
    
    return ResponseEntity.ok(new HeartbeatResponse(...));
}
```

### 임계값
| 상수 | 값 | 의미 |
|---|---|---|
| `ARRIVAL_RADIUS_M` | 100m | 약속 장소 반경 안이면 도착 |
| `MAX_ACCEPTABLE_ACCURACY_M` | 200m | GPS 정확도가 이보다 나쁘면 보류 |
| heartbeat 주기 | 15s | 배터리·통신비용·정확도 균형점 |

### 거리 계산 (haversine)
지구를 구로 가정한 두 지점간 거리. 100m 임계라 정확도는 충분.
```java
private static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
    double R = 6371000.0;
    double p1 = Math.toRadians(lat1), p2 = Math.toRadians(lat2);
    double dp = Math.toRadians(lat2 - lat1), dl = Math.toRadians(lng2 - lng1);
    double a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
```

### 수동 도착 (보완)
GPS 권한 거부/실패/실내 신호 약함 등으로 자동 감지가 안 되는 경우 (+) 메뉴의 "도착 알리기" 버튼.

```java
// POST /chat/rooms/{id}/arrive
@Transactional
public HeartbeatOutcome manualArrive(Long roomId, Long memberId) {
    ChatRoom room = getRoomAndCheckMember(roomId, memberId);
    if (!room.hasActiveAppointment())
        throw new IllegalStateException("진행 중인 약속이 없습니다.");
    
    // 이하 heartbeat의 도착 처리 부분과 동일
}
```

---

## 9. 트랜잭션 경계와 broadcast 순서

### 원칙
1. DB 변경은 **트랜잭션 안에서** 한 번에
2. **broadcast는 트랜잭션 커밋 후**에 (rollback돼도 잘못된 메시지가 안 나가도록)

### 현재 구현
```java
// ChatController.setAppointment()
@PostMapping("/rooms/{roomId}/appointment")
public ResponseEntity<ChatMessageResponse> setAppointment(...) {
    // 1. 트랜잭션 시작 (서비스 메서드 @Transactional)
    ChatMessageResponse msg = chatService.setAppointment(roomId, myId, req);
    // 2. 트랜잭션 커밋된 후 (메서드 반환 시점)
    
    // 3. broadcast (이 시점은 이미 DB 반영 끝)
    broadcastMessage(roomId, msg);
    broadcastMeta(roomId, "appointmentChanged");
    
    return ResponseEntity.ok(msg);
}
```

이 패턴 덕분에 중간에 예외가 터지면 broadcast 자체가 실행되지 않아 일관성 보장.

### STOMP @MessageMapping의 경우
```java
// ChatStompController.sendMessage()
@MessageMapping("/chat.send/{roomId}")
public void sendMessage(..., ChatSendRequest payload, Authentication auth) {
    Long senderId = (Long) auth.getPrincipal();
    try {
        ChatMessageResponse saved = chatService.sendMessage(...);  // @Transactional
        messagingTemplate.convertAndSend("/topic/chat.room." + roomId, saved);
    } catch (RuntimeException e) {
        // 송신자에게만 에러 알림 (다른 구독자에는 broadcast 안 됨)
        messagingTemplate.convertAndSendToUser(
            auth.getName(), "/queue/errors",
            Map.of("roomId", roomId, "message", e.getMessage())
        );
    }
}
```

서비스에서 예외 발생 → 트랜잭션 rollback → broadcast 안 됨 → 송신자 개인 큐로만 에러 알림. 다른 사용자는 영향 없음.

---

## 10. 보안 검증 포인트

### 멤버십 검증 (모든 ChatService 메서드)
```java
private ChatRoom getRoomAndCheckMember(Long roomId, Long memberId) {
    ChatRoom room = chatRoomRepository.findById(roomId)
        .orElseThrow(() -> new IllegalArgumentException("채팅방이 존재하지 않습니다."));
    if (!room.hasMember(memberId)) {
        throw new IllegalStateException("이 채팅방에 접근할 권한이 없습니다.");
    }
    return room;
}
```
- 모든 채팅 작업(메시지 조회/전송, 약속, 도착, 삭제)이 이 메서드를 통과
- 다른 방의 ID를 추측해 보내는 것 차단

### IDOR (수직 권한 상승) 차단
- `Authentication.getPrincipal()`로만 `memberId`를 얻음 (요청 body의 senderId 같은 건 절대 신뢰 안 함)
- 위 멤버십 검증으로 가로 권한 상승(다른 사람 방 접근)도 차단

### XSS
- 텍스트 메시지: 1000자 컷 + 프론트 렌더 시 React 기본 escape
- 게시글 본문(메모): `Jsoup.clean(content, Safelist.relaxed().addTags("img").addAttributes("img", "src"))`
- 채팅 메시지에는 HTML 입력 자체를 받지 않음 (TEXT는 평문)

### 파일 업로드
- 백엔드 ImageController에서
  - `file.isEmpty()` 체크
  - `contentType.startsWith("image/")` 검증
  - `file.getSize() > 5MB` 차단
  - UUID PK로 파일명 noise 제거 (path traversal 원천 차단)

### WebSocket 인증
```java
@Override
public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(new ChannelInterceptor() {
        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(...);
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String bearer = accessor.getFirstNativeHeader("Authorization");
                String token = bearer.startsWith("Bearer ") ? bearer.substring(7) : null;
                if (token == null || !jwtUtil.validateToken(token)) {
                    throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
                }
                // Authentication을 STOMP 세션 user로 세팅
                accessor.setUser(...);
            }
            return message;
        }
    });
}
```
- 토큰 없음/유효하지 않음 → 예외 → CONNECT 거부 → 핸드셰이크 실패
- 핸드셰이크 후 메시지마다 Authentication이 자동 attach (Spring Security WebSocket이 처리)

---

## 11. 친구 코드 발급 정책

### 알파벳
```java
private static final char[] ALPHABET =
    "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();  // 31자
```
- 0/O, 1/I/L 제외 (사람이 받아 적을 때 헷갈림 방지)
- 길이 8자 → 31^8 ≈ 8.5×10^11 조합

### 충돌 회피
```java
public String generateUnique() {
    for (int i = 0; i < MAX_TRY; i++) {
        String code = randomCode();  // SecureRandom 기반
        if (!memberRepository.existsByFriendCode(code)) return code;
    }
    // 매우 드문 케이스: 한 자리 늘려 재시도
    for (int i = 0; i < MAX_TRY; i++) {
        String code = randomCode() + ALPHABET[random.nextInt(ALPHABET.length)];
        if (!memberRepository.existsByFriendCode(code)) return code;
    }
    throw new IllegalStateException("친구 코드를 생성할 수 없습니다.");
}
```

### 발급 시점
| 시점 | 메서드 | 비고 |
|---|---|---|
| 일반 회원가입 | `AuthService.signup()` | `member.assignFriendCode(generator.generateUnique())` |
| 카카오 신규 가입 | `KakaoAuthService.findOrCreateMember()` | 동일 |
| 마이페이지 진입 (기존 회원) | `MemberService.findByIdEnsuringFriendCode()` | lazy 발급, JPA dirty checking |
| 운영자 일괄 백필 | `FriendCodeBackfillRunner` | `app.friend-code.backfill-on-startup=true` 옵션. 평소 OFF |

### 정규화 (사용자 입력 처리)
```java
public static String normalize(String code) {
    if (code == null) return null;
    String c = code.trim().toUpperCase().replace("-", "").replace(" ", "");
    return c.isEmpty() ? null : c;
}
```
- 사용자가 `a2b7-xk9p`, `A2B7 XK9P` 등으로 입력해도 `A2B7XK9P`로 통일

---

## 12. 메시지 미읽음·읽음 알고리즘

### 데이터 구조
```
ChatRoom
 ├─ memberALastReadMessageId  (A가 마지막으로 읽은 메시지 ID)
 └─ memberBLastReadMessageId  (B가 마지막으로 읽은 메시지 ID)
```

### 미읽음 카운트 산출
```java
private long calcUnread(ChatRoom room, Long myId) {
    Long lastReadId = room.lastReadMessageIdOf(myId);
    if (lastReadId == null) {
        // 한 번도 읽은 적 없음 — 내가 보낸 게 아닌 모든 메시지가 미읽음
        return chatMessageRepository.countByRoomIdAndSenderIdNot(room.getId(), myId);
    }
    // lastReadId 이후의 메시지 중 내가 보낸 게 아닌 것
    return chatMessageRepository.countByRoomIdAndIdGreaterThanAndSenderIdNot(
        room.getId(), lastReadId, myId);
}
```

### 읽음 처리 시점
1. **채팅방에 들어가서 메시지를 받을 때마다** — 프론트 ChatRoom의 messages effect에서 `markChatRoomRead(roomId)` 호출
2. **메시지 전송 시 자동 읽음** — `ChatService.sendMessage()` 마지막에 `room.markRead(senderId, saved.getId())`
3. **시스템 메시지 발급 시** — 시스템 메시지를 발생시킨 사람도 자동 읽음 처리

```java
// POST /chat/rooms/{id}/read
@Transactional
public void markRoomAsRead(Long roomId, Long myId) {
    ChatRoom room = getRoomAndCheckMember(roomId, myId);
    List<ChatMessage> messages = chatMessageRepository.findByRoomIdOrderByIdAsc(roomId);
    if (messages.isEmpty()) return;
    Long lastId = messages.get(messages.size() - 1).getId();
    room.markRead(myId, lastId);  // dirty checking으로 자동 update
}
```

### ChatList의 즉시 반영 (UX)
- ChatRoom 진입 시 즉시 그 방의 unreadCount를 0으로 표시 (서버 응답 기다리지 않음)
- 500ms 후 `getMyChatRooms()` 한 번 더 호출 → 서버 동기화
- 30초 polling은 백그라운드 정합성 유지용

```javascript
// ChatList.jsx
const isActive = Number(room.roomId) === Number(activeRoomId)
const displayRoom = isActive ? { ...room, unreadCount: 0 } : room
```

---

## 부록 A. 데이터 흐름 요약 (시퀀스 다이어그램)

### 친구 추가 + 채팅 진입
```
사용자(A)  마이페이지        백엔드            DB
   │ 친구코드 입력         │
   ├─→ POST /friends      ├─→ FriendService.addFriendByCode()
   │                       │     ↳ MemberRepository.findByFriendCode(code)
   │                       │←──────────────── B 회원 조회
   │                       │   ↳ Math.min/max로 정규화
   │                       │←──────────────── findRoom(aId, bId, null)
   │                       │   (없으면 새로 생성)
   │                       │     ↳ Friendship 저장
   │                       │     ↳ ChatRoom 저장
   │←─── { friend, roomId } ─┤
   │ navigate(`/app/chat/${roomId}`)
```

### 약속 잡기 + 도착 자동 감지
```
A                         서버                       B
│ POST /appointment        │                         │
├──────────────────────────→ setAppointment()        │
│                          │  ↳ Room 약속 갱신       │
│                          │  ↳ APPOINTMENT_SET 저장 │
│←─ broadcast /topic ─────┤── broadcast /topic ───→│
│←─ broadcast .meta ──────┤── broadcast .meta ────→│
│                                                    │
│ heartbeat (15s)          │       heartbeat (15s)  │
├──────────────────────────→     ←──────────────────┤
│                          │  ↳ 거리 100m 이하 시:   │
│                          │     - markArrived()    │
│                          │     - ARRIVED 메시지   │
│                          │     - 양쪽 다면         │
│                          │       APPOINTMENT_DONE │
│←─ broadcast /topic ─────┤── broadcast /topic ───→│
```

---

## 부록 B. 자주 쓰는 트러블슈팅 명령

### 백엔드 로그
```bash
docker compose logs -f backend
docker compose logs backend | grep FriendCodeBackfill
docker compose logs backend | grep "Started"        # 부팅 시간 확인
```

### DB 직접 점검
```bash
docker compose exec mysql mysql -uroot -p1234 MUI_db -e \
  "SELECT id, name, email, friend_code FROM members;"

docker compose exec mysql mysql -uroot -p1234 MUI_db -e \
  "SELECT id, member_a_id, member_b_id, last_message, appointment_place_name
   FROM chat_rooms ORDER BY id DESC LIMIT 10;"
```

### WebSocket 핸드셰이크 디버그
브라우저 DevTools → Network → WS 탭. `/ws` 요청에서 응답 헤더 `HTTP/1.1 101 Switching Protocols` 확인.

---

# LocaPick V2 프로젝트 전체 정리

> 위치 기반 장소 추천 + 통합 길찾기 + 메모/즐겨찾기 + 1:1 실시간 채팅(약속·도착) 풀스택 서비스
> 개인 NAS(Synology/UGREEN) 자체 호스팅, Docker Compose 기반 배포

---

## 1. 프로젝트 한눈에

| 항목 | 내용 |
|---|---|
| 이름 | LocaPick V2 (`picstory-backend`) |
| 도메인 | https://locapick.mjb.diskstation.me |
| 기간/형태 | 학기 프로젝트 → V2 확장 (실시간 채팅·친구·약속) |
| 역할 분담 | 풀스택 (프론트·백엔드·인프라) |
| 호스팅 | NAS 자체 호스팅 (Docker Compose) |
| 모바일 | Capacitor로 Android 앱 빌드 가능 |

핵심 기능 5가지

1. **지도/길찾기** - 카카오맵 + Tmap(도보) + Kakao Mobility(자동차) + ODsay(대중교통) 통합
2. **장소 추천** - 도보 N분 반경 안의 음식점/옷가게 등 카테고리별 추천 (자체 가중치 알고리즘)
3. **메모(Posts)** - 다녀온 장소를 카테고리별로 기록 (Quill 에디터, 이미지 첨부)
4. **즐겨찾기(Favorites)** - 장소 원클릭 찜 + 카테고리(태그) 관리
5. **친구·1:1 실시간 채팅** - 친구 코드 → 친구 추가 → 실시간 채팅 → 약속 잡기 → 도착 자동 감지

---

## 2. 기술 스택

### 프론트엔드
- React 19 + Vite 8 + React Router DOM 7
- 상태 관리: Context API (`auth.store.jsx`)
- 스타일: SCSS (변수/믹스인 분리, 모바일 반응형 `@include mobile`)
- 지도: `react-kakao-maps-sdk` + 카카오맵 JS SDK
- HTTP: axios (인터셉터로 JWT 자동 첨부 + 401/403 시 자동 로그아웃)
- 실시간: `@stomp/stompjs` (순수 WebSocket + STOMP)
- 모바일 GPS: `@capacitor/geolocation`
- 빌드 결과물: 약 670KB JS, 117KB CSS

### 백엔드
- Java 17 + Spring Boot 3.5.11
- Spring Web + Spring Data JPA + Spring Security + Spring Validation
- Spring WebSocket (STOMP 메시지 브로커)
- JWT: `jjwt 0.12.6` (api/impl/jackson)
- DB 드라이버: `mysql-connector-j`
- HTML 정화: `jsoup 1.17.2` (메모 본문 XSS 방어)
- 빌드: Gradle 8.14

### 인프라
- MySQL 8.0 (Docker)
- Spring Boot 컨테이너
- React + Nginx 컨테이너 (정적 호스팅 + 리버스 프록시)
- Docker Compose로 3-tier 통합
- Spring Boot Actuator (health 체크 → docker compose `condition: service_healthy`)

---

## 3. 디렉토리 구조

```
LocaPick_V2/
├── backend/                                    # Spring Boot
│   ├── src/main/java/picstory/backend/
│   │   ├── BackendApplication.java
│   │   ├── config/                             # Spring 설정
│   │   │   ├── AppConfig.java                  # RestTemplate Bean
│   │   │   ├── SecurityConfig.java             # JWT 필터 체인 + CORS
│   │   │   ├── WebConfig.java                  # 정적 리소스(/uploads) 매핑
│   │   │   ├── WebSocketConfig.java            # STOMP + JWT ChannelInterceptor
│   │   │   └── FriendCodeBackfillRunner.java   # 옵션: 친구 코드 일괄 백필
│   │   ├── controller/                         # REST + STOMP 엔드포인트
│   │   │   ├── AuthController.java             # /auth/** (회원가입/로그인/카카오)
│   │   │   ├── MemberController.java           # /members/** (내 정보/프로필 사진)
│   │   │   ├── AdminController.java            # /admin/** (회원 상태 관리)
│   │   │   ├── PostController.java             # /posts/** (메모 CRUD)
│   │   │   ├── ImageController.java            # /images/** (게시글/채팅 사진)
│   │   │   ├── FavoriteController.java         # /favorites/** (즐겨찾기)
│   │   │   ├── LocapickController.java         # /locapick/** (장소 추천)
│   │   │   ├── FriendController.java           # /friends/** (친구 관계)
│   │   │   ├── ChatController.java             # /chat/** (REST: 방·메시지·약속)
│   │   │   └── ChatStompController.java        # @MessageMapping (STOMP)
│   │   ├── domain/                             # JPA 엔티티
│   │   │   ├── Member, MemberRole, MemberStatus
│   │   │   ├── Post, PostCategory, PostImage
│   │   │   ├── Favorite
│   │   │   ├── Friendship
│   │   │   ├── ChatRoom, ChatMessage, ChatMessageType
│   │   ├── repository/                         # Spring Data JPA
│   │   ├── service/                            # 트랜잭션·비즈니스 로직
│   │   │   ├── AuthService, KakaoAuthService
│   │   │   ├── MemberService, AdminService
│   │   │   ├── PostService, LocapickService
│   │   │   ├── FriendService, FriendCodeGenerator
│   │   │   ├── ChatService
│   │   ├── security/
│   │   │   ├── JwtUtil.java                    # 토큰 생성/검증
│   │   │   ├── JwtAuthFilter.java              # OncePerRequestFilter
│   │   │   └── PasswordConfig.java             # BCryptPasswordEncoder Bean
│   │   └── web/
│   │       ├── GlobalExceptionHandler.java     # @RestControllerAdvice
│   │       └── dto/                            # 18개 DTO (record)
│   ├── src/main/resources/application.yaml
│   ├── build.gradle
│   └── Dockerfile_backend.prod
│
├── frontend/                                   # React + Vite
│   ├── src/
│   │   ├── api/                                # axios 모듈 + 외부 API
│   │   │   ├── client.js                       # axios 인스턴스 + 인터셉터
│   │   │   ├── auth.api.js, member.api.js, post.api.js
│   │   │   ├── favorite.api.js, locapick.api.js
│   │   │   ├── friend.api.js, chat.api.js
│   │   │   ├── chat.socket.js                  # STOMP 싱글톤
│   │   │   ├── route.api.js                    # TMAP/Kakao/ODsay 호출
│   │   │   └── geo.js                          # GPS (Capacitor + 웹 fallback)
│   │   ├── app/
│   │   │   ├── router.jsx                      # React Router 라우트 정의
│   │   │   ├── ProtectApp.jsx, PublicLayout.jsx
│   │   ├── components/layouts/                 # Header, Footer, SideMenu
│   │   ├── pages/
│   │   │   ├── Auth/                           # Login, Signup, KakaoCallback
│   │   │   ├── Map/MapHome.jsx                 # 메인 지도 + 길찾기
│   │   │   ├── Memo/                           # Memo, MemoWrite, MemoDetail, MemoEdit
│   │   │   ├── Favorites/Favorites.jsx
│   │   │   ├── MyPage/MyPage.jsx + FriendsPanel.jsx
│   │   │   ├── Admin/AdminDashboard.jsx
│   │   │   └── Chat/                           # ChatLayout, ChatList, ChatRoom,
│   │   │                                       # ChatEmpty, NewChatPicker, PlacePickerModal
│   │   ├── store/auth.store.jsx                # Context Provider
│   │   └── styles/                             # _variables, _mixins, globals
│   ├── nginx.conf                              # Nginx 설정 (API/WS/uploads 프록시)
│   ├── vite.config.js                          # dev proxy
│   ├── capacitor.config.json                   # 안드로이드 앱 설정
│   └── Dockerfile.prod
│
├── docker-compose.yml                          # MySQL + Backend + Frontend
├── init.sql                                    # 초기 DB 스키마 (members)
└── docs/                                       # 본 문서들
```

---

## 4. 시스템 아키텍처

```
┌──────────────┐
│   브라우저    │  React + Vite (개발: 5173, 운영: Nginx 80→5173)
│  / 안드로이드  │  Capacitor 앱
└──────┬───────┘
       │ HTTPS / WSS
       ↓
┌──────────────┐
│   Nginx       │  /          → React SPA
│  (frontend)   │  /api/      → backend:8080
│               │  /ws        → backend:8080/ws (Upgrade 헤더 처리)
│               │  /uploads/  → backend:8080/uploads
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Spring Boot   │  REST  : @RestController
│  (backend)    │  STOMP : @MessageMapping("/chat.send/{id}")
│               │  JWT   : JwtAuthFilter (HTTP) + ChannelInterceptor (WS)
└──────┬───────┘
       │ JDBC
       ↓
┌──────────────┐
│   MySQL 8.0   │  members, posts, post_images, favorites,
│               │  friendships, chat_rooms, chat_messages
└──────────────┘

외부 API (브라우저 직결):
- Kakao Map JS SDK (지도 렌더링)
- TMAP API (도보 경로/시간)
- Kakao Mobility (자동차 경로/시간)
- ODsay API (대중교통 경로/시간)

외부 API (백엔드 호출):
- Kakao Local API (장소 추천 LocapickService)
- Kakao OAuth (KakaoAuthService)
```

---

## 5. 데이터베이스 스키마

### Members (회원)
```
id (PK), name, email (unique), password_hash,
phone (unique nullable), kakao_id (unique nullable),
role (USER/ADMIN), status (ACTIVE/SUSPENDED/DELETED),
email_verified, profile_image_url (LONGTEXT, Data URI),
friend_code (unique, 8자 영숫자),
created_at, updated_at
```

### Posts (메모)
```
id (PK), member_id (FK→members), category (PostCategory enum),
title, content (LONGTEXT, Quill HTML), created_at, updated_at
```

### PostImages (게시글/채팅 첨부 이미지)
```
id (UUID, PK), base64_data (LONGTEXT), mime_type
* Post와 직접 FK 관계 없음 — 컨텐츠 안에서 /api/images/{uuid} URL로 참조
```

### Favorites (즐겨찾기)
```
id (PK), member_id (FK), place_name, lat, lng, address,
category (사용자 정의 태그), parking_status (0/1/2), created_at
```

### Friendships (친구 관계)
```
id (PK), member_a_id (FK), member_b_id (FK),
created_at, UNIQUE(member_a_id, member_b_id)
* 정규화: 항상 작은 ID를 memberA에 둔다 → 중복 행 방지
```

### ChatRoom (채팅방)
```
id (PK), member_a_id, member_b_id, post_id (nullable),
last_message, last_message_at,
member_a_last_read_message_id, member_b_last_read_message_id,
appointment_place_name, appointment_place_address,
appointment_lat, appointment_lng, appointment_set_at,
member_a_arrived_at, member_b_arrived_at, appointment_ended_at,
created_at
```

### ChatMessage (채팅 메시지)
```
id (PK), room_id (FK), sender_id (FK), type (enum 8종),
content (TEXT), eta_minutes, eta_mode (WALK/CAR/TRANSIT),
image_url, place_name, place_address, place_lat, place_lng,
created_at
```

ChatMessageType 8종:
`TEXT, ETA, IMAGE, PLACE, APPOINTMENT_SET, ARRIVED, APPOINTMENT_DONE, APPOINTMENT_CANCELED`

스키마 관리: `spring.jpa.hibernate.ddl-auto: update` — 새 엔티티/컬럼이 추가되면 자동 반영. 운영 안정성을 위해 핵심 테이블(`members`)은 `init.sql`에 명시.

---

## 6. 인증 흐름 (JWT)

```
[프론트]                            [백엔드]
  로그인 폼                            
  → POST /auth/login   ─────→ AuthService.login()
                                   ↳ Member 조회
                                   ↳ BCrypt 비밀번호 검증
                                   ↳ JwtUtil.generateToken()
                                   ↳ HMAC-SHA256, exp 1일
  ← LoginResponse (token+user)  ←
  ↳ localStorage.accessToken
  ↳ AuthProvider.login()
  
  이후 모든 요청:
  axios interceptor가
  Authorization: Bearer ... 첨부
  
  → 백엔드 JwtAuthFilter
       ↳ 토큰 파싱/검증
       ↳ Authentication 객체 생성
       ↳ SecurityContextHolder 저장
       ↳ Principal = memberId (Long)
  
  → @RestController에서
       Authentication auth.getPrincipal() → memberId
```

WebSocket(STOMP)도 같은 토큰을 CONNECT 헤더로 검증 — `WebSocketConfig.configureClientInboundChannel()`에서 ChannelInterceptor로 처리.

---

## 7. 주요 사용자 시나리오

### 시나리오 A: 처음 가입한 사용자
1. `/signup` → 이메일/비번/이름/전화 입력 → `AuthService.signup()`
2. 백엔드가 SVG 아바타 생성 + Base64 Data URI로 저장
3. `FriendCodeGenerator.generateUnique()` 호출 → 8자리 친구 코드 발급
4. 회원가입 완료 → 로그인 → JWT 토큰 발급 → 메인 지도(`/app`)

### 시나리오 B: 장소 추천 + 즐겨찾기
1. `/app` 진입 → GPS 권한 요청 → 현재 좌표
2. "5분 안의 음식점" 선택 → `GET /locapick/search?lat&lng&time=5&count=10&category=restaurant`
3. 백엔드 `LocapickService` → 카카오 Local API 호출 → 자체 가중치(리뷰+거리) 재정렬
4. 결과 클릭 → 즐겨찾기 별 클릭 → `POST /favorites/toggle`
5. 마이페이지에서 카테고리(태그) 분류

### 시나리오 C: 메모 작성
1. `/app/memo/write` → Quill 에디터에서 사진 첨부
2. 사진 → `POST /images` (multipart) → DB에 Base64로 저장 → URL 응답
3. 본문 저장 → `POST /posts` → `Jsoup.clean()`으로 XSS 정화 후 LONGTEXT에 HTML 저장

### 시나리오 D: 친구 추가 + 채팅
1. 마이페이지에서 내 친구 코드 확인 (예: `A2B7XK9P`)
2. 상대 코드 입력 → `POST /friends` → `FriendService.addFriendByCode()`
   - 친구 관계 정규화 저장 + 채팅방 자동 생성
3. ChatList의 ✏️ 새 채팅 버튼 또는 친구 카드 "💬 채팅" 클릭 → 그 방으로 이동
4. STOMP 연결: `wss://.../ws` + `Authorization: Bearer ...` CONNECT
5. `/topic/chat.room.{id}` 구독, `/app/chat.send/{id}` publish

### 시나리오 E: 약속 + 도착 자동 감지
1. ChatRoom의 (+) → "약속 잡기" → `PlacePickerModal`로 장소 검색/선택
2. `POST /chat/rooms/{id}/appointment` → `ChatService.setAppointment()`
   - ChatRoom의 약속 캐시 컬럼 갱신 + `APPOINTMENT_SET` 시스템 메시지 발급
   - 두 토픽 broadcast: `/topic/chat.room.{id}` (메시지) + `.meta` (헤더 갱신)
3. 양쪽 클라이언트가 15초마다 `POST /chat/rooms/{id}/heartbeat`로 GPS 위치 보고
4. 백엔드가 약속 장소까지 거리(haversine) 계산 → 100m 이내면 `markArrived()`
5. 한 명 도착 → `ARRIVED` 메시지 broadcast
6. 양쪽 다 도착 → 자동 종료 + `APPOINTMENT_DONE` 메시지

### 시나리오 F: 카카오 OAuth 로그인
1. `/login` → "카카오로 로그인" → `GET /auth/kakao` (서버가 카카오 인증 페이지로 redirect)
2. 카카오 인증 → `GET /auth/kakao/callback?code=...`
3. `KakaoAuthService.getAccessToken()` → `getKakaoUserInfo()` → `findOrCreateMember()`
4. 신규면 친구 코드도 자동 발급
5. JWT 발급 → 프론트엔드 `/kakao-callback?token=...`로 redirect → AuthProvider에 저장

---

## 8. 프론트엔드 라우팅 구조

```
/                     Public  Landing
/login                Public  Login
/signup               Public  Signup
/kakao-callback       Public  KakaoCallback (토큰 파싱)

/app                  Protect ProtectApp + <Outlet/>
  /                          → MapHome (메인 지도)
  /dashboard                 → Dashboard
  /mypage                    → MyPage (+ FriendsPanel)
  /favorites                 → Favorites
  /memo                      → Memo (목록)
    /write                   → MemoWrite
    /:id                     → MemoDetail
    /edit/:id                → MemoEdit
  /chat                      → ChatLayout (좌: ChatList, 우: <Outlet/>)
    (index)                  → ChatEmpty
    /:roomId                 → ChatRoom

/admin                Protect (role=ADMIN)
  /                          → AdminDashboard
```

---

## 9. 배포 운영

### 로컬 개발
```bash
# 백엔드
cd backend && ./gradlew bootRun

# 프론트엔드 (Vite dev — proxy로 백엔드 연결)
cd frontend && npm run dev
```

### NAS 운영 배포
```bash
docker compose up -d --build
```

3개 컨테이너:
- `mysql-M_UI-prod` — MySQL 8.0, healthcheck로 mysqladmin ping
- `spring-back-M_UI-prod` — Spring Boot, Actuator health 체크
- `react-front-M_UI-prod` — React + Nginx

### 네트워크 토폴로지
- 외부: 브라우저 → Synology Reverse Proxy → 컨테이너 5173(Nginx)
- Nginx가 `/api`, `/ws`, `/uploads` 분기
- WebSocket용 `Upgrade`/`Connection: upgrade` 헤더, `proxy_read_timeout 3600s`

### 안드로이드 앱
- Capacitor로 빌드 — `npm run build` → `npx cap sync` → Android Studio
- 운영 도메인 직결 (`https://locapick.mjb.diskstation.me`)
- WebSocket은 `wss://locapick.mjb.diskstation.me/ws`

---

## 10. 보안 요약

- **인증**: BCrypt 해시 + JWT(HMAC-SHA256, 시크릿 32자 이상)
- **인가**: SecurityFilterChain의 `requestMatchers` + 메서드 단위 `@PreAuthorize("hasRole('ADMIN')")`
- **CSRF**: REST + JWT라서 disable (Stateless)
- **CORS**: 화이트리스트로 운영 도메인·로컬·Capacitor 만 허용
- **XSS**: 메모 본문 `Jsoup.clean(..., Safelist.relaxed())`
- **파일 업로드**: MIME `image/*` 검증, 5MB 제한
- **WebSocket**: STOMP CONNECT 시점 JWT 강제 검증
- **세션**: STATELESS (HTTP 세션 사용 안 함)

---

## 11. 외부 API 키 관리

| 키 | 사용처 | 노출 형태 |
|---|---|---|
| Kakao JS SDK | 프론트 지도 렌더링 | `index.html` `<script>`에 노출 (도메인 화이트리스트로 보호) |
| Kakao REST | 프론트(길찾기) + 백엔드(장소 추천·OAuth) | `VITE_KAKAO_REST_KEY` + `KAKAO_REST_KEY` 동일값 |
| TMAP | 프론트 도보 경로 | `VITE_TMAP_KEY` |
| ODsay | 프론트 대중교통 | `VITE_ODSAY_KEY` |

`VITE_*` 프리픽스 변수는 Vite 빌드 시 클라이언트 번들에 박힘. 키 자체의 보안은 외부 API 콘솔의 도메인/사용량 화이트리스트에 의존.

---

## 12. 개발하면서 학습한 것 / 트러블슈팅

### A. CORS와 Nginx 프록시
- 프론트(Vite 5173) ↔ 백엔드(Spring 8080) 분리 → Nginx 리버스 프록시로 통합
- `/api` prefix를 백엔드 root로 rewrite하지 않고 그대로 전달하는 vs rewrite 방식 비교 후 운영은 그대로 전달

### B. JWT WebSocket 인증
- HTTP 필터(`OncePerRequestFilter`)는 WebSocket 핸드셰이크 이후엔 동작 안 함
- 해결: `ChannelInterceptor.preSend()`에서 `StompCommand.CONNECT`일 때만 헤더 검증

### C. ddl-auto: update의 한계
- 새 컬럼은 자동 추가되지만 데이터는 못 채움 (예: 기존 회원의 friend_code)
- 해결 1: lazy 발급 (`/members/me` 호출 시 즉시 발급)
- 해결 2: 옵션 플래그 + ApplicationRunner 백필

### D. fixed 레이아웃과 글로벌 SCSS 룰 충돌
- 채팅 화면에서 `<section> { min-height: 100vh }`, `.app-bg { min-height: 100vh }` 글로벌 룰이 ChatLayout fixed 영역을 뚫고 입력창을 viewport 밖으로 밀어내는 문제
- 해결: ChatLayout 자식을 `<div>`로 변경 + ChatRoom의 `app-bg` 클래스 제거 + `> * { min-height: 0 }` 안전망

### E. 이미지 첨부 시 입력창 사라지는 flex 함정
- `.chat-messages`가 `flex: 1`만 갖고 있어 자식(긴 이미지)이 부모 크기를 넘어 입력창을 밀어냄
- 해결: `flex: 1 1 0; min-height: 0;` + 모든 형제(헤더/배너/입력창)에 `flex-shrink: 0` + 이미지 max-height 제한

### F. 카카오 OAuth callback 중복 호출
- 브라우저 prefetch/확장프로그램이 `/auth/kakao/callback?code=...`를 중복 호출하면 카카오는 `KOE320` 에러 반환
- 해결: ConcurrentHashMap에 `code → 성공 redirect URL` 캐시. 두 번째 호출은 캐시된 URL로 그대로 redirect

### G. 운영 NAS의 메모리 제한
- docker-compose `deploy.resources.limits.memory: 2g` (MySQL/Backend 각각)
- Spring Boot health `start_period: 60s`로 첫 부팅 안정성 확보

---

## 13. 향후 개선 후보

- 메시지 페이징 (현재는 방의 모든 메시지 한 번에 로드)
- 1:N 그룹 채팅 (현재 1:1 전용)
- 메시지 답장(reply)/이모지 리액션
- 푸시 알림 (FCM)
- WebRTC 음성/영상 통화
- 메시지 삭제/수정
- E2E 암호화 옵션
- 이미지 디스크 저장 + CDN (현재는 DB Base64 저장)
- 메시지/방 hard delete → soft delete로 전환 (감사 추적)
- 친구 요청 승인 흐름 (현재는 코드 알면 즉시 추가)
- 실시간 타이핑 표시 (`ChatStompController.ping`은 echo 자리만 마련)

---

## 14. 빌드/실행 요약

### 백엔드
```bash
cd backend
./gradlew clean build -x test         # 빌드
./gradlew bootRun                      # 실행
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev                            # 개발 (5173)
npm run build                          # 운영 빌드 → dist/
npm run preview                        # 빌드 결과 미리보기
```

### Docker
```bash
docker compose up -d --build          # 전체 빌드+실행
docker compose logs -f backend        # 로그
docker compose down                    # 종료 (볼륨 보존)
```

---

본 문서는 프로젝트의 거시 구조를 다룬다.
- **채팅 도메인 자체의 자세한 구조** → `02_CHAT_HOME_MYPAGE_INTEGRATION.md`
- **백엔드 보안/구현/예상 질문** → `03_BACKEND_FAQ.md`

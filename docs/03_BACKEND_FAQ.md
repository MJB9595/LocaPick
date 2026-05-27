# 백엔드 예상 질문 모음 (보안 · 작동 흐름 · 구현 방식)

> 이클립스 + JSP 위주 환경에 익숙한 평가자를 가정한 질문/답변 모음.
> 답변은 LocaPick V2의 실제 코드 기반으로 작성.
> 문서 길이가 길지만 카테고리별로 검색해 사용 가능.

---

## 목차

- [A. 아키텍처 / 흐름](#a-아키텍처--흐름)
- [B. JSP/이클립스 비교 관점 질문](#b-jsp이클립스-비교-관점-질문)
- [C. 보안 (인증·인가·CSRF·XSS·SQLi)](#c-보안-인증인가csrfxsssqli)
- [D. JWT](#d-jwt)
- [E. JPA / 트랜잭션](#e-jpa--트랜잭션)
- [F. WebSocket / 실시간](#f-websocket--실시간)
- [G. 외부 API / OAuth](#g-외부-api--oauth)
- [H. 파일 업로드 / 이미지](#h-파일-업로드--이미지)
- [I. 운영 / 배포 / Docker](#i-운영--배포--docker)
- [J. 데이터 무결성 / 동시성](#j-데이터-무결성--동시성)
- [K. 성능 / 확장성](#k-성능--확장성)
- [L. 테스트 / 디버깅](#l-테스트--디버깅)
- [M. 코드 컨벤션 / 설계 결정](#m-코드-컨벤션--설계-결정)

---

## A. 아키텍처 / 흐름

### A1. 요청 한 건이 들어오면 어떤 순서로 처리되나?
1. 브라우저 → Synology Reverse Proxy → Nginx 컨테이너 (`frontend`)
2. Nginx가 path로 분기:
   - `/` → React 정적 파일
   - `/api/*` → `backend:8080` (`proxy_pass http://backend:8080/`)
   - `/uploads/`, `/ws` 도 동일 패턴
3. Spring Boot 진입 → 임베디드 Tomcat
4. **`SecurityFilterChain`** 진입 → 그 안에 등록된 `JwtAuthFilter`(OncePerRequestFilter)가 가장 먼저 실행
5. JWT가 유효하면 `SecurityContextHolder`에 `Authentication` 저장 (Principal = `memberId: Long`)
6. URL 매칭 → 해당 `@RestController`의 메서드 호출
7. 컨트롤러가 `Authentication`에서 `memberId`를 꺼내 서비스 호출
8. `@Service` 메서드는 보통 `@Transactional` — JPA가 `EntityManager`/트랜잭션을 시작
9. `@Repository`(Spring Data JPA)가 SQL 생성·실행 → MySQL
10. 결과 → DTO(record) 변환 → JSON 직렬화 → 응답
11. 예외 발생 시 `@RestControllerAdvice`인 `GlobalExceptionHandler`가 잡아서 일관된 에러 응답

### A2. JSP 시절 `<%= request.getParameter("id") %>` 같은 코드가 어디로 갔는지?
- HTTP request 파라미터 → Spring MVC가 `@RequestParam`, `@PathVariable`, `@RequestBody` 어노테이션으로 자동 바인딩
- JSON body → Jackson이 자동으로 DTO(record)로 역직렬화
- JSP의 forward/redirect는 SPA 구조에서는 거의 없음. 대신 REST 응답 + 프론트가 `react-router-dom`으로 클라이언트 라우팅

### A3. MVC 패턴 어디서 어떻게 나뉘나?
- **Controller**: `picstory.backend.controller.*` — HTTP/STOMP 진입점, 권한 추출, 서비스 호출, 응답 DTO 변환
- **Service**: `picstory.backend.service.*` — 트랜잭션 경계, 비즈니스 규칙
- **Repository**: `picstory.backend.repository.*` — JPA 인터페이스 (Spring이 구현체 자동 생성)
- **Domain**: `picstory.backend.domain.*` — JPA 엔티티 (테이블 매핑 + 도메인 메서드)
- **DTO**: `picstory.backend.web.dto.*` — 외부와 주고받는 데이터 (record)
- **Config**: `picstory.backend.config.*` — Bean 정의, 보안 체인, WebSocket, CORS

### A4. 스프링이 객체를 어떻게 만들어주나?
- `@Component` 계열(`@Service`, `@RestController`, `@Repository`, `@Configuration`)이 붙은 클래스는 부팅 시 ApplicationContext가 인스턴스를 만들어 등록 (Bean)
- 다른 Bean이 필요하면 생성자 주입 (Lombok `@RequiredArgsConstructor`가 final 필드 기준으로 생성자 자동 생성)
- 즉 `MemberService(memberRepository, passwordEncoder, friendCodeGenerator)` 같은 생성자가 컴파일 시 자동 만들어지고, Spring이 부팅 시 의존 그래프대로 주입

---

## B. JSP/이클립스 비교 관점 질문

### B1. JSP에서는 sessionScope에 user를 저장하던데, 여기는 세션을 안 쓴다? 그럼 로그인 상태는 어떻게 유지되나?
- 본 프로젝트는 **STATELESS (무세션)** 정책. `SecurityConfig`에서 `SessionCreationPolicy.STATELESS` 명시
- 로그인 성공 시 서버는 **JWT 토큰**을 발급해 응답 본문에 담아 보냄
- 클라이언트가 `localStorage.accessToken`에 저장 후 모든 요청 헤더 `Authorization: Bearer ...`로 첨부
- 서버는 매 요청마다 토큰을 검증해 사용자 정보를 복원 → DB의 세션 테이블이나 메모리 세션이 필요 없음
- 장점: 서버 수평 확장이 쉽고(서버 어느 인스턴스에 가도 됨), 모바일 앱(Capacitor)에서도 동일하게 동작

### B2. JSP에서 `<%@ include %>`나 JSTL 같은 게 있는데 React에서는 어떻게?
- React의 컴포넌트가 그 역할. 헤더/푸터는 `Header.jsx`/`Footer.jsx`로 분리되고 `ProtectApp.jsx`가 `<Header/>`, `<Outlet/>`, `<Footer/>`를 한 화면에 합침
- 조건부 렌더링은 `{ isAuthed ? <A/> : <B/> }`처럼 JSX 표현식
- 반복은 `array.map(item => <Item key=.../>)`

### B3. JSP에서는 url 매핑을 `@WebServlet` 또는 web.xml에서 했는데?
- Spring은 `@RequestMapping`/`@GetMapping`/`@PostMapping` 등 어노테이션으로 메서드 단위 매핑
- 클래스 레벨에 `@RequestMapping("/chat")` + 메서드 레벨에 `@GetMapping("/rooms/{roomId}")` → 최종 `GET /chat/rooms/{roomId}`
- `web.xml` 같은 별도 설정 파일이 필요 없음

### B4. 이클립스에서 톰캣 `Run on Server`로 띄웠는데 여기는 어떻게 실행?
- 본 프로젝트는 **Spring Boot 임베디드 Tomcat**. `BackendApplication.java`의 `main()` 한 번 실행하면 톰캣이 그 안에서 자동 시작
- 빌드 산출물: `bootJar`로 만든 단일 jar 파일 → `java -jar app.jar`만으로 실행 가능
- 배포는 Docker 컨테이너로 격리해서 실행

### B5. JSP의 `<form action="..." method="post">`가 `RestController`에선 어떻게 되나?
- 폼 자체가 사라짐. 프론트가 axios로 JSON을 POST하고 백엔드는 `@RequestBody DTO`로 받음
- multipart 파일은 `@RequestParam("file") MultipartFile file` (예: `ImageController`, `MemberController`)

---

## C. 보안 (인증·인가·CSRF·XSS·SQLi)

### C1. 비밀번호는 어떻게 저장하나?
- **BCrypt 해시**. `PasswordConfig`의 `BCryptPasswordEncoder` Bean이 처리
- `AuthService.signup()`에서 `passwordEncoder.encode(req.password())`로 해시
- 검증은 `passwordEncoder.matches(rawPassword, member.getPasswordHash())`
- BCrypt는 자체 salt + cost factor로 rainbow table 공격 무력화

### C2. SQL Injection 위험은?
- 모든 쿼리는 **JPA/Spring Data JPA**가 PreparedStatement로 처리 → 자동 파라미터 바인딩
- 메서드 명명 규칙 (`findByEmail`, `existsByFriendCode`)이나 `@Query` 어노테이션의 `:param` 파라미터 모두 안전
- 동적 쿼리는 Criteria/QueryDSL이 아니라도, JPA의 named parameter (`@Param`)를 일관되게 사용
- 사용자 입력이 SQL에 직접 들어가는 곳 없음

### C3. CSRF 방어는?
- `SecurityConfig`에서 `csrf.disable()`. 이유는:
  - **STATELESS + JWT** 구조 → CSRF는 쿠키 자동 전송 시 발생하는 공격이라 적용 무관
  - JWT는 쿠키가 아니라 `Authorization` 헤더로 전달. 다른 사이트의 폼이 자동으로 그 헤더를 못 붙임
- 만약 쿠키 인증으로 바꾼다면 CSRF 토큰이 필요해짐

### C4. XSS 방어는?
- **메모(게시글) 본문**: 사용자가 Quill 에디터로 HTML을 작성. `PostService.create()`/`update()`에서 `Jsoup.clean(content, Safelist.relaxed().addTags("img").addAttributes("img","src"))` 적용
  - `Safelist.relaxed()`는 안전한 태그/속성만 허용. `<script>`, `onerror`, `onclick` 등은 모두 제거
- **채팅 메시지**: HTML을 받지 않음. TEXT 타입은 평문이고 React가 렌더링 시 자동 escape (JSX는 기본적으로 텍스트 컨텐츠를 escape)
- **이미지 URL**: DB에 저장된 `/api/images/{uuid}` 형태만 사용. 임의 URL을 외부에서 주입할 수 없음
- **프로필 이미지**: 백엔드가 `data:image/...;base64,...` 형식으로 직접 만들어 저장. img 태그가 자체 디코딩 (XSS 위험 없는 데이터)

### C5. CORS 설정은 어떻게?
```java
// SecurityConfig
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "http://localhost:5173", "http://localhost:3000",
        "http://192.168.50.182:5173",
        "https://locapick.mjb.diskstation.me",
        "capacitor://localhost", "https://localhost", "http://localhost"
    ));
    config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```
- 허용 origin을 화이트리스트로 제한. `*`을 쓰지 않음
- Capacitor 앱 (`capacitor://localhost`)도 명시적으로 허용

### C6. 권한(인가)은 어떻게 거나?
**URL 단위 (`SecurityConfig`)**
```java
.requestMatchers(POST, "/auth/signup", "/auth/login").permitAll()
.requestMatchers(GET,  "/auth/kakao", "/auth/kakao/callback").permitAll()
.requestMatchers("/auth/**", "/actuator/health",
                 "/locapick/**", "/uploads/**", "/api/uploads/**",
                 "/images/**", "/api/images/**").permitAll()
.requestMatchers("/ws/**").permitAll()
.requestMatchers("/admin/**").hasRole("ADMIN")
.requestMatchers(GET, "/members").hasRole("ADMIN")
.requestMatchers("/members/**").authenticated()
.anyRequest().authenticated()
```

**메서드 단위 (`@PreAuthorize`)**
```java
@RestController @RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")  // 클래스 전체에 적용
public class AdminController { ... }
```
- `@EnableMethodSecurity`로 활성화 (SecurityConfig)

**리소스 단위 (서비스 안)**
- 채팅방 접근 시 `getRoomAndCheckMember(roomId, memberId)`로 그 방의 멤버 여부 검증
- 게시글 수정/삭제 시 `if (!post.getMember().getId().equals(memberId)) throw ...`

### C7. 토큰을 탈취당하면?
- HTTPS 필수 (운영은 NAS의 reverse proxy가 SSL 종단)
- 만료 시간 1일 (`JWT_EXPIRATION_MS=86400000`)
- 탈취 시 사용자가 로그아웃해도 토큰은 만료까지 유효 — 한계
- 개선 방안: refresh token 분리 + access token 짧게(15분) + 블랙리스트 (Redis 기반). 현재는 학생 프로젝트 범위라 단일 토큰

### C8. 정지된 계정 차단은?
- `AuthService.login()`에서 `MemberStatus`가 `SUSPENDED`/`DELETED`인지 체크 후 예외
- 어드민 화면(`/admin/members/{id}/status`)으로 상태 변경 가능
- 다만 발급된 토큰은 만료까지 유효. 즉시 강제 로그아웃은 위 refresh token 구조가 도입돼야 가능

---

## D. JWT

### D1. JWT 구조와 페이로드 내용?
HMAC-SHA256 서명. `header.payload.signature` 3개 part.
```java
// JwtUtil.generateToken()
return Jwts.builder()
    .subject(email)                 // sub = 이메일
    .claim("memberId", memberId)    // 커스텀 claim
    .claim("role", role.name())     // USER/ADMIN
    .issuedAt(now)
    .expiration(new Date(now.getTime() + expirationMs))
    .signWith(secretKey)            // HMAC-SHA256
    .compact();
```

### D2. 시크릿 키는 어디서 어떻게 관리?
- `application.yaml`의 `jwt.secret: ${JWT_SECRET:...}` → 환경변수 우선
- 운영은 docker-compose의 `JWT_SECRET` env로 주입 (NAS의 `.env`에 보관)
- 32바이트 이상이어야 HMAC-SHA256이 동작 (`Keys.hmacShaKeyFor` 내부 검증)

### D3. JWT 서명을 위조할 수 있나?
- 서명을 만들려면 시크릿 키가 필요 → 시크릿이 노출되지 않는 한 위조 불가능
- JWT 라이브러리(`jjwt 0.12.x`)가 `none` 알고리즘 공격 등 알려진 취약점은 모두 차단

### D4. 토큰 만료 처리는?
- 클라이언트: axios 응답 인터셉터에서 401/403 응답 시 즉시 로그아웃 + `/login` redirect
```javascript
client.interceptors.response.use(r => r, (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});
```
- 서버: 만료된 토큰은 `validateToken()`이 false → `JwtAuthFilter`가 SecurityContext에 저장하지 않음 → 인증 필요 URL은 401

### D5. 토큰에 비밀번호 같은 민감정보를 넣지 않는 이유?
- JWT의 payload는 **서명만 되고 암호화는 안 됨**. base64 디코딩으로 누구나 내용 읽을 수 있음
- 그래서 비밀번호/주소/주민번호 같은 건 절대 넣지 않음
- 본 프로젝트는 `memberId`, `email`, `role`만 담아 권한 결정에만 사용

---

## E. JPA / 트랜잭션

### E1. `ddl-auto: update`는 안전한가?
- 학생 프로젝트 단계에서는 새 컬럼/테이블 추가 시 자동 생성으로 편리
- 단점:
  - 컬럼명 바꾸면 새 컬럼이 생기고 옛 컬럼이 그대로 남아 데이터 분리됨
  - 운영 DB에서는 위험 — 보통 `validate`로 두고 Flyway/Liquibase로 명시적 마이그레이션
- 본 프로젝트는 핵심 테이블(`members`)만 `init.sql`에 명시, 나머지는 `ddl-auto: update`로 운영
- 채팅 추가 시 `chat_rooms`, `chat_messages`, `friendships` 등이 첫 부팅에 자동 생성된 것도 이 방식 덕분

### E2. `@Transactional`은 어디에 붙이나?
- 기본적으로 **서비스 메서드**. 컨트롤러나 리포지토리 X
- 클래스 레벨 `@Transactional(readOnly = true)` + 변경 메서드에 `@Transactional`로 readWrite override (e.g. `ChatService`)
- readOnly는 hibernate가 더티 체킹 스냅샷을 생략 → 읽기 성능 최적화

### E3. JPA에서 N+1 문제가 발생할 수 있는 곳?
- `ChatService.findMyRooms(myId)` — 방 N개 조회 → 각 방의 unreadCount 산출 시 추가 쿼리 + opponent/lastMessage 등 lazy loading
- 현재는 트래픽 적어 문제없지만, 개선하려면:
  - `@EntityGraph`로 `member_a`, `member_b`, `post`를 미리 fetch join
  - 또는 native query로 한 번에 집계

### E4. 영속성 컨텍스트(persistence context)와 dirty checking?
- `@Transactional` 안에서 조회한 엔티티는 영속 상태
- 필드를 수정하면 트랜잭션 커밋 시 자동으로 update SQL 발생 (별도 save 호출 불필요)
- 본 프로젝트의 핵심 패턴:
```java
@Transactional
public void markRoomAsRead(Long roomId, Long myId) {
    ChatRoom room = chatRoomRepository.findById(roomId)...;
    room.markRead(myId, lastMessageId);   // setter만 호출, save 불필요
    // 메서드 종료 시 트랜잭션 커밋 → JPA가 update 자동 실행
}
```

### E5. EAGER vs LAZY?
- 전부 `LAZY`로 설정 (`@ManyToOne(fetch = FetchType.LAZY)`)
- EAGER는 의도하지 않은 join을 만들어 성능 문제 + 무한 순환 가능
- LAZY 사용 시 트랜잭션 안에서 미리 접근하거나 fetch join 사용

### E6. `@OneToMany` vs `@ManyToOne` 어떻게 결정?
- 본 프로젝트는 의도적으로 `@OneToMany`를 거의 안 씀. 양방향 관계는 복잡도/실수 빈도가 높음
- `Post.member`만 `@ManyToOne`. `Member.posts` 같은 역방향은 만들지 않고 필요할 때 `postRepository.findAllByMemberIdOrderByCreatedAtDesc()`로 조회
- 채팅도 `ChatRoom.memberA`, `memberB`만 두고 `Member.rooms` 만들지 않음

---

## F. WebSocket / 실시간

### F1. HTTP인 REST와 WebSocket을 어떻게 같이 쓰나?
- HTTP는 클라이언트가 요청해야 응답 가능 (poll). 실시간 push가 안 됨
- WebSocket은 한 번 핸드셰이크 후 양방향 지속 연결
- 본 프로젝트는:
  - 메시지 송신: 클라가 STOMP publish → 서버 broadcast → 다른 클라이언트가 즉시 수신
  - 메시지 페이징/방 메타: REST (`/chat/rooms/{id}/messages`)

### F2. STOMP는 무엇인가?
- WebSocket 위에 동작하는 메시징 프로토콜 (frame 기반)
- pub/sub 추상화: `/topic/X`(브로드캐스트), `/queue/Y`(개인), `/app/Z`(서버 처리 destination)
- Spring이 `@MessageMapping`으로 STOMP destination을 메서드에 매핑

### F3. 채팅 토픽 구조는?
| Destination | 방향 | 설명 |
|---|---|---|
| `/app/chat.send/{roomId}` | 클라→서버 | 메시지 publish |
| `/topic/chat.room.{roomId}` | 서버→클라 | 방의 모든 메시지 broadcast |
| `/topic/chat.room.{roomId}.meta` | 서버→클라 | 약속/도착/삭제 등 메타 변경 |
| `/user/queue/errors` | 서버→클라(개인) | 송신 실패 알림 |

### F4. WebSocket에서도 JWT 검증이 가능한가?
- HTTP `Authorization` 헤더는 핸드셰이크에만 전달 가능. 그 후 메시지에는 직접 안 가
- 해법: STOMP `CONNECT` 프레임의 native header에 토큰을 실어 보냄 (`@stomp/stompjs`의 `connectHeaders`)
- 서버 `ChannelInterceptor.preSend()`에서 `StompCommand.CONNECT`일 때 토큰 추출·검증·`accessor.setUser(authentication)`
- 그 후의 `@MessageMapping` 핸들러는 `Authentication` 파라미터로 사용자 정보 자동 주입됨

### F5. 끊어졌을 때 자동 재연결은?
- `@stomp/stompjs`의 `Client { reconnectDelay: 3000 }` 옵션
- 재연결 시 `beforeConnect` 콜백으로 최신 토큰을 다시 헤더에 실음 (토큰 갱신된 경우 대비)
- `onConnect`에서 기존 구독 destination을 다시 subscribe

### F6. 다중 인스턴스 확장은?
- 현재는 Spring 인스턴스 1개라 in-memory simple broker로 충분
- 수평 확장 시: RabbitMQ/Redis pub-sub을 외부 메시지 브로커로 두고 `enableStompBrokerRelay()` 사용
- 본 프로젝트는 단일 노드 운영이라 simple broker만 사용

---

## G. 외부 API / OAuth

### G1. 카카오 로그인 흐름?
1. 사용자: `GET /auth/kakao` 클릭
2. 서버: 카카오 인증 페이지로 redirect (`https://kauth.kakao.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code`)
3. 사용자: 카카오에서 동의
4. 카카오: 서버의 `redirect_uri`(=`/auth/kakao/callback?code=xxx`)로 redirect
5. 서버:
   - `getAccessToken(code)` — 토큰 교환
   - `getKakaoUserInfo(token)` — 유저 정보
   - `findOrCreateMember()` — kakaoId로 기존 회원 찾고, 없으면 이메일로 매칭, 그래도 없으면 신규 생성
   - 기존 LocaPick JWT 발급
   - 프론트엔드 `/kakao-callback?token=...&memberId=...&...`로 redirect
6. 프론트: KakaoCallback 컴포넌트가 URL 파라미터를 파싱해 AuthProvider에 저장

### G2. 카카오 callback 중복 호출 방지는?
- 일부 브라우저/확장프로그램이 같은 URL을 두 번 호출 → 카카오는 두 번째 호출에 KOE320 에러 (코드 1회용)
- 해결: `ConcurrentHashMap<code, redirectUrl>` 캐시. 두 번째 호출은 첫 번째에서 만든 redirect URL을 그대로 응답

### G3. 카카오 토큰 자체를 클라이언트에 저장하지 않는 이유?
- 본 프로젝트는 카카오 access token을 **로그인 시점에만** 사용해 LocaPick JWT를 발급. 그 후엔 LocaPick JWT만 사용
- 일관된 인증 흐름 + 카카오 장애 시에도 LocaPick은 정상 동작

### G4. 외부 API(TMAP/ODsay/카카오모빌리티) 키 관리?
- TMAP/ODsay/카카오모빌리티는 **프론트가 직접 호출**. 키는 `VITE_*` 환경변수 → 빌드 시 번들에 포함
- 키 보안은 외부 API 콘솔의 도메인/사용량 화이트리스트에 의존
- 카카오 Local API(장소 추천)는 **서버에서 호출** — `LocapickService`. 서버 환경변수 `KAKAO_REST_KEY`로 안전하게 관리

### G5. 백엔드에서 외부 API 호출 시 어떤 라이브러리?
- `RestTemplate` (`AppConfig.restTemplate()` Bean)
- 단점: 동기 + 블로킹. 트래픽 늘어나면 `WebClient`(reactive)로 교체 권장
- 학생 프로젝트 범위라 RestTemplate 그대로 사용

---

## H. 파일 업로드 / 이미지

### H1. 이미지를 DB에 Base64로 저장한 이유?
- 운영 NAS의 디스크 IO/백업 일관성을 단순화하기 위한 의도적 결정
- 5MB 제한이라 LONGTEXT(최대 4GB)에 충분히 들어감
- 한 번 저장하면 별도 정적 파일 서빙 인프라 불필요
- 단점: DB 크기 증가, 큰 이미지 다수면 응답 메모리 사용량 ↑
- 향후 개선: 디스크 저장 + Cache-Control + 별도 CDN

### H2. 파일 검증?
```java
if (file.isEmpty()) return badRequest("파일 비어있음");
String contentType = file.getContentType();
if (contentType == null || !contentType.startsWith("image/"))
    return UNSUPPORTED_MEDIA_TYPE("이미지만 허용");
if (file.getSize() > 5 * 1024 * 1024) return badRequest("5MB 초과");
```
- MIME은 헤더 검증이라 한계 있음 (실제 파일 시그니처 검증은 추가 가능)
- 5MB 제한은 application.yaml의 `multipart.max-file-size: 50MB`보다 더 엄격하게 코드에서 한 번 더 체크

### H3. 파일명 보안?
- ImageController는 파일을 디스크에 저장하지 않으므로 파일명 자체가 의미 없음 (UUID PK가 식별자)
- PostController(레거시)의 디스크 저장 코드는 `UUID.randomUUID() + originalFilename` 형태라 path traversal 위험은 적지만 운영에서는 사용하지 않음

### H4. 5MB 초과 파일을 보내면?
- 1차 방어: Tomcat이 50MB 초과 시 `MaxUploadSizeExceededException`
- 2차 방어: 코드에서 5MB 초과 시 400 응답
- 프론트: 클라이언트 측에서도 5MB 검증 후 사용자에게 즉시 알림 (서버 왕복 없이)

---

## I. 운영 / 배포 / Docker

### I1. Docker Compose 구조?
```yaml
mysql:
  image: mysql:8.0
  ports: ["3306:3306"]
  volumes: ["mysql_data_prod_v3:/var/lib/mysql"]
  healthcheck: mysqladmin ping ...

backend:
  build: ./backend
  ports: ["8090:8080"]
  depends_on: { mysql: { condition: service_healthy }}
  healthcheck: actuator/health UP 체크

frontend:
  build: ./frontend
  ports: ["5173:80"]
  depends_on: { backend: { condition: service_healthy }}
```

### I2. healthcheck 왜 쓰나?
- MySQL이 미처 init.sql을 다 실행하기 전에 backend가 연결 시도하면 실패
- `condition: service_healthy`로 의존성 정확히 표현
- backend는 Spring Boot Actuator의 `/actuator/health`로 자체 health 노출

### I3. 환경 변수는 어디서?
- `application.yaml`의 `${VAR_NAME:default}` 문법으로 우선순위:
  - OS 환경변수 (Docker가 주입)
  - 컨테이너의 `.env` 파일
  - `application.yaml`의 default
- 시크릿(JWT, DB 비밀번호, 카카오 키)은 `.env` 파일 (gitignore)

### I4. Nginx의 역할?
1. React 정적 파일 서빙 (`location /`)
2. SPA 라우팅 fallback (`try_files $uri /index.html`)
3. API 리버스 프록시 (`location /api/`)
4. WebSocket 프록시 (`location /ws` + Upgrade 헤더)
5. 정적 자산 캐시 (1년)

### I5. 컨테이너 메모리 제한?
- `deploy.resources.limits.memory: 2g` — MySQL/Backend 각각
- NAS의 메모리 부족으로 OOM Kill 방지
- Spring Boot도 JVM heap을 컨테이너 메모리에 맞춰 자동 조정 (Java 17의 container awareness)

### I6. 로그 어디서 보나?
```bash
docker compose logs -f backend
docker compose logs --tail=200 backend
docker compose exec backend tail -f /app/logs/*.log  # 직접 파일 접근
```
- Spring Boot 기본 로그 형식 (logback) 사용
- 운영에서는 stdout이라 `docker compose logs`만으로 충분

### I7. 무중단 배포?
- 현재 단일 노드라 진정한 무중단은 불가
- 차선:
  - `docker compose up -d --build backend` 만 부분 재시작 (frontend는 살아있음)
  - 백엔드 재시작 ~30초 → 클라이언트의 axios가 재시도 또는 사용자가 새로고침
- 향후: blue-green 두 인스턴스 + Nginx upstream 전환

---

## J. 데이터 무결성 / 동시성

### J1. 두 사용자가 동시에 같은 친구를 추가하면?
- `Friendship` 테이블의 `unique(member_a_id, member_b_id)` 제약이 보호
- 두 트랜잭션이 동시에 INSERT 시도하면 한 쪽이 unique 제약 위반 → 예외
- `addFriendByCode()`는 먼저 `findByMemberAIdAndMemberBId`로 존재 여부 체크 후 없으면 save → 동시성 race가 있어도 unique 제약이 최후 방어선

### J2. 두 사용자가 동시에 같은 채팅방을 만들려고 하면?
- ChatRoom에는 unique 제약이 없지만 `ChatRoomRepository.findRoom()` 쿼리가 있어 거의 race 가능성 적음
- 만약 race로 두 행이 만들어져도 application 레벨에서는 큰 문제 없음 (다음 호출에서 어느 한쪽 방으로 통일됨)
- 정확성 보장이 필요하면 unique constraint `(member_a_id, member_b_id, post_id)` 추가 권장

### J3. 채팅방 삭제 시 메시지가 남으면?
- `ChatService.deleteRoom()`에서 `chatMessageRepository.deleteByRoomId()` 먼저 → `chatRoomRepository.delete(room)`
- 동일 트랜잭션이라 둘 중 하나만 삭제되는 일 없음
- FK 제약은 명시적으로 cascade 설정하지 않음 (도메인 메서드에서 통제)

### J4. 메시지 ID 정합성?
- AUTO_INCREMENT(IDENTITY) 사용 → 단조증가 보장
- 미읽음 카운트 산출 시 `id > lastReadId`로 정확히 판정
- 분산 환경(다중 인스턴스)에서도 DB가 단일이라 안전

### J5. 도착 자동 감지에서 race가 있을 수 있는가?
- 양쪽이 거의 동시에 100m 들어오는 경우
- 트랜잭션:
  - A의 heartbeat → A `markArrived` → ARRIVED 메시지 → bothArrived check (이때 B는 아직 미도착)
  - B의 heartbeat → B `markArrived` → ARRIVED 메시지 → bothArrived check (둘 다 도착) → APPOINTMENT_DONE
- 만약 두 heartbeat가 진짜 동시에 들어와도 각각 다른 트랜잭션이고 `markArrived`가 idempotent (이미 도착했으면 false 리턴)라 중복 처리 안 됨

---

## K. 성능 / 확장성

### K1. 인덱스는 어떻게 잡았나?
```java
// ChatMessage
@Index(name = "idx_chat_msg_room_id", columnList = "room_id, id")
@Index(name = "idx_chat_msg_sender", columnList = "sender_id")

// ChatRoom
@Index(name = "idx_chat_rooms_member_a", columnList = "member_a_id")
@Index(name = "idx_chat_rooms_member_b", columnList = "member_b_id")
@Index(name = "idx_chat_rooms_post", columnList = "post_id")

// Friendship
@UniqueConstraint(columnNames = {"member_a_id", "member_b_id"})

// Member
unique(email), unique(phone), unique(kakao_id), unique(friend_code)
```

### K2. 메시지 페이징은?
- 현재 `findByRoomIdOrderByIdAsc(roomId)`로 한 번에 다 가져옴
- 메시지 수가 수천 개를 넘으면 성능 저하 → 개선:
  - `Pageable` 도입 → 마지막 50개 + "더 보기" 클릭 시 이전 50개
  - 또는 cursor 기반 (`id < lastSeenId LIMIT 50`)
- 본 프로젝트는 학생 트래픽 수준이라 보류

### K3. 트래픽이 늘면 어디가 먼저 병목?
1. **MySQL**: 메시지 row 수 증가 → 인덱스가 있어도 OFFSET 쿼리는 느려짐 → 페이징 cursor 전환
2. **WebSocket simple broker**: in-memory라 다중 인스턴스 안 됨 → RabbitMQ/Redis broker 전환
3. **이미지 응답**: DB Base64 디코드라 메모리 사용량 ↑ → 디스크 + CDN 전환
4. **외부 API rate limit**: 카카오/TMAP/ODsay 모두 있음 → 캐시 (Redis)

### K4. 응답 시간이 느릴 때 어떻게 진단?
- Spring Boot Actuator `/actuator/health`, `/actuator/info` (현재는 health만 노출)
- `application.yaml`에 `spring.jpa.show-sql: true`로 SQL 로그 (운영은 false)
- `slow query log` MySQL에서 활성화 가능
- DevTools Network 탭으로 클라이언트 측 측정

---

## L. 테스트 / 디버깅

### L1. 테스트는 작성했나?
- `src/test/java`가 있지만 본격적으로 채워두진 않음 (학생 프로젝트 우선순위)
- 작성한다면:
  - `@DataJpaTest` — Repository 단위
  - `@SpringBootTest` + `@Transactional` — Service 통합
  - `@WebMvcTest` + MockMvc — Controller
  - WebSocket은 `WebSocketStompClient`로 통합 테스트

### L2. 디버깅은 어떻게?
- IntelliJ에서 직접 실행 → breakpoint
- 컨테이너 환경 → `docker compose logs -f backend` + 의도적 `e.printStackTrace()`
- `GlobalExceptionHandler`가 `Exception` 잡을 때 `printStackTrace`해서 콘솔 확인 가능

### L3. POSTMAN/curl로 어떻게 테스트?
```bash
# 로그인
TOKEN=$(curl -s -X POST http://localhost:8090/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"x@y.z","password":"...."}' | jq -r .accessToken)

# 내 정보 확인
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8090/members/me

# 채팅방 목록
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8090/chat/rooms
```

### L4. WebSocket 테스트는?
- 브라우저 DevTools → Console에서 `@stomp/stompjs` 직접 사용
- `wscat -c ws://localhost:8090/ws --no-check` (단순 핸드셰이크 확인용)
- 본격 테스트는 두 브라우저 창으로 양쪽 사용자 시뮬

---

## M. 코드 컨벤션 / 설계 결정

### M1. 왜 record 를 DTO로 사용?
- Java 14+의 record는 불변 데이터 컨테이너
- 자동으로 생성자/getter/equals/hashCode/toString 제공 → 코드량 ↓
- DTO는 "값"이니 불변이 자연스러움
- 본 프로젝트의 모든 DTO는 record (`MemberResponse`, `ChatMessageResponse` 등)

### M2. 왜 Lombok을 쓰나?
- `@RequiredArgsConstructor` — final 필드 기반 생성자 자동 생성 (생성자 주입)
- `@Getter`, `@NoArgsConstructor(access = PROTECTED)` — JPA 엔티티의 보일러플레이트 제거
- 컴파일 시 코드 생성 (런타임 오버헤드 0)

### M3. Service 레이어를 왜 거치는가? Controller가 직접 Repository를 쓰면 안 되나?
- Controller는 HTTP 입출력에 집중
- Service는 트랜잭션 경계 + 비즈니스 규칙 (권한, 검증, 부수 효과)
- Repository는 DB IO만
- 분리하면:
  - Service 테스트 시 Controller 거치지 않고 단위 테스트 가능
  - 같은 Service를 다른 Controller(REST + STOMP) 양쪽에서 재사용 (실제로 `ChatService`가 그렇게 됨)

### M4. 왜 packed fields(Long, String) 대신 record? primitive Long을 안 쓰는 이유?
- JSON 직렬화 시 null 표현이 필요 (예: optional postId)
- 박스 타입(Long)이 null 허용 → DTO에 더 자연스러움
- 도메인 엔티티의 PK는 `Long` 박스 타입 (JPA 표준)

### M5. 왜 모든 setter를 안 두고 도메인 메서드를 쓰는가?
- 임의로 모든 필드를 바꾸지 못하게 하기 위함 (캡슐화)
- 예: `ChatRoom.markArrived(memberId)`는 도착 시각 + bothArrived 검증 + 이미 도착이면 false 반환을 한 번에 담당
- setter만 있으면 호출자가 도메인 규칙을 모르는 채 일관성을 깰 수 있음

### M6. 패키지 구조를 왜 controller/service/repository로 나눴나?
- 레이어 기반 구조 (전형적). 한 도메인의 클래스가 여러 패키지에 흩어짐
- 대안: 도메인 기반 구조 (`chat/`, `member/` 폴더 안에 controller/service/repo가 같이) — DDD 친화적
- 학생 프로젝트라 익숙한 레이어 구조 채택

### M7. `@RestControllerAdvice`로 예외를 통일한 이유?
- 예외별로 응답 형식을 일관되게 (`{ success: false, message: ... }`)
- Controller마다 try/catch로 같은 응답을 반복하지 않게
```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<...> handleBadRequest(IllegalArgumentException e) {
    return ResponseEntity.status(BAD_REQUEST)
        .body(Map.of("success", false, "message", e.getMessage()));
}
```

### M8. 왜 JSP/Thymeleaf 안 쓰고 React?
- SPA 구조의 부드러운 UX, 모바일 앱 빌드(Capacitor)와의 코드 공유, 학생 입장에서 학습 가치 큼
- JSP는 서버에서 HTML을 그릴 때마다 라운드트립이 발생 → 인터랙티브 UI 한계
- 백엔드는 순수 JSON API에 집중 → 같은 백엔드로 웹/모바일/외부 클라이언트 모두 지원 가능

---

## 부록 — 즉답용 한 줄 요약

| 질문 | 한 줄 답 |
|---|---|
| 비밀번호 어떻게 저장? | BCrypt 해시 (`PasswordConfig`) |
| 로그인 상태 유지? | JWT (Stateless), localStorage |
| 권한 체크 어디서? | `SecurityConfig` URL 매처 + `@PreAuthorize` + 서비스 안의 `getRoomAndCheckMember` |
| SQL Injection? | JPA가 PreparedStatement로 자동 처리 |
| XSS? | `Jsoup.clean` (게시글), React escape (채팅) |
| CSRF? | `csrf.disable()` — JWT라 무관 |
| 실시간 채팅? | STOMP over WebSocket, `/topic`/`/app` 분리 |
| WebSocket 인증? | STOMP CONNECT 헤더의 JWT를 ChannelInterceptor에서 검증 |
| 파일 업로드 보안? | MIME image/* + 5MB + UUID PK |
| DB 스키마 관리? | `ddl-auto: update` + 핵심 테이블만 `init.sql` 명시 |
| 트랜잭션? | Service 메서드의 `@Transactional` (readOnly 기본 + 변경 메서드 override) |
| 외부 API 키? | 프론트는 빌드 시점 `VITE_*`, 서버는 환경변수 |
| 카카오 OAuth? | code → token → user → JWT 발급 → 프론트 redirect |
| 채팅 도착 감지? | 15초 heartbeat + haversine 100m + GPS 정확도 가드 |
| 친구 코드? | 가입 시 자동 발급 (8자, 헷갈리는 문자 제외, lazy 백필) |

---

본 문서가 다루지 못한 부분은 `01_PROJECT_OVERVIEW.md` (전체 구조)와
`02_CHAT_HOME_MYPAGE_INTEGRATION.md` (채팅 도메인 상세)에서 보완 가능.

# 📚 LocaPick V2 — 문서 인덱스

세 문서로 분리되어 있어요. 목적에 맞게 읽어주세요.

| 문서 | 한 줄 요약 | 주 대상 |
|---|---|---|
| [01_PROJECT_OVERVIEW.md](./01_PROJECT_OVERVIEW.md) | 프로젝트 전반(기능·기술스택·아키텍처·시나리오) | 처음 들여다보는 사람 |
| [02_CHAT_HOME_MYPAGE_INTEGRATION.md](./02_CHAT_HOME_MYPAGE_INTEGRATION.md) | 친구 코드 + 채팅 + 약속/도착 통합 백엔드 정리 | 코드 흐름을 깊게 보고 싶은 사람 |
| [03_BACKEND_FAQ.md](./03_BACKEND_FAQ.md) | 백엔드 보안/구현/예상 질문 FAQ | 평가/방어 준비 |

---

## 빠른 참조

- **API 전체 목록**: 02번 문서 §3
- **데이터베이스 스키마**: 01번 문서 §5
- **인증(JWT) 흐름**: 01번 문서 §6, 03번 문서 D 섹션
- **WebSocket(STOMP)**: 02번 문서 §4, 03번 문서 F 섹션
- **친구 코드 정책**: 02번 문서 §11
- **도착 자동 감지 알고리즘**: 02번 문서 §8
- **보안 (BCrypt/CSRF/XSS/CORS)**: 03번 문서 C 섹션
- **트러블슈팅 명령**: 02번 문서 부록 B

---

## 코드 위치 빠른 매핑

| 무엇 | 어디 |
|---|---|
| Spring 부트 진입점 | `backend/src/main/java/picstory/backend/BackendApplication.java` |
| 보안 설정 | `backend/.../config/SecurityConfig.java` |
| WebSocket 설정 | `backend/.../config/WebSocketConfig.java` |
| JWT 유틸 | `backend/.../security/JwtUtil.java`, `JwtAuthFilter.java` |
| 채팅 서비스 | `backend/.../service/ChatService.java` |
| 친구 서비스 | `backend/.../service/FriendService.java`, `FriendCodeGenerator.java` |
| React 라우터 | `frontend/src/app/router.jsx` |
| axios 인스턴스 | `frontend/src/api/client.js` |
| STOMP 클라이언트 | `frontend/src/api/chat.socket.js` |
| 채팅 화면 | `frontend/src/pages/Chat/` |
| 마이페이지/친구 | `frontend/src/pages/MyPage/MyPage.jsx`, `FriendsPanel.jsx` |
| 지도/길찾기 | `frontend/src/pages/Map/MapHome.jsx` |
| Docker | `docker-compose.yml`, `backend/Dockerfile_backend.prod`, `frontend/Dockerfile.prod` |
| Nginx | `frontend/nginx.conf` |

---

## 변경 이력

본 문서들은 채팅 도메인이 V2로 추가된 시점에 작성된 스냅샷이에요.
구현이 더 변하면 해당 섹션을 갱신하거나 새 문서로 보강해주세요.

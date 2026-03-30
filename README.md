# 📍 LocaPick (로카픽)

> **"어디로 갈지 고민될 때, 당신을 위한 최적의 장소 추천 및 통합 길찾기 플랫폼"** > 위치 기반 맞춤형 장소 추천부터 도보/대중교통/자동차 통합 길찾기, 그리고 나만의 장소 기록(메모/즐겨찾기)까지 한 번에 해결하는 풀스택 웹 서비스입니다.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

---

## 📢 프로젝트 소개

**LocaPick**은 단순히 지도를 보여주는 것을 넘어, 사용자의 **현재 위치와 이동 가능한 시간(도보 기준)**을 바탕으로 최적의 장소를 추천해 주는 서비스입니다. 
추천받은 장소는 즉시 목적지로 설정하여 다양한 교통수단의 경로를 비교할 수 있으며, 다녀온 장소는 별점(즐겨찾기)과 메모로 기록하여 나만의 장소 아카이브를 구축할 수 있습니다.

- **개인 NAS(UGREEN) 환경**에서 Docker를 활용해 직접 인프라를 구축하고 배포(Self-Hosted)한 프로젝트입니다.
- **모바일 반응형 UI**를 적용하여 스마트폰에서도 앱처럼 자연스럽게 사용할 수 있습니다.

<br>

## ✨ 핵심 기능 (Key Features)

### 1. 🗺️ 통합 지도 및 다중 길찾기
- 카카오맵 SDK를 활용한 부드러운 지도 렌더링 및 키워드 장소 검색.
- 출발지-도착지 설정 시 **도보(Tmap API), 대중교통(ODsay API), 자동차(Kakao Navi API)** 경로 및 소요 시간/비용 통합 비교 제공.

### 2. ✨ LocaPick 추천 알고리즘
- 사용자가 입력한 '최대 소요 시간(분)'을 도보 반경(m)으로 변환하여 주변의 특정 카테고리(음식점, 옷가게 등) 장소 탐색.
- 카카오 Local API 데이터에 자체적인 가중치(리뷰 수, 유저 평점 등) 알고리즘을 적용하여 랭킹 순으로 추천.

### 3. ⭐ 즐겨찾기 및 장소 태그 메모 (아카이빙)
- 마음에 드는 장소를 원클릭으로 찜(즐겨찾기)하여 마이페이지에서 관리.
- 다녀온 장소를 태그하여 카테고리별(일상, 여행, 취미 등)로 나만의 텍스트 메모 작성 기능.

### 4. 🔐 JWT 기반 인증 및 어드민 대시보드
- Spring Security와 JWT 토큰을 활용한 안전한 Stateless 인증 인가 구현.
- 일반 유저와 분리된 **관리자(ADMIN)** 전용 대시보드에서 전체 회원의 상태(활성/정지/탈퇴) 및 권한 제어.

<br>

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework:** React 18, Vite
- **Routing & State:** React Router DOM, Context API (Auth Store)
- **Styling:** SCSS (Sass), 모바일 반응형 디자인
- **Map & APIs:** Kakao Map SDK, Tmap API, ODsay API

### Backend
- **Framework:** Java 17, Spring Boot 3.5
- **Security:** Spring Security, JWT (JSON Web Token)
- **Database:** Spring Data JPA, MySQL 8.0
- **API Communication:** RestTemplate

### Infrastructure & DevOps
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx (Reverse Proxy & Static File Hosting)
- **Hosting:** UGREEN NAS (Self-Hosted)

<br>

## 🏗 시스템 아키텍처 (System Architecture)

![Architecture Diagram]
![Image](https://github.com/user-attachments/assets/b37c8c04-76c0-4c01-8586-db1a1f5bd11f)

- 프론트엔드(`Axios`)의 모든 요청은 `client.js`의 Interceptor를 통해 JWT 토큰이 탑재됩니다.
- 백엔드 최전방의 `JwtAuthFilter`가 권한을 검증한 뒤, 각 Controller로 안전하게 라우팅합니다.
- 데이터베이스(MySQL)는 `members` 테이블을 중심으로 `favorites`와 `posts`가 N:1 관계를 맺어 무결성을 유지합니다.

<br>

## 📸 스크린샷 (Screenshots)

| 메인 지도 & 길찾기 | LocaPick 추천 알고리즘 |
| :---: | :---: |
| <img width="450" alt="Image" src="https://github.com/user-attachments/assets/0c8d182c-e43e-4b16-b39c-ba5f5c87f2e9" /> | <img width="250" alt="Image" src="https://github.com/user-attachments/assets/ba72cf3d-0e84-49e6-a85b-37a2c8a51e3b" /> |
<br>

## 🚀 시작하기 (Getting Started)

### 1. 환경 변수 설정 (.env)
프론트엔드 루트 디렉토리에 `.env` 파일을 생성하고 API 키를 입력합니다.
```env
VITE_API_URL=http://localhost:8080
VITE_KAKAO_REST_KEY=your_kakao_rest_key
VITE_TMAP_KEY=your_tmap_key
VITE_ODSAY_KEY=your_odsay_key
```

### 2. 백엔드 설정 (application.yml)
src/main/resources/application.yml 파일을 구성합니다.

```
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/picstory?useSSL=false&serverTimezone=UTC
    username: your_db_user
    password: your_db_password
  jpa:
    hibernate:
      ddl-auto: update # 초기 테이블 자동 생성

jwt:
  secret: your_super_secret_jwt_key_string_here_must_be_long
  expiration-ms: 86400000

kakao:
  rest-key: your_kakao_rest_key
```

### 3. Docker Compose로 실행하기

```
# 레포지토리 클론
git clone [https://github.com/MJB9595/LocaPick.git](https://github.com/MJB9595/LocaPick.git)
cd LocaPick

# Docker 컨테이너 빌드 및 백그라운드 실행
docker-compose up -d --build
```

💡 Trouble Shooting & Dev Log
CORS 및 Nginx 프록시 문제: 프론트엔드(Vite)와 백엔드(Spring) 분리 배포 시 발생하는 CORS 에러를 Nginx의 리버스 프록시(proxy_pass) 설정을 통해 해결했습니다.

JPA 500/404 사일런트 에러 디버깅: 백엔드 API 연동 중, 엔티티의 @Table(name = "posts") 누락으로 인한 404(NoResourceFoundException) 에러가 500 에러로 마스킹되는 현상을 GlobalExceptionHandler에 로깅을 추가하여 추적하고 해결했습니다.

모바일 UI 최적화: 카카오맵 오버레이 및 복잡한 경로 안내 타임라인이 모바일에서 깨지는 현상을 SCSS @mixin mobile을 활용해 기존 PC 레이아웃의 변형 없이 독립적으로 제어하여 UX를 개선했습니다.

Developed by 김재아 및 1조 일동



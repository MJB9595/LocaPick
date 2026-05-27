package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "members")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 200)
    private String passwordHash;

    @Column(unique = true, length = 30)
    private String phone;

    // ✅ [카카오 로그인 추가] — nullable (일반 회원은 null)
    @Column(unique = true, length = 100)
    private String kakaoId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Column(nullable = false)
    private boolean emailVerified;

    // 프로필 이미지 URL
    @Column(columnDefinition = "LONGTEXT")
    private String profileImageUrl;

    /** 친구 추가용 8자리 코드 (영숫자 대문자). 가입 시 자동 생성. */
    @Column(unique = true, length = 12)
    private String friendCode;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        if (this.status == null) this.status = MemberStatus.ACTIVE;
        if (this.role == null)   this.role   = MemberRole.USER;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /** 일반 회원가입용 생성자 */
    public Member(String name, String email, String passwordHash, String phone, String profileImageUrl) {
        this.name            = name;
        this.email           = email;
        this.passwordHash    = passwordHash;
        this.phone           = phone;
        this.profileImageUrl = profileImageUrl;
        this.role            = MemberRole.USER;
        this.status          = MemberStatus.ACTIVE;
        this.emailVerified   = false;
    }

    /** 어드민 계정 생성용 생성자 */
    public Member(String name, String email, String passwordHash, String phone, MemberRole role, String profileImageUrl) {
        this.name            = name;
        this.email           = email;
        this.passwordHash    = passwordHash;
        this.phone           = phone;
        this.role            = role;
        this.profileImageUrl = profileImageUrl;
        this.status          = MemberStatus.ACTIVE;
        this.emailVerified   = false;
    }

    // ✅ [카카오 로그인 추가] 카카오 소셜 로그인 전용 생성자
    public Member(String name, String email, String kakaoId, boolean isSocial, String profileImageUrl) {
        this.name            = name;
        this.email           = email;
        this.kakaoId         = kakaoId;
        this.passwordHash    = UUID.randomUUID().toString(); // 소셜 로그인은 비밀번호 불필요 → 더미값
        this.phone           = null;
        this.role            = MemberRole.USER;
        this.status          = MemberStatus.ACTIVE;
        this.emailVerified   = true; // 카카오에서 이메일 인증 완료
        this.profileImageUrl = profileImageUrl;
    }

    public void changeStatus(MemberStatus status) { this.status = status; }
    public void changeRole(MemberRole role)        { this.role = role; }

    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    /** 친구 코드는 한 번 부여하면 변경 불가 (필요 시 admin 만 재발급) */
    public void assignFriendCode(String code) {
        this.friendCode = code;
    }

    // ✅ [카카오 로그인 추가] 기존 일반 회원이 카카오 로그인 시 kakaoId 연동
    public void updateKakaoId(String kakaoId) {
        this.kakaoId = kakaoId;
    }
}
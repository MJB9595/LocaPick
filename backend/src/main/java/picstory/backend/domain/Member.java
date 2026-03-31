package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Column(nullable = false)
    private boolean emailVerified;

    // 🌟 프로필 이미지 URL 추가
    @Column(columnDefinition = "LONGTEXT")
    private String profileImageUrl;

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
        this.name         = name;
        this.email        = email;
        this.passwordHash = passwordHash;
        this.phone        = phone;
        this.profileImageUrl = profileImageUrl;
        this.role         = MemberRole.USER;
        this.status       = MemberStatus.ACTIVE;
        this.emailVerified = false;
    }

    /** 어드민 계정 생성용 생성자 */
    public Member(String name, String email, String passwordHash, String phone, MemberRole role, String profileImageUrl) {
        this.name         = name;
        this.email        = email;
        this.passwordHash = passwordHash;
        this.phone        = phone;
        this.role         = role;
        this.profileImageUrl = profileImageUrl;
        this.status       = MemberStatus.ACTIVE;
        this.emailVerified = false;
    }

    public void changeStatus(MemberStatus status) { this.status = status; }
    public void changeRole(MemberRole role) { this.role = role; }

    // 🌟 프로필 이미지 변경 메서드
    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }
}
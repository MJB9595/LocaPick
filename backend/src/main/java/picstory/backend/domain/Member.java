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

    /** 사용자 역할: USER(일반), ADMIN(관리자) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Column(nullable = false)
    private boolean emailVerified;

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

    /** 일반 회원가입용 생성자 (role = USER 기본값) */
    public Member(String name, String email, String passwordHash, String phone) {
        this.name         = name;
        this.email        = email;
        this.passwordHash = passwordHash;
        this.phone        = phone;
        this.role         = MemberRole.USER;
        this.status       = MemberStatus.ACTIVE;
        this.emailVerified = false;
    }

    /** 어드민 계정 생성용 생성자 */
    public Member(String name, String email, String passwordHash, String phone, MemberRole role) {
        this.name         = name;
        this.email        = email;
        this.passwordHash = passwordHash;
        this.phone        = phone;
        this.role         = role;
        this.status       = MemberStatus.ACTIVE;
        this.emailVerified = false;
    }

    public void changeStatus(MemberStatus status) {
        this.status = status;
    }

    public void changeRole(MemberRole role) {
        this.role = role;
    }
}

package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 친구 관계.
 * 양방향이므로 두 멤버 사이에 한 행만 존재한다 (작은 ID 가 memberA).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "friendships",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_friendship_pair",
                columnNames = {"member_a_id", "member_b_id"}
        ),
        indexes = {
                @Index(name = "idx_friendships_member_a", columnList = "member_a_id"),
                @Index(name = "idx_friendships_member_b", columnList = "member_b_id")
        }
)
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 작은 ID 쪽 멤버 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_a_id")
    private Member memberA;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_b_id")
    private Member memberB;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Friendship(Member a, Member b) {
        if (a.getId().equals(b.getId())) {
            throw new IllegalArgumentException("자기 자신은 친구로 추가할 수 없습니다.");
        }
        if (a.getId() < b.getId()) {
            this.memberA = a;
            this.memberB = b;
        } else {
            this.memberA = b;
            this.memberB = a;
        }
    }

    public Member opponentOf(Long memberId) {
        return memberA.getId().equals(memberId) ? memberB : memberA;
    }
}

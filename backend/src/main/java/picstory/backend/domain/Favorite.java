package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.Random;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "favorites")
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 회원의 즐겨찾기인지 연결 (N:1 관계)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false)
    private String placeName;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    private String address;

    // 카테고리 저장용
    @Column(nullable = false)
    private String category = "uncategorized";

    // 주차혼잡도 0 1 2 보통 여유 혼잡
    @Column(nullable = false)
    private Integer parkingStatus;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Favorite(Member member, String placeName, Double lat, Double lng, String address) {
        this.member = member;
        this.placeName = placeName;
        this.lat = lat;
        this.lng = lng;
        this.address = address;
        this.parkingStatus = new Random().nextInt(3);
    }

    public void updateCategory(String category) {
        this.category = category;
    }
}
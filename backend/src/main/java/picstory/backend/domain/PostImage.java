package picstory.backend.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "post_images")
public class PostImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // 🌟 숫자가 아닌 UUID 자동 생성
    private String id;

    // 용량이 큰 이미지를 담기 위해 LONGTEXT 사용
    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String base64Data;

    @Column(nullable = false)
    private String mimeType;

    public PostImage(String base64Data, String mimeType) {
        this.base64Data = base64Data;
        this.mimeType = mimeType;
    }
}
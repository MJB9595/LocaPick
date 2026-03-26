package picstory.backend.web.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LocapickResponseDto {
    private String name;
    private Double lat;
    private Double lng;
    private String address;
    private String phone;
    private int review;
    private Integer user_review; // 프론트엔드와 변수명을 맞추기 위해 스네이크 케이스 사용
    private int distance;
}
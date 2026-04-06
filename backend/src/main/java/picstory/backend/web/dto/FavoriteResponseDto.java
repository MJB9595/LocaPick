package picstory.backend.web.dto;

import lombok.Builder;
import lombok.Getter;
import picstory.backend.domain.Favorite;

import java.time.LocalDateTime;

@Getter
@Builder
public class FavoriteResponseDto {
    private Long id;
    private String placeName;
    private Double lat;
    private Double lng;
    private String address;
    private String category;
    private Integer parkingStatus;
    private LocalDateTime createdAt;

    // Entity를 DTO로 변환하는 마법의 메서드
    public static FavoriteResponseDto from(Favorite favorite) {
        return FavoriteResponseDto.builder()
                .id(favorite.getId())
                .placeName(favorite.getPlaceName())
                .lat(favorite.getLat())
                .lng(favorite.getLng())
                .address(favorite.getAddress())
                .category(favorite.getCategory())
                .parkingStatus(favorite.getParkingStatus())
                .createdAt(favorite.getCreatedAt())
                .build();
    }
}
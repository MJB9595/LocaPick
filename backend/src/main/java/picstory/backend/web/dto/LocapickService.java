package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import picstory.backend.web.dto.LocapickResponseDto;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocapickService {

    @Value("${kakao.rest-key}")
    private String kakaoRestKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public List<LocapickResponseDto> getRecommendations(double lat, double lng, int time, int count, String category) {
        // 1. 반경 계산 (도보시간 * 80m / 1.3 곡률 보정)
        int radius = (int) Math.round((time * 80) / 1.3);

        // 2. 카카오 API URL 설정
        String url;
        if ("restaurant".equals(category)) {
            url = String.format("https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=%f&y=%f&radius=%d&sort=distance", lng, lat, radius);
        } else {
            url = String.format("https://dapi.kakao.com/v2/local/search/keyword.json?query=옷가게&x=%f&y=%f&radius=%d&sort=distance", lng, lat, radius);
        }

        // 3. 헤더에 카카오 API 키 셋팅
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "KakaoAK " + kakaoRestKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            // 4. 카카오 서버로 요청 쏘기
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            List<Map<String, Object>> documents = (List<Map<String, Object>>) response.getBody().get("documents");

            List<LocapickResponseDto> processedList = new ArrayList<>();

            // 5. 점수 부여 및 DTO 변환
            for (Map<String, Object> doc : documents) {
                long id = Long.parseLong(doc.get("id").toString());
                int pseudoRandom = (int) (id % 41) + 60;
                boolean hasUserReview = Math.random() > 0.3;
                Integer userReview = hasUserReview ? pseudoRandom - new Random().nextInt(10) : null;

                processedList.add(LocapickResponseDto.builder()
                        .name(doc.get("place_name").toString())
                        .lat(Double.parseDouble(doc.get("y").toString()))
                        .lng(Double.parseDouble(doc.get("x").toString()))
                        .address(doc.getOrDefault("road_address_name", doc.get("address_name")).toString())
                        .phone(doc.getOrDefault("phone", "번호 없음").toString())
                        .distance(Integer.parseInt(doc.get("distance").toString()))
                        .review(pseudoRandom)
                        .user_review(userReview)
                        .build());
            }

            // 6. 정렬 및 개수 자르기 (프론트와 동일한 로직)
            return processedList.stream()
                    .sorted((a, b) -> {
                        if (a.getReview() != b.getReview()) {
                            return Integer.compare(b.getReview(), a.getReview());
                        }
                        int aUser = a.getUser_review() != null ? a.getUser_review() : 0;
                        int bUser = b.getUser_review() != null ? b.getUser_review() : 0;
                        return Integer.compare(bUser, aUser);
                    })
                    .limit(count)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Kakao API 호출 중 에러 발생: ", e);
            throw new RuntimeException("장소 검색에 실패했습니다.");
        }
    }
}
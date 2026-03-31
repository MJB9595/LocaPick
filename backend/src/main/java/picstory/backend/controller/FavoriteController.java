package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import picstory.backend.domain.Favorite;
import picstory.backend.domain.Member;
import picstory.backend.repository.FavoriteRepository;
import picstory.backend.repository.MemberRepository;
import picstory.backend.web.dto.FavoriteResponseDto;


import java.util.stream.Collectors;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;
    private final MemberRepository memberRepository;

    //  내 즐겨찾기 목록 조회
    @GetMapping
    public ResponseEntity<List<FavoriteResponseDto>> getMyFavorites(Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();
        
        // DB에서 내 즐겨찾기 원본 목록 가져오기
        List<Favorite> favorites = favoriteRepository.findAllByMemberIdOrderByIdDesc(memberId);
        
        // 프론트엔드로 보낼 깔끔한 DTO 상자로 변환하기
        List<FavoriteResponseDto> responseDtos = favorites.stream()
                .map(FavoriteResponseDto::from)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(responseDtos);
    }

    // 즐겨찾기 추가/취소 토글 (Toggle)
    @PostMapping("/toggle")
    @Transactional
    public ResponseEntity<?> toggleFavorite(@RequestBody Map<String, Object> requestData, Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();
        String placeName = requestData.get("name").toString();

        // 이미 있으면 삭제 (별점 해제)
        if (favoriteRepository.existsByMemberIdAndPlaceName(memberId, placeName)) {
            favoriteRepository.deleteByMemberIdAndPlaceName(memberId, placeName);
            return ResponseEntity.ok(Map.of("isFavorite", false, "message", "즐겨찾기 해제됨"));
        } 
        
        // 없으면 추가 (별점 등록)
        Member member = memberRepository.findById(memberId).orElseThrow();
        Favorite newFavorite = Favorite.builder()
                .member(member)
                .placeName(placeName)
                .lat(Double.parseDouble(requestData.get("lat").toString()))
                .lng(Double.parseDouble(requestData.get("lng").toString()))
                .address(requestData.getOrDefault("address", "").toString())
                .build();
        favoriteRepository.save(newFavorite);
        
        return ResponseEntity.ok(Map.of("isFavorite", true, "message", "즐겨찾기 추가됨"));
    }

    // 즐겨찾기 카테고리 변경 API
    @PatchMapping("/{id}/category")
    @Transactional
    public ResponseEntity<?> updateCategory(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestData,
            Authentication auth) {

        Long memberId = (Long) auth.getPrincipal();
        String newCategory = requestData.get("category");

        Favorite favorite = favoriteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("즐겨찾기를 찾을 수 없습니다."));

        // 내 즐겨찾기가 맞는지 권한 체크
        if (!favorite.getMember().getId().equals(memberId)) {
            throw new IllegalStateException("권한이 없습니다.");
        }

        favorite.updateCategory(newCategory);
        return ResponseEntity.ok(Map.of("success", true, "message", "카테고리가 변경되었습니다."));
    }

    @GetMapping("/tags")
    public ResponseEntity<List<String>> getMyTags(Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();

        // 내 아이디로 등록된 유니크한 카테고리 목록만 DB에서 가져오기
        List<String> myTags = favoriteRepository.findMyUniqueCategories(memberId);

        return ResponseEntity.ok(myTags);
    }
}
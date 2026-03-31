package picstory.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import picstory.backend.domain.Favorite;
import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    // 특정 유저의 즐겨찾기 목록 가져오기
    List<Favorite> findAllByMemberIdOrderByIdDesc(Long memberId);
    
    // 이미 즐겨찾기 된 장소인지 확인 (중복 방지)
    boolean existsByMemberIdAndPlaceName(Long memberId, String placeName);
    
    // 이름으로 즐겨찾기 삭제
    void deleteByMemberIdAndPlaceName(Long memberId, String placeName);

    @Query("SELECT DISTINCT f.category FROM Favorite f WHERE f.member.id = :memberId")
    List<String> findMyUniqueCategories(@Param("memberId") Long memberId);
}
package picstory.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import picstory.backend.domain.PostImage;

public interface PostImageRepository extends JpaRepository<PostImage, String> {
}
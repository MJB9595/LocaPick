package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import picstory.backend.domain.PostImage;
import picstory.backend.repository.PostImageRepository;

import java.util.Base64;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/images")
public class ImageController {

    private final PostImageRepository imageRepository;

    // 🌟 사진 업로드 (보안 및 검증 강화)
    @PostMapping
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            // 1. 파일 존재 여부 확인
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "파일이 비어있습니다."));
            }

            // 2. MIME 타입 검사 (이미지 파일만 허용)
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                        .body(Map.of("error", "이미지 파일(jpg, png, gif 등)만 업로드 가능합니다."));
            }

            // 3. 파일 용량 제한 (서버 설정을 넘어서 코드 레벨에서 2차 방어 - 예: 5MB)
            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(Map.of("error", "파일 크기는 5MB를 초과할 수 없습니다."));
            }

            // 4. 저장 로직
            String base64Data = Base64.getEncoder().encodeToString(file.getBytes());
            PostImage postImage = new PostImage(base64Data, contentType);
            postImage = imageRepository.save(postImage);

            log.info("이미지 업로드 성공: ID = {}", postImage.getId());

            return ResponseEntity.ok(Map.of(
                    "url", "/api/images/" + postImage.getId(),
                    "id", postImage.getId()
            ));

        } catch (Exception e) {
            log.error("이미지 업로드 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "서버 오류로 업로드에 실패했습니다."));
        }
    }

    // 🌟 사진 조회 (UUID 기반으로 보안 강화)
    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getImage(@PathVariable String id) {
        try {
            PostImage image = imageRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("이미지를 찾을 수 없습니다."));

            byte[] imageBytes = Base64.getDecoder().decode(image.getBase64Data());

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, image.getMimeType())
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400") // 브라우저 캐싱 허용 (성능 최적화)
                    .body(imageBytes);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
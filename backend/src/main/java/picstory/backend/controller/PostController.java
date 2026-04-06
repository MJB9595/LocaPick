package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import picstory.backend.service.PostService;
import picstory.backend.web.dto.CreatePostRequest;
import picstory.backend.web.dto.PostResponse;
import picstory.backend.web.dto.UpdatePostRequest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/posts")
public class PostController {

    private final PostService postService;

    // 1. 게시글 생성
    @PostMapping
    public ResponseEntity<PostResponse> create(@RequestBody CreatePostRequest request, Authentication auth) {
        Long memberId = (Long) auth.getPrincipal(); // JWT에서 뽑아낸 내 ID
        return ResponseEntity.ok(postService.create(request, memberId));
    }

    // 2. 전체 게시글 조회 (최신순)
    @GetMapping
    public ResponseEntity<List<PostResponse>> findAll() {
        // 조회는 내 ID가 필요 없으므로 파라미터 제외
        return ResponseEntity.ok(postService.findAllPosts());
    }

    // 3. 게시글 수정
    @PatchMapping("/{id}")
    public ResponseEntity<PostResponse> update(
            @PathVariable Long id,
            @RequestBody UpdatePostRequest request,
            Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(postService.update(id, request, memberId));
    }

    // 4. 게시글 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();
        postService.delete(id, memberId);
        return ResponseEntity.ok(Map.of("success", true, "message", "게시글이 삭제되었습니다."));
    }

    @GetMapping("/my")
    public ResponseEntity<List<PostResponse>> findMyPosts(Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(postService.findMyPosts(memberId));
    }

    @Value("${app.upload.dir}")
    private String UPLOAD_DIR;

    // 🌟 에디터 본문용 사진 업로드 API
    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadPostImage(@RequestParam("file") MultipartFile file) {
        try {
            // 폴더 생성
            Path uploadPath = Paths.get(UPLOAD_DIR + "/posts/");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 고유 파일명 생성
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            file.transferTo(filePath.toFile());

            // 🌟 이 URL을 통해 브라우저에서 사진을 볼 수 있게 됨
            String fileUrl = "/uploads/posts/" + fileName;

            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "이미지 업로드 실패"));
        }
    }
}
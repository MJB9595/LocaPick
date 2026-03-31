package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import picstory.backend.domain.Member;
import picstory.backend.service.MemberService;
import picstory.backend.web.dto.MemberResponse;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/members")
public class MemberController {

    private final MemberService memberService;

    @Value("${app.upload.dir}")
    private String UPLOAD_DIR;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MemberResponse>> list() {
        List<MemberResponse> members = memberService.findAll()
                .stream().map(MemberResponse::from).toList();
        return ResponseEntity.ok(members);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(MemberResponse.from(memberService.findById(id)));
    }

    @GetMapping("/me")
    public ResponseEntity<MemberResponse> getMyInfo(Authentication auth) {
        Long memberId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(MemberResponse.from(memberService.findById(memberId)));
    }

    @PostMapping("/me/profile-image")
    public ResponseEntity<?> uploadProfileImage(@RequestParam("file") MultipartFile file, Authentication auth) {
        try {
            Long memberId = (Long) auth.getPrincipal();
            Member member = memberService.findById(memberId);

            // 🌟 핵심: 파일을 하드디스크에 저장하지 않고, 즉시 Base64 텍스트로 인코딩
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());

            // 프론트엔드 img 태그가 바로 읽을 수 있는 Data URI 포맷으로 만들기
            String mimeType = file.getContentType(); // ex) image/jpeg, image/png
            String dataUri = "data:" + mimeType + ";base64," + base64Image;

            member.updateProfileImage(dataUri);
            memberService.save(member); // DB에 텍스트 형태로 저장!

            return ResponseEntity.ok(Map.of(
                    "profileImageUrl", dataUri,
                    "message", "프로필 이미지가 변경되었습니다."
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "이미지 업로드에 실패했습니다."));
        }
    }
}

package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import picstory.backend.domain.Member;
import picstory.backend.service.AdminService;
import picstory.backend.web.dto.ChangeStatusRequest;
import picstory.backend.web.dto.MemberResponse;

import java.util.List;
import java.util.Map;

/**
 * 어드민 전용 API
 * SecurityConfig 에서 /admin/** 는 ROLE_ADMIN 만 허용
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    /** GET /admin/members - 전체 회원 목록 */
    @GetMapping("/members")
    public ResponseEntity<List<MemberResponse>> listAll() {
        return ResponseEntity.ok(
                adminService.findAll().stream().map(MemberResponse::from).toList()
        );
    }

    /** PATCH /admin/members/{id}/status - 회원 상태 / 역할 변경 */
    @PatchMapping("/members/{id}/status")
    public ResponseEntity<Map<String, Object>> updateMember(
            @PathVariable Long id,
            @RequestBody ChangeStatusRequest req
    ) {
        adminService.updateMember(id, req.status(), req.role());
        return ResponseEntity.ok(Map.of("success", true, "message", "업데이트 완료"));
    }
}

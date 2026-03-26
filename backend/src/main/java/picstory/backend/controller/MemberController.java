package picstory.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import picstory.backend.service.MemberService;
import picstory.backend.web.dto.MemberResponse;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/members")
public class MemberController {

    private final MemberService memberService;

    /** GET /members - 전체 회원 목록 (ADMIN 전용) */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MemberResponse>> list() {
        List<MemberResponse> members = memberService.findAll()
                .stream()
                .map(MemberResponse::from)
                .toList();
        return ResponseEntity.ok(members);
    }

    /** GET /members/{id} - 단일 회원 조회 (ADMIN 또는 본인) */
    @GetMapping("/{id}")
    public ResponseEntity<MemberResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(MemberResponse.from(memberService.findById(id)));
    }
}

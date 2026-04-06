package picstory.backend.web.dto;

import picstory.backend.domain.MemberRole;

public record LoginResponse(
        String accessToken,
        Long memberId,
        String name,
        String email,
        MemberRole role,
        String profileImageUrl // 🌟 추가
) {}
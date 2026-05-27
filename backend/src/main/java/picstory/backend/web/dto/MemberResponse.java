package picstory.backend.web.dto;

import picstory.backend.domain.Member;
import picstory.backend.domain.MemberRole;
import picstory.backend.domain.MemberStatus;

import java.time.LocalDateTime;

public record MemberResponse(
        Long id,
        String name,
        String email,
        String phone,
        MemberRole role,
        MemberStatus status,
        boolean emailVerified,
        String profileImageUrl,
        String friendCode, // ✅ 내 친구 코드 (본인 조회 시에만 의미 있음)
        LocalDateTime createdAt
) {
    public static MemberResponse from(Member m) {
        return new MemberResponse(
                m.getId(),
                m.getName(),
                m.getEmail(),
                m.getPhone(),
                m.getRole(),
                m.getStatus(),
                m.isEmailVerified(),
                m.getProfileImageUrl(),
                m.getFriendCode(),
                m.getCreatedAt()
        );
    }
}

package picstory.backend.web.dto;

import picstory.backend.domain.MemberRole;
import picstory.backend.domain.MemberStatus;

public record ChangeStatusRequest(
        MemberStatus status,
        MemberRole   role       // null 이면 role 변경 안 함
) {}

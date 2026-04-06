package picstory.backend.web.dto;

import picstory.backend.domain.PostCategory;

public record UpdatePostRequest(
        PostCategory category,
        String title,
        String content
) {
}

package picstory.backend.web.dto;

import picstory.backend.domain.PostCategory;

public record CreatePostRequest(
        PostCategory category,
        String title,
        String content
) {

}

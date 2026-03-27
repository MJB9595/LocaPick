package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.Member;
import picstory.backend.domain.Post;
import picstory.backend.repository.MemberRepository;
import picstory.backend.repository.PostRepository;
import picstory.backend.web.dto.CreatePostRequest;
import picstory.backend.web.dto.PostResponse;
import picstory.backend.web.dto.UpdatePostRequest;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    // 전체 게시글 조회
    public List<PostResponse> findAllPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(PostResponse::from)
                .toList();
    }

    // 게시글 생성
    @Transactional
    public PostResponse create(CreatePostRequest request, Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        Post post = new Post(
                request.category(),
                request.title(),
                request.content(),
                member
        );

        return PostResponse.from(postRepository.save(post));
    }

    // 게시글 수정
    @Transactional
    public PostResponse update(Long id, UpdatePostRequest request, Long memberId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));

        // 권한 체크: 내가 쓴 글인지 확인!
        if (!post.getMember().getId().equals(memberId)) {
            throw new IllegalStateException("본인이 작성한 글만 수정할 수 있습니다.");
        }

        post.update(request.category(), request.title(), request.content());
        return PostResponse.from(post); // JPA 변경 감지(Dirty Checking)로 자동 저장됨
    }

    // 게시글 삭제
    @Transactional
    public void delete(Long id, Long memberId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));

        // 권한 체크: 내가 쓴 글인지 확인!
        if (!post.getMember().getId().equals(memberId)) {
            throw new IllegalStateException("본인이 작성한 글만 삭제할 수 있습니다.");
        }

        postRepository.delete(post);
    }

    public List<PostResponse> findMyPosts(Long memberId) {
        return postRepository.findAllByMemberIdOrderByCreatedAtDesc(memberId)
                .stream()
                .map(PostResponse::from)
                .toList();
    }
}
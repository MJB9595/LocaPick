package picstory.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;
import picstory.backend.domain.Member;
import picstory.backend.repository.MemberRepository;
import picstory.backend.service.FriendCodeGenerator;

import java.util.List;

/**
 * 친구 코드 일괄 백필.
 *
 * - 기본은 OFF (lazy 발급으로 충분).
 * - 운영자가 한 번에 채워두고 싶을 때만
 *   `app.friend-code.backfill-on-startup=true` 로 ON.
 * - 회원이 많을 때 켜면 부팅이 길어질 수 있으므로 운영 중엔 평소 OFF 권장.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(
        prefix = "app.friend-code",
        name = "backfill-on-startup",
        havingValue = "true"
)
public class FriendCodeBackfillRunner {

    private final MemberRepository memberRepository;
    private final FriendCodeGenerator friendCodeGenerator;

    @Bean
    public ApplicationRunner backfillFriendCodes() {
        return args -> backfill();
    }

    @Transactional
    public void backfill() {
        List<Member> targets = memberRepository.findAllByFriendCodeIsNull();
        if (targets.isEmpty()) return;

        log.info("[FriendCodeBackfill] 친구 코드 발급 대상: {}명", targets.size());
        int filled = 0;
        for (Member m : targets) {
            try {
                m.assignFriendCode(friendCodeGenerator.generateUnique());
                filled++;
            } catch (Exception e) {
                log.warn("[FriendCodeBackfill] memberId={} 발급 실패: {}", m.getId(), e.getMessage());
            }
        }
        log.info("[FriendCodeBackfill] 완료: {} / {}", filled, targets.size());
    }
}

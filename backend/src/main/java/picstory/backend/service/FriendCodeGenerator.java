package picstory.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import picstory.backend.repository.MemberRepository;

import java.security.SecureRandom;

/**
 * 친구 코드 생성기.
 * - 8자리, 대문자 + 숫자
 * - 시각적으로 헷갈리는 문자(0/O, 1/I/L) 제외
 * - 충돌 시 최대 N회 재시도
 */
@Component
@RequiredArgsConstructor
public class FriendCodeGenerator {

    private static final char[] ALPHABET =
            "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int LENGTH = 8;
    private static final int MAX_TRY = 8;

    private final SecureRandom random = new SecureRandom();
    private final MemberRepository memberRepository;

    public String generateUnique() {
        for (int i = 0; i < MAX_TRY; i++) {
            String code = randomCode();
            if (!memberRepository.existsByFriendCode(code)) {
                return code;
            }
        }
        // 매우 드문 케이스: 길이 한 칸 늘려서 재시도
        for (int i = 0; i < MAX_TRY; i++) {
            String code = randomCode() + ALPHABET[random.nextInt(ALPHABET.length)];
            if (!memberRepository.existsByFriendCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("친구 코드를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }

    private String randomCode() {
        char[] buf = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            buf[i] = ALPHABET[random.nextInt(ALPHABET.length)];
        }
        return new String(buf);
    }

    /** 입력 코드 정규화 (공백/대시 제거, 대문자) */
    public static String normalize(String code) {
        if (code == null) return null;
        String c = code.trim().toUpperCase().replace("-", "").replace(" ", "");
        return c.isEmpty() ? null : c;
    }
}

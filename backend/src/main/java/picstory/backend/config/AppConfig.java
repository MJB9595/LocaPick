package picstory.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    /**
     * KakaoAuthService에서 카카오 API 호출에 사용
     * @RequiredArgsConstructor 로 주입받으므로 반드시 Bean 등록 필요
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
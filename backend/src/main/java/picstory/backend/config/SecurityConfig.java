package picstory.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import picstory.backend.security.JwtAuthFilter;
import picstory.backend.security.JwtUtil;

import java.util.List;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // 공개 엔드포인트
                        .requestMatchers(HttpMethod.POST, "/auth/signup", "/auth/login").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // ✅ [카카오 로그인 추가] /auth/kakao, /auth/kakao/callback 허용
                        .requestMatchers(HttpMethod.GET, "/auth/kakao", "/auth/kakao/callback").permitAll()
                        .requestMatchers("/auth/**", "/actuator/health", "/locapick/**", "/uploads/**", "/api/uploads/**", "/images/**", "/api/images/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // ✅ WebSocket(STOMP) 핸드셰이크 — 토큰 검증은 ChannelInterceptor에서 수행
                        .requestMatchers("/ws/**").permitAll()

                        // 어드민 전용 엔드포인트
                        .requestMatchers("/admin/**").hasRole("ADMIN")

                        // 회원 목록 조회는 어드민만
                        .requestMatchers(HttpMethod.GET, "/members").hasRole("ADMIN")

                        // 나머지 /members/** 는 인증된 사용자
                        .requestMatchers("/members/**").authenticated()

                        // 그 외 모든 요청도 인증 필요
                        .anyRequest().authenticated()
                )

                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())

                .addFilterBefore(new JwtAuthFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://192.168.50.182:5173",
                "https://locapick.mjb.diskstation.me",
                "capacitor://localhost",
                "https://localhost",
                "http://localhost"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
package picstory.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 🌟 핵심: 프론트가 /api/uploads/ 로 부르든 /uploads/ 로 부르든
        // 도커 내부의 절대 경로(/app/uploads/)와 로컬 경로(./uploads/) 양쪽에서 무조건 찾아오게 이중 매핑!
        registry.addResourceHandler("/api/uploads/**", "/uploads/**")
                .addResourceLocations("file:/app/uploads/", "file:./uploads/");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:5173", // 기존 PC 웹용
                        "http://localhost",      // 안드로이드 앱(Capacitor)용 추가
                        "https://locapick.mjb.diskstation.me"       // 나스 접속 주소 추가
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
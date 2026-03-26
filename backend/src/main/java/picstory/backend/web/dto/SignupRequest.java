package picstory.backend.web.dto;

public record SignupRequest(
        String name,
        String email,
        String password,
        String passwordConfirm,
        String phone
        // role 은 서버에서 기본값 USER 로 설정 (외부에서 ADMIN 생성 불가)
) {}

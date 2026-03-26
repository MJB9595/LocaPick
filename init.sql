-- init.sql 파일 내용
CREATE DATABASE IF NOT EXISTS MUI_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE MUI_db;

CREATE TABLE IF NOT EXISTS members (
    id            BIGINT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(50)     NOT NULL                COMMENT '사용자 이름',
    email         VARCHAR(100)    NOT NULL                COMMENT '이메일 (로그인 ID)',
    password_hash VARCHAR(200)    NOT NULL                COMMENT 'BCrypt 해시 비밀번호',
    phone         VARCHAR(30)     DEFAULT NULL            COMMENT '전화번호',
    role          VARCHAR(10)     NOT NULL DEFAULT 'USER' COMMENT '권한: USER | ADMIN',
    status        VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE' COMMENT '계정 상태: ACTIVE | SUSPENDED | DELETED',
    email_verified TINYINT(1)     NOT NULL DEFAULT 0      COMMENT '이메일 인증 여부',
    created_at    DATETIME        NOT NULL                COMMENT '생성일시',
    updated_at    DATETIME        NOT NULL                COMMENT '수정일시',

    PRIMARY KEY (id),
    UNIQUE KEY uq_members_email (email),
    UNIQUE KEY uq_members_phone (phone),
    INDEX idx_members_role   (role),
    INDEX idx_members_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='회원 테이블';
package com.tranyu.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 密码加密与校验工具类（BCrypt）
 * 统一封装，便于在登录、重置密码等场景复用
 */
@Component
public class PasswordEncoderUtil {

    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder();

    /** 对明文密码进行加密 */
    public String encode(String rawPassword) {
        return ENCODER.encode(rawPassword);
    }

    /** 校验明文密码与加密密码是否匹配 */
    public boolean matches(String rawPassword, String encodedPassword) {
        if (rawPassword == null || encodedPassword == null) {
            return false;
        }
        return ENCODER.matches(rawPassword, encodedPassword);
    }
}


package com.tranyu.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 配置与工具
 * 负责生成、解析、校验登录 Token
 */
@Component
public class JwtConfig {

    /** 签名密钥（示例项目写死，生产环境请使用配置文件并妥善保密） */
    private static final String SECRET = "tranyu-system-jwt-secret-key-2025-change-me";

    /** Token 有效期（毫秒），默认 7 天 */
    private static final long EXPIRATION_MS = 7L * 24 * 60 * 60 * 1000;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        this.secretKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    /** 生成登录 Token，载荷中写入用户ID和用户名 */
    public String generateToken(Long userId, String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + EXPIRATION_MS);
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /** 从 Token 中解析 Claims，若非法或过期会抛出异常 */
    public Claims parseToken(String token) {
        Jws<Claims> jws = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token);
        return jws.getBody();
    }

    /** 根据 Token 获取用户ID，非法/过期时返回 null */
    public Long getUserId(String token) {
        try {
            Claims claims = parseToken(token);
            String subject = claims.getSubject();
            return Long.parseLong(subject);
        } catch (Exception e) {
            return null;
        }
    }

    /** 提取 Authorization 请求头中的 Bearer Token */
    public String resolveToken(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }
}


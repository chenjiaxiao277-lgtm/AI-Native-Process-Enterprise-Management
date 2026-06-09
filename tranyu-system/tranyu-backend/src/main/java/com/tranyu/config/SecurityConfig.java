package com.tranyu.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 开发环境先关闭 CSRF 校验
                .csrf(AbstractHttpConfigurer::disable)
                // 所有请求直接放行（后续按需要再收紧）
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()
                )
                // 关闭默认的 Basic 和表单登录页，避免浏览器弹出登录框
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);

        return http.build();
    }
}

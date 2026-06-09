package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.service.LoginService;
import com.tranyu.service.LoginService.CurrentUserInfo;
import com.tranyu.service.LoginService.LoginResult;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 登录控制器
 * 提供：
 * - POST /api/login       用户名密码登录
 * - GET  /api/current-user  获取当前登录用户信息
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class LoginController {

    private final LoginService loginService;

    @PostMapping("/login")
    public Result<LoginResult> login(@RequestBody LoginRequest body) {
        try {
            LoginResult result = loginService.login(body.getUsername(), body.getPassword());
            return Result.ok(result);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            return Result.fail("登录失败，请稍后再试");
        }
    }

    @GetMapping("/current-user")
    public Result<CurrentUserInfo> currentUser(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = loginServiceTokenFromHeader(authHeader);
        if (token == null) {
            return Result.fail("未登录");
        }
        CurrentUserInfo info = loginService.getCurrentUser(token);
        if (info == null) {
            return Result.fail("登录已失效，请重新登录");
        }
        return Result.ok(info);
    }

    private String loginServiceTokenFromHeader(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return authHeader;
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
        private Boolean rememberMe;
    }
}

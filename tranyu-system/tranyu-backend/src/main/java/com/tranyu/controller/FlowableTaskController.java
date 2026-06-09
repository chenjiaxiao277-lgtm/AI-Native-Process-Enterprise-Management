package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.config.JwtConfig;
import com.tranyu.flowable.FlowableTaskService;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * Flowable 任务审批：待办、已办、通过、驳回、加签、减签
 * 当前用户 ID 优先从 JWT（Authorization）解析，与 sys_user.id 一致（String）
 */
@RestController
@RequestMapping("/api/flowable/task")
public class FlowableTaskController {

    private final FlowableTaskService flowableTaskService;
    private final JwtConfig jwtConfig;

    public FlowableTaskController(FlowableTaskService flowableTaskService, JwtConfig jwtConfig) {
        this.flowableTaskService = flowableTaskService;
        this.jwtConfig = jwtConfig;
    }

    private String currentUserId(HttpServletRequest request) {
        String token = jwtConfig.resolveToken(request.getHeader("Authorization"));
        if (token == null) return null;
        Long id = jwtConfig.getUserId(token);
        return id != null ? String.valueOf(id) : null;
    }

    @GetMapping("/todo")
    public Result<List<Map<String, Object>>> todo(@RequestParam(value = "userId", required = false) String paramUserId,
                                                  HttpServletRequest request) {
        String userId = currentUserId(request);
        if (userId == null) userId = paramUserId;
        if (userId == null || userId.isBlank()) return Result.fail("未登录或缺少 userId");
        return Result.ok(flowableTaskService.todo(userId));
    }

    @GetMapping("/done")
    public Result<List<Map<String, Object>>> done(@RequestParam(value = "userId", required = false) String paramUserId,
                                                 HttpServletRequest request) {
        String userId = currentUserId(request);
        if (userId == null) userId = paramUserId;
        if (userId == null || userId.isBlank()) return Result.fail("未登录或缺少 userId");
        return Result.ok(flowableTaskService.done(userId));
    }

    @PostMapping("/approve")
    public Result<Void> approve(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String taskId = (String) body.get("taskId");
        String userId = (String) body.get("userId");
        if (userId == null) userId = currentUserId(request);
        String comment = (String) body.get("comment");
        @SuppressWarnings("unchecked")
        Map<String, Object> variables = (Map<String, Object>) body.get("variables");
        if (taskId == null || userId == null) return Result.fail("taskId 必填且需登录或传 userId");
        flowableTaskService.approve(taskId, userId, comment, variables);
        return Result.ok(null);
    }

    @PostMapping("/reject")
    public Result<Void> reject(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String taskId = (String) body.get("taskId");
        String userId = (String) body.get("userId");
        if (userId == null) userId = currentUserId(request);
        String comment = (String) body.get("comment");
        if (taskId == null || userId == null) return Result.fail("taskId 必填且需登录或传 userId");
        flowableTaskService.reject(taskId, userId, comment);
        return Result.ok(null);
    }

    @PostMapping("/addSign")
    public Result<Void> addSign(@RequestBody Map<String, String> body) {
        String taskId = body.get("taskId");
        String addUserId = body.get("addUserId");
        if (taskId == null || addUserId == null) return Result.fail("taskId 与 addUserId 必填");
        flowableTaskService.addSign(taskId, addUserId);
        return Result.ok(null);
    }

    @PostMapping("/removeSign")
    public Result<Void> removeSign(@RequestBody Map<String, String> body) {
        String taskId = body.get("taskId");
        String removeUserId = body.get("removeUserId");
        if (taskId == null || removeUserId == null) return Result.fail("taskId 与 removeUserId 必填");
        flowableTaskService.removeSign(taskId, removeUserId);
        return Result.ok(null);
    }
}

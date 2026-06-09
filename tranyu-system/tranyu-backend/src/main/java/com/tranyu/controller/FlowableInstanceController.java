package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.config.JwtConfig;
import com.tranyu.flowable.FlowableInstanceService;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * Flowable 流程实例：发起、列表、终止
 */
@RestController
@RequestMapping("/api/flowable/instance")
public class FlowableInstanceController {

    private final FlowableInstanceService flowableInstanceService;
    private final JwtConfig jwtConfig;

    public FlowableInstanceController(FlowableInstanceService flowableInstanceService, JwtConfig jwtConfig) {
        this.flowableInstanceService = flowableInstanceService;
        this.jwtConfig = jwtConfig;
    }

    @PostMapping("/start")
    public Result<Map<String, Object>> start(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String processDefinitionKey = (String) body.get("processDefinitionKey");
        String initiatorUserId = (String) body.get("initiatorUserId");
        if (initiatorUserId == null || initiatorUserId.isBlank()) {
            String token = jwtConfig.resolveToken(request.getHeader("Authorization"));
            if (token != null && jwtConfig.getUserId(token) != null)
                initiatorUserId = String.valueOf(jwtConfig.getUserId(token));
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> variables = (Map<String, Object>) body.get("variables");
        if (processDefinitionKey == null || processDefinitionKey.isBlank())
            return Result.fail("processDefinitionKey 必填");
        if (initiatorUserId == null) initiatorUserId = "";
        Map<String, Object> result = flowableInstanceService.start(processDefinitionKey, initiatorUserId, variables);
        return Result.ok(result);
    }

    @GetMapping("/list")
    public Result<Map<String, Object>> list() {
        List<Map<String, Object>> running = flowableInstanceService.listRunning();
        List<Map<String, Object>> historic = flowableInstanceService.listHistoric();
        Map<String, Object> data = new java.util.HashMap<>();
        data.put("running", running);
        data.put("historic", historic);
        return Result.ok(data);
    }

    @PostMapping("/terminate/{processInstanceId}")
    public Result<Void> terminate(@PathVariable String processInstanceId, @RequestBody(required = false) Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        flowableInstanceService.terminate(processInstanceId, reason);
        return Result.ok(null);
    }
}

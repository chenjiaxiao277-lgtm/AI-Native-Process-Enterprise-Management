package com.tranyu.controller;

import com.tranyu.common.Result;
import com.tranyu.flowable.FlowableProcessService;
import org.flowable.engine.repository.Deployment;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * Flowable 流程管理：部署、列表、删除
 */
@RestController
@RequestMapping("/api/flowable")
public class FlowableProcessController {

    private final FlowableProcessService flowableProcessService;

    public FlowableProcessController(FlowableProcessService flowableProcessService) {
        this.flowableProcessService = flowableProcessService;
    }

    @PostMapping("/deploy")
    public Result<Map<String, Object>> deploy(@RequestParam("file") MultipartFile file) {
        try {
            Deployment d = flowableProcessService.deploy(file);
            Map<String, Object> data = new java.util.HashMap<>();
            data.put("id", d.getId());
            data.put("name", d.getName());
            data.put("deploymentTime", d.getDeploymentTime() != null ? d.getDeploymentTime().toString() : null);
            return Result.ok(data);
        } catch (Exception e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/process/list")
    public Result<List<Map<String, Object>>> list() {
        return Result.ok(flowableProcessService.listProcessDefinitions());
    }

    @DeleteMapping("/process/{deploymentId}")
    public Result<Void> delete(@PathVariable String deploymentId) {
        flowableProcessService.deleteDeployment(deploymentId);
        return Result.ok(null);
    }

    @PostMapping("/process/{processDefinitionId}/suspended")
    public Result<Void> setSuspended(@PathVariable String processDefinitionId, @RequestBody Map<String, Boolean> body) {
        Boolean suspended = body != null ? body.get("suspended") : null;
        flowableProcessService.setSuspended(processDefinitionId, Boolean.TRUE.equals(suspended));
        return Result.ok(null);
    }
}

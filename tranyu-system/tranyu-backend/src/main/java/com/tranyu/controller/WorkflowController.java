package com.tranyu.controller;

import com.tranyu.common.Result;
import com.tranyu.dto.WorkflowConfigDTO;
import com.tranyu.entity.WorkflowConfig;
import com.tranyu.entity.WorkflowInstance;
import com.tranyu.service.WorkflowConfigService;
import com.tranyu.service.WorkflowProcessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 工作流审批模块 API
 * - 工作流配置 CRUD、启用/禁用
 * - 发起审批、审批/驳回、待办列表、流程列表、实例详情（含轨迹）
 */
@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
public class WorkflowController {

    private final WorkflowConfigService configService;
    private final WorkflowProcessService processService;

    // ---------- 工作流配置 ----------
    @GetMapping("/config/list")
    public Result<List<WorkflowConfig>> listConfig(@RequestParam(required = false) String bizModule) {
        return Result.ok(configService.list(bizModule));
    }

    @GetMapping("/config/{id}")
    public Result<WorkflowConfig> getConfig(@PathVariable Long id) {
        WorkflowConfig config = configService.getWithNodes(id);
        return config == null ? Result.fail("工作流不存在") : Result.ok(config);
    }

    @PostMapping("/config/save")
    public Result<WorkflowConfig> saveConfig(@RequestBody WorkflowConfigDTO dto) {
        WorkflowConfig config = new WorkflowConfig();
        config.setId(dto.getId());
        config.setName(dto.getName());
        config.setBizModule(dto.getBizModule());
        config.setEnabled(dto.getEnabled() != null ? dto.getEnabled() : 1);
        config.setRemark(dto.getRemark());
        return Result.ok(configService.save(config, dto.getNodes()));
    }

    @PostMapping("/config/{id}/enabled")
    public Result<Void> setConfigEnabled(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Integer enabled = body.get("enabled");
        configService.setEnabled(id, enabled != null && enabled == 1 ? 1 : 0);
        return Result.ok(null);
    }

    @DeleteMapping("/config/{id}")
    public Result<Void> deleteConfig(@PathVariable Long id) {
        configService.deleteById(id);
        return Result.ok(null);
    }

    // ---------- 流程任务 ----------
    /** 发起审批 */
    @PostMapping("/process/start")
    public Result<WorkflowInstance> startProcess(@RequestBody Map<String, Object> body) {
        Long workflowId = longFrom(body.get("workflowId"));
        String bizType = (String) body.get("bizType");
        Long bizId = longFrom(body.get("bizId"));
        String bizTitle = (String) body.get("bizTitle");
        String initiatorId = body.get("initiatorId") != null ? body.get("initiatorId").toString() : "1";
        String initiatorName = (String) body.get("initiatorName");
        if (initiatorName == null) initiatorName = "发起人";
        WorkflowInstance inst = processService.startProcess(workflowId, bizType, bizId, bizTitle, initiatorId, initiatorName);
        return Result.ok(inst);
    }

    /** 审批通过 */
    @PostMapping("/process/approve")
    public Result<Void> approve(@RequestBody Map<String, Object> body) {
        Long instanceId = longFrom(body.get("instanceId"));
        String approverId = body.get("approverId") != null ? body.get("approverId").toString() : "1";
        String approverName = (String) body.get("approverName");
        if (approverName == null) approverName = "审批人";
        String comment = (String) body.get("comment");
        processService.approve(instanceId, approverId, approverName, comment);
        return Result.ok(null);
    }

    /** 驳回 */
    @PostMapping("/process/reject")
    public Result<Void> reject(@RequestBody Map<String, Object> body) {
        Long instanceId = longFrom(body.get("instanceId"));
        String approverId = body.get("approverId") != null ? body.get("approverId").toString() : "1";
        String approverName = (String) body.get("approverName");
        if (approverName == null) approverName = "审批人";
        String comment = (String) body.get("comment");
        processService.reject(instanceId, approverId, approverName, comment);
        return Result.ok(null);
    }

    /** 待我审批 */
    @GetMapping("/process/my-tasks")
    public Result<List<WorkflowInstance>> myTasks(@RequestParam(defaultValue = "1") String approverId) {
        return Result.ok(processService.listMyPendingTasks(approverId));
    }

    /** 流程列表（全部/待审批/已审批） */
    @GetMapping("/process/list")
    public Result<List<WorkflowInstance>> listProcess(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String initiatorId) {
        return Result.ok(processService.listInstances(status, initiatorId));
    }

    /** 实例详情（含审批轨迹） */
    @GetMapping("/process/{id}")
    public Result<WorkflowInstance> getInstance(@PathVariable Long id) {
        WorkflowInstance inst = processService.getInstanceDetail(id);
        return inst == null ? Result.fail("流程不存在") : Result.ok(inst);
    }

    private static Long longFrom(Object o) {
        if (o == null) return null;
        if (o instanceof Number) return ((Number) o).longValue();
        try {
            return Long.parseLong(o.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

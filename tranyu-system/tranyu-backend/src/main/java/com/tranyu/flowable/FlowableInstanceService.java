package com.tranyu.flowable;

import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.tranyu.service.FlowableApprovalLogService;
import com.tranyu.service.PermissionAuditLogService;
import com.tranyu.service.PermissionActionConfigService;
import com.tranyu.service.PermissionEngine;
import com.tranyu.service.PermissionFacade;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Flowable 流程实例：发起、列表、终止、转办
 */
@Service
public class FlowableInstanceService {

    private final RuntimeService runtimeService;
    private final HistoryService historyService;
    private final TaskService taskService;
    private final PermissionFacade permissionFacade;
    private final PermissionAuditLogService permissionAuditLogService;
    private final FlowableApprovalLogService flowableApprovalLogService;

    public FlowableInstanceService(RuntimeService runtimeService,
                                   HistoryService historyService,
                                   TaskService taskService,
                                   PermissionFacade permissionFacade,
                                   PermissionAuditLogService permissionAuditLogService,
                                   FlowableApprovalLogService flowableApprovalLogService) {
        this.runtimeService = runtimeService;
        this.historyService = historyService;
        this.taskService = taskService;
        this.permissionFacade = permissionFacade;
        this.permissionAuditLogService = permissionAuditLogService;
        this.flowableApprovalLogService = flowableApprovalLogService;
    }

    /**
     * 按流程定义 key 发起实例，并传入业务变量（如 initiatorUserId、bizType、bizId、bizTitle）
     */
    public Map<String, Object> start(String processDefinitionKey, String initiatorUserId, Map<String, Object> variables) {
        if (variables == null) variables = new HashMap<>();
        variables.put("initiatorUserId", initiatorUserId);
        ProcessInstance pi = runtimeService.startProcessInstanceByKey(processDefinitionKey, variables);
        Map<String, Object> m = new HashMap<>();
        m.put("id", pi.getId());
        m.put("processInstanceId", pi.getId());
        m.put("processDefinitionId", pi.getProcessDefinitionId());
        m.put("activityId", pi.getActivityId());
        m.put("businessKey", pi.getBusinessKey());
        return m;
    }

    /**
     * 运行中 + 已结束的流程实例列表（简化：只查运行中，已结束用历史接口）
     */
    public List<Map<String, Object>> listRunning() {
        List<ProcessInstance> list = runtimeService.createProcessInstanceQuery()
                .orderByProcessInstanceId()
                .desc()
                .list();
        List<Map<String, Object>> result = new ArrayList<>();
        for (ProcessInstance pi : list) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", pi.getId());
            m.put("processInstanceId", pi.getId());
            m.put("processDefinitionId", pi.getProcessDefinitionId());
            m.put("activityId", pi.getActivityId());
            m.put("businessKey", pi.getBusinessKey());
            m.put("suspended", pi.isSuspended());
            result.add(m);
        }
        return result;
    }

    /**
     * 历史流程实例（已结束）
     */
    public List<Map<String, Object>> listHistoric() {
        List<org.flowable.engine.history.HistoricProcessInstance> list = historyService.createHistoricProcessInstanceQuery()
                .finished()
                .orderByProcessInstanceEndTime()
                .desc()
                .list();
        List<Map<String, Object>> result = new ArrayList<>();
        for (org.flowable.engine.history.HistoricProcessInstance hi : list) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", hi.getId());
            m.put("processInstanceId", hi.getId());
            m.put("processDefinitionId", hi.getProcessDefinitionId());
            m.put("startTime", hi.getStartTime() != null ? hi.getStartTime().toString() : null);
            m.put("endTime", hi.getEndTime() != null ? hi.getEndTime().toString() : null);
            m.put("deleteReason", hi.getDeleteReason());
            result.add(m);
        }
        return result;
    }

    /**
     * 终止流程实例
     */
    public void terminate(String processInstanceId, String reason) {
        Task activeTask = findActiveTask(processInstanceId);
        String taskId = activeTask == null ? processInstanceId : activeTask.getId();
        assertWorkflowActionAuthorized(processInstanceId, taskId, PermissionFacade.ACTION_TERMINATE, "无权终止当前流程");
        runtimeService.deleteProcessInstance(processInstanceId, reason != null ? reason : "用户终止");
        flowableApprovalLogService.logAction(processInstanceId, taskId, currentUserId(), PermissionFacade.ACTION_TERMINATE,
                reason != null ? reason : "用户终止");
    }

    /**
     * 转办当前流程的活动任务
     */
    public void transfer(String processInstanceId, String targetUserId, String reason) {
        Task activeTask = findActiveTask(processInstanceId);
        if (activeTask == null) {
            throw new IllegalArgumentException("流程无可转办任务");
        }
        assertWorkflowActionAuthorized(processInstanceId, activeTask.getId(), PermissionFacade.ACTION_TRANSFER, "无权转办当前流程");
        taskService.setAssignee(activeTask.getId(), targetUserId);
        flowableApprovalLogService.logAction(processInstanceId, activeTask.getId(), currentUserId(), PermissionFacade.ACTION_TRANSFER,
                reason != null ? reason : "转办至:" + targetUserId);
    }

    private Task findActiveTask(String processInstanceId) {
        return taskService.createTaskQuery()
                .processInstanceId(processInstanceId)
                .active()
                .orderByTaskCreateTime()
                .asc()
                .singleResult();
    }

    private void assertWorkflowActionAuthorized(String processInstanceId,
                                                String taskId,
                                                String action,
                                                String denyMessage) {
        String tenantId = TenantContext.getCurrentTenantIdOrDefault();
        String currentSpaceId = SpaceContext.getCurrentSpaceId();
        String normalizedSpaceId = (currentSpaceId == null || currentSpaceId.isBlank()) ? "0" : currentSpaceId.trim();
        PermissionEngine.PermissionDecision decision = permissionFacade.checkWorkflowAction(tenantId, normalizedSpaceId, action);
        PermissionEngine.PermissionTarget target = decision.getMatchedTarget() != null
                ? decision.getMatchedTarget()
                : PermissionFacade.WORKFLOW_APPROVAL_TARGETS.get(0);
        permissionAuditLogService.logDecision(
                currentUserId(),
                tenantId,
                parseLong(normalizedSpaceId),
                target.getResourceType(),
                target.getResourceCode(),
                PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL,
                processInstanceId,
                taskId,
                action,
                decision
        );
        if (!decision.isAllowed()) {
            throw new IllegalArgumentException(denyMessage);
        }
    }

    private Long currentUserId() {
        Long userId = AuthSubjectContext.getCurrentUserId();
        return userId == null ? 0L : userId;
    }

    private Long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception ex) {
            return 0L;
        }
    }
}

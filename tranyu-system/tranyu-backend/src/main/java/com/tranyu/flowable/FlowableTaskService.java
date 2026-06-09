package com.tranyu.flowable;

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
import org.flowable.task.api.Task;
import org.flowable.task.api.TaskQuery;
import org.flowable.task.api.history.HistoricTaskInstance;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Flowable 任务审批：待办、已办、通过、驳回、加签、减签
 * 当前用户 ID 使用 String.valueOf(sys_user.id)，与 TranyuIdmIdentityService 一致
 */
@Service
public class FlowableTaskService {

    private final TaskService taskService;
    private final HistoryService historyService;
    private final RuntimeService runtimeService;
    private final PermissionFacade permissionFacade;
    private final PermissionAuditLogService permissionAuditLogService;
    private final FlowableApprovalLogService flowableApprovalLogService;

    public FlowableTaskService(TaskService taskService,
                               HistoryService historyService,
                               RuntimeService runtimeService,
                               PermissionFacade permissionFacade,
                               PermissionAuditLogService permissionAuditLogService,
                               FlowableApprovalLogService flowableApprovalLogService) {
        this.taskService = taskService;
        this.historyService = historyService;
        this.runtimeService = runtimeService;
        this.permissionFacade = permissionFacade;
        this.permissionAuditLogService = permissionAuditLogService;
        this.flowableApprovalLogService = flowableApprovalLogService;
    }

    /**
     * 待办任务：候选人或办理人为当前用户
     */
    public List<Map<String, Object>> todo(String userId) {
        if (userId == null || userId.isBlank()) return new ArrayList<>();
        List<Task> list = taskService.createTaskQuery()
                .taskCandidateOrAssigned(userId)
                .orderByTaskCreateTime()
                .desc()
                .list();
        return toTaskMaps(list);
    }

    /**
     * 已办任务：当前用户已完成的
     */
    public List<Map<String, Object>> done(String userId) {
        if (userId == null || userId.isBlank()) return new ArrayList<>();
        List<HistoricTaskInstance> list = historyService.createHistoricTaskInstanceQuery()
                .taskAssignee(userId)
                .finished()
                .orderByHistoricTaskInstanceEndTime()
                .desc()
                .list();
        return toHistoricTaskMaps(list);
    }

    /**
     * 审批通过：完成任务并传入变量
     */
    public void approve(String taskId, String userId, String comment, Map<String, Object> variables) {
        Task task = requireTask(taskId);
        assertWorkflowActionAuthorized(task, userId, PermissionFacade.ACTION_APPROVE, "无权审批当前任务");
        if (variables != null && !variables.isEmpty()) {
            taskService.setVariables(taskId, variables);
        }
        if (comment != null && !comment.isBlank()) {
            taskService.addComment(taskId, null, comment);
        }
        taskService.claim(taskId, userId);
        taskService.complete(taskId, variables != null ? variables : new HashMap<>());
        flowableApprovalLogService.logAction(task.getProcessInstanceId(), taskId, parseUserId(userId), PermissionFacade.ACTION_APPROVE, comment);
    }

    /**
     * 驳回：删除当前流程实例（结束流程）或通过变量驱动 BPMN 网关回退（需 BPMN 支持）
     * 此处实现为“结束流程”；若需驳回到指定节点，需在 BPMN 中使用信号/边界事件或子流程
     */
    public void reject(String taskId, String userId, String comment) {
        Task task = requireTask(taskId);
        assertWorkflowActionAuthorized(task, userId, PermissionFacade.ACTION_REJECT, "无权驳回当前任务");
        String processInstanceId = task.getProcessInstanceId();
        taskService.addComment(taskId, null, comment != null ? comment : "驳回");
        taskService.claim(taskId, userId);
        runtimeService.deleteProcessInstance(processInstanceId, "驳回:" + (comment != null ? comment : ""));
        flowableApprovalLogService.logAction(processInstanceId, taskId, parseUserId(userId), PermissionFacade.ACTION_REJECT, comment != null ? comment : "驳回");
    }

    /**
     * 加签：为当前任务添加候选人（Flowable 原生支持添加 candidate user）
     */
    public void addSign(String taskId, String addUserId) {
        taskService.addCandidateUser(taskId, addUserId);
    }

    /**
     * 减签：移除候选用户
     */
    public void removeSign(String taskId, String removeUserId) {
        taskService.deleteCandidateUser(taskId, removeUserId);
    }

    private Task requireTask(String taskId) {
        TaskQuery query = taskService.createTaskQuery();
        Task task = query.taskId(taskId).singleResult();
        if (task == null) {
            throw new IllegalArgumentException("任务不存在或已完成");
        }
        return task;
    }

    private PermissionEngine.PermissionDecision assertWorkflowActionAuthorized(Task task,
                                                                              String userId,
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
                parseUserId(userId),
                tenantId,
                parseUserId(normalizedSpaceId),
                target.getResourceType(),
                target.getResourceCode(),
                PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL,
                task.getProcessInstanceId(),
                task.getId(),
                action,
                decision
        );
        if (!decision.isAllowed()) {
            throw new IllegalArgumentException(denyMessage);
        }
        return decision;
    }

    private Long parseUserId(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception ex) {
            return 0L;
        }
    }

    private List<Map<String, Object>> toTaskMaps(List<Task> list) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Task t : list) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("processInstanceId", t.getProcessInstanceId());
            m.put("processDefinitionId", t.getProcessDefinitionId());
            m.put("assignee", t.getAssignee());
            m.put("createTime", t.getCreateTime() != null ? t.getCreateTime().toString() : null);
            m.put("taskDefinitionKey", t.getTaskDefinitionKey());
            result.add(m);
        }
        return result;
    }

    private List<Map<String, Object>> toHistoricTaskMaps(List<HistoricTaskInstance> list) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (HistoricTaskInstance t : list) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            m.put("processInstanceId", t.getProcessInstanceId());
            m.put("processDefinitionId", t.getProcessDefinitionId());
            m.put("assignee", t.getAssignee());
            m.put("startTime", t.getStartTime() != null ? t.getStartTime().toString() : null);
            m.put("endTime", t.getEndTime() != null ? t.getEndTime().toString() : null);
            m.put("taskDefinitionKey", t.getTaskDefinitionKey());
            result.add(m);
        }
        return result;
    }
}

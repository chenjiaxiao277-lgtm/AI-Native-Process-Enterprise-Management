package com.tranyu.flowable;

import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.tranyu.entity.FlowableApprovalLog;
import com.tranyu.entity.PermissionAuditLog;
import com.tranyu.mapper.FlowableApprovalLogMapper;
import com.tranyu.mapper.PermissionAuditLogMapper;
import com.tranyu.service.FlowableApprovalLogService;
import com.tranyu.service.PermissionAuditLogService;
import com.tranyu.service.PermissionEngine;
import com.tranyu.service.PermissionFacade;
import com.tranyu.service.PermissionReasonCode;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.flowable.task.api.TaskQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowableTaskServicePermissionTest {

    @Mock
    private TaskService taskService;
    @Mock
    private HistoryService historyService;
    @Mock
    private RuntimeService runtimeService;
    @Mock
    private PermissionFacade permissionFacade;
    @Mock
    private PermissionAuditLogMapper permissionAuditLogMapper;
    @Mock
    private FlowableApprovalLogMapper flowableApprovalLogMapper;
    @Mock
    private TaskQuery taskQuery;
    @Mock
    private Task task;

    @InjectMocks
    private PermissionAuditLogService permissionAuditLogService;
    @InjectMocks
    private FlowableApprovalLogService flowableApprovalLogService;

    private FlowableTaskService service;

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SpaceContext.clear();
    }

    @Test
    void approve_shouldAllowAndWriteAuditAndBusinessLog() {
        service = new FlowableTaskService(taskService, historyService, runtimeService, permissionFacade,
                permissionAuditLogService, flowableApprovalLogService);
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("9");
        mockTask("task-1", "proc-1");
        when(permissionFacade.checkWorkflowAction("default", "9", PermissionFacade.ACTION_APPROVE)).thenReturn(
                PermissionEngine.PermissionDecision.allow(
                        PermissionEngine.PermissionTarget.page("workflow_approval_page"),
                        PermissionFacade.ACTION_APPROVE,
                        PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                        List.of(801L)
                )
        );

        service.approve("task-1", "7", "通过", Map.of("approved", true));

        ArgumentCaptor<PermissionAuditLog> permissionCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(permissionCaptor.capture());
        assertThat(permissionCaptor.getValue().getProcessInstanceId()).isEqualTo("proc-1");
        assertThat(permissionCaptor.getValue().getTaskId()).isEqualTo("task-1");
        assertThat(permissionCaptor.getValue().getMatchedPolicyIds()).isEqualTo("801");

        ArgumentCaptor<FlowableApprovalLog> businessCaptor = ArgumentCaptor.forClass(FlowableApprovalLog.class);
        verify(flowableApprovalLogMapper).insert(businessCaptor.capture());
        assertThat(businessCaptor.getValue().getProcessInstanceId()).isEqualTo("proc-1");
        assertThat(businessCaptor.getValue().getTaskId()).isEqualTo("task-1");
        assertThat(businessCaptor.getValue().getUserId()).isEqualTo(7L);
        assertThat(businessCaptor.getValue().getAction()).isEqualTo(PermissionFacade.ACTION_APPROVE);
        verify(taskService).complete(eq("task-1"), any(Map.class));
    }

    @Test
    void reject_shouldDenyAndOnlyWritePermissionAudit() {
        service = new FlowableTaskService(taskService, historyService, runtimeService, permissionFacade,
                permissionAuditLogService, flowableApprovalLogService);
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("11");
        mockTask("task-2", "proc-2");
        when(permissionFacade.checkWorkflowAction("default", "11", PermissionFacade.ACTION_REJECT)).thenReturn(
                PermissionEngine.PermissionDecision.deny(
                        PermissionFacade.ACTION_REJECT,
                        "命中拒绝策略",
                        PermissionReasonCode.DENY_MATCHED_POLICY.code(),
                        List.of(901L)
                )
        );

        assertThatThrownBy(() -> service.reject("task-2", "8", "驳回"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("无权驳回当前任务");

        ArgumentCaptor<PermissionAuditLog> permissionCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(permissionCaptor.capture());
        assertThat(permissionCaptor.getValue().getAllowed()).isEqualTo(0);
        assertThat(permissionCaptor.getValue().getProcessInstanceId()).isEqualTo("proc-2");
        assertThat(permissionCaptor.getValue().getTaskId()).isEqualTo("task-2");
        assertThat(permissionCaptor.getValue().getAction()).isEqualTo(PermissionFacade.ACTION_REJECT);
        verify(flowableApprovalLogMapper, never()).insert(any(FlowableApprovalLog.class));
        verify(runtimeService, never()).deleteProcessInstance(any(), any());
    }

    private void mockTask(String taskId, String processInstanceId) {
        when(taskService.createTaskQuery()).thenReturn(taskQuery);
        when(taskQuery.taskId(taskId)).thenReturn(taskQuery);
        when(taskQuery.singleResult()).thenReturn(task);
        when(task.getId()).thenReturn(taskId);
        when(task.getProcessInstanceId()).thenReturn(processInstanceId);
    }
}

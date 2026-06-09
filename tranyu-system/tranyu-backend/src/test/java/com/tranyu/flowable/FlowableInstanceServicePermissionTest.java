package com.tranyu.flowable;

import com.tranyu.context.AuthSubjectContext;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlowableInstanceServicePermissionTest {

    @Mock
    private RuntimeService runtimeService;
    @Mock
    private HistoryService historyService;
    @Mock
    private TaskService taskService;
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

    private FlowableInstanceService service;

    @AfterEach
    void tearDown() {
        AuthSubjectContext.clear();
        TenantContext.clear();
        SpaceContext.clear();
    }

    @Test
    void terminate_shouldAllowAndWriteAuditAndBusinessLog() {
        service = new FlowableInstanceService(runtimeService, historyService, taskService, permissionFacade,
                permissionAuditLogService, flowableApprovalLogService);
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(7L, "owner", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("9");
        mockActiveTask("proc-200", "task-200");
        when(permissionFacade.checkWorkflowAction("default", "9", PermissionFacade.ACTION_TERMINATE)).thenReturn(
                PermissionEngine.PermissionDecision.allow(
                        PermissionEngine.PermissionTarget.page("workflow_approval_page"),
                        PermissionFacade.ACTION_TERMINATE,
                        PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                        List.of(1101L)
                )
        );

        service.terminate("proc-200", "终止");

        ArgumentCaptor<PermissionAuditLog> permissionCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(permissionCaptor.capture());
        assertThat(permissionCaptor.getValue().getAction()).isEqualTo(PermissionFacade.ACTION_TERMINATE);
        assertThat(permissionCaptor.getValue().getProcessInstanceId()).isEqualTo("proc-200");
        assertThat(permissionCaptor.getValue().getTaskId()).isEqualTo("task-200");

        ArgumentCaptor<FlowableApprovalLog> businessCaptor = ArgumentCaptor.forClass(FlowableApprovalLog.class);
        verify(flowableApprovalLogMapper).insert(businessCaptor.capture());
        assertThat(businessCaptor.getValue().getAction()).isEqualTo(PermissionFacade.ACTION_TERMINATE);
        verify(runtimeService).deleteProcessInstance("proc-200", "终止");
    }

    @Test
    void terminate_shouldDenyAndOnlyWritePermissionAudit() {
        service = new FlowableInstanceService(runtimeService, historyService, taskService, permissionFacade,
                permissionAuditLogService, flowableApprovalLogService);
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(8L, "owner", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("11");
        mockActiveTask("proc-201", "task-201");
        when(permissionFacade.checkWorkflowAction("default", "11", PermissionFacade.ACTION_TERMINATE)).thenReturn(
                PermissionEngine.PermissionDecision.deny(
                        PermissionFacade.ACTION_TERMINATE,
                        "命中拒绝策略",
                        PermissionReasonCode.DENY_MATCHED_POLICY.code(),
                        List.of(1102L)
                )
        );

        assertThatThrownBy(() -> service.terminate("proc-201", "终止"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("无权终止当前流程");

        verify(permissionAuditLogMapper).insert(any(PermissionAuditLog.class));
        verify(flowableApprovalLogMapper, never()).insert(any(FlowableApprovalLog.class));
        verify(runtimeService, never()).deleteProcessInstance(any(), any());
    }

    @Test
    void transfer_shouldAllowAndWriteAuditAndBusinessLog() {
        service = new FlowableInstanceService(runtimeService, historyService, taskService, permissionFacade,
                permissionAuditLogService, flowableApprovalLogService);
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(9L, "owner", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("12");
        mockActiveTask("proc-202", "task-202");
        when(permissionFacade.checkWorkflowAction("default", "12", PermissionFacade.ACTION_TRANSFER)).thenReturn(
                PermissionEngine.PermissionDecision.allow(
                        PermissionEngine.PermissionTarget.page("workflow_approval_page"),
                        PermissionFacade.ACTION_TRANSFER,
                        PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                        List.of(1201L)
                )
        );

        service.transfer("proc-202", "10", "转办");

        ArgumentCaptor<PermissionAuditLog> permissionCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(permissionCaptor.capture());
        assertThat(permissionCaptor.getValue().getAction()).isEqualTo(PermissionFacade.ACTION_TRANSFER);
        verify(taskService).setAssignee("task-202", "10");
        verify(flowableApprovalLogMapper).insert(any(FlowableApprovalLog.class));
    }

    @Test
    void transfer_shouldDenyAndOnlyWritePermissionAudit() {
        service = new FlowableInstanceService(runtimeService, historyService, taskService, permissionFacade,
                permissionAuditLogService, flowableApprovalLogService);
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(10L, "owner", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("13");
        mockActiveTask("proc-203", "task-203");
        when(permissionFacade.checkWorkflowAction("default", "13", PermissionFacade.ACTION_TRANSFER)).thenReturn(
                PermissionEngine.PermissionDecision.deny(
                        PermissionFacade.ACTION_TRANSFER,
                        "命中拒绝策略",
                        PermissionReasonCode.DENY_MATCHED_POLICY.code(),
                        List.of(1202L)
                )
        );

        assertThatThrownBy(() -> service.transfer("proc-203", "11", "转办"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("无权转办当前流程");

        verify(permissionAuditLogMapper).insert(any(PermissionAuditLog.class));
        verify(taskService, never()).setAssignee(eq("task-203"), eq("11"));
        verify(flowableApprovalLogMapper, never()).insert(any(FlowableApprovalLog.class));
    }

    private void mockActiveTask(String processInstanceId, String taskId) {
        when(taskService.createTaskQuery()).thenReturn(taskQuery);
        when(taskQuery.processInstanceId(processInstanceId)).thenReturn(taskQuery);
        when(taskQuery.active()).thenReturn(taskQuery);
        when(taskQuery.orderByTaskCreateTime()).thenReturn(taskQuery);
        when(taskQuery.asc()).thenReturn(taskQuery);
        when(taskQuery.singleResult()).thenReturn(task);
        when(task.getId()).thenReturn(taskId);
    }
}

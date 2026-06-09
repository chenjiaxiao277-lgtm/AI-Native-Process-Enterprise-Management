package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.tranyu.entity.PermissionAuditLog;
import com.tranyu.entity.WorkflowInstance;
import com.tranyu.entity.WorkflowNode;
import com.tranyu.entity.WorkflowRecord;
import com.tranyu.mapper.PermissionAuditLogMapper;
import com.tranyu.mapper.WorkflowConfigMapper;
import com.tranyu.mapper.WorkflowInstanceMapper;
import com.tranyu.mapper.WorkflowNodeMapper;
import com.tranyu.mapper.WorkflowRecordMapper;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowProcessServicePermissionTest {

    @Mock
    private WorkflowConfigMapper configMapper;
    @Mock
    private WorkflowNodeMapper nodeMapper;
    @Mock
    private WorkflowInstanceMapper instanceMapper;
    @Mock
    private WorkflowRecordMapper recordMapper;
    @Mock
    private PermissionFacade permissionFacade;
    @Mock
    private PermissionAuditLogMapper permissionAuditLogMapper;

    @InjectMocks
    private PermissionAuditLogService permissionAuditLogService;

    private WorkflowProcessService service;

    @AfterEach
    void tearDown() {
        AuthSubjectContext.clear();
        TenantContext.clear();
        SpaceContext.clear();
    }

    @Test
    void approve_shouldAllowAndWriteAudit() {
        service = new WorkflowProcessService(
                configMapper,
                nodeMapper,
                instanceMapper,
                recordMapper,
                permissionFacade,
                permissionAuditLogService
        );
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(7L, "approver", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("9");
        when(instanceMapper.selectById(1L)).thenReturn(runningInstance(1L, 10L));
        when(nodeMapper.selectById(10L)).thenReturn(runningNode(10L, 20L));
        when(nodeMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(List.of(runningNode(10L, 20L), runningNode(20L, null)));
        when(permissionFacade.checkWorkflowAction("default", "9", PermissionFacade.ACTION_APPROVE)).thenReturn(
                PermissionEngine.PermissionDecision.allow(
                        PermissionEngine.PermissionTarget.page("workflow_approval_page"),
                        PermissionFacade.ACTION_APPROVE,
                        PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                        List.of(501L)
                )
        );

        service.approve(1L, "7", "审批人", "同意");

        ArgumentCaptor<PermissionAuditLog> auditCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(auditCaptor.capture());
        PermissionAuditLog auditLog = auditCaptor.getValue();
        assertThat(auditLog.getUserId()).isEqualTo(7L);
        assertThat(auditLog.getTenantId()).isEqualTo("default");
        assertThat(auditLog.getSpaceId()).isEqualTo(9L);
        assertThat(auditLog.getAction()).isEqualTo(PermissionFacade.ACTION_APPROVE);
        assertThat(auditLog.getReasonCode()).isEqualTo(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        assertThat(auditLog.getMatchedPolicyIds()).isEqualTo("501");
        verify(recordMapper).insert(any(WorkflowRecord.class));
        verify(instanceMapper).updateById(any(WorkflowInstance.class));
    }

    @Test
    void approve_shouldDenyAndWriteAudit() {
        service = new WorkflowProcessService(
                configMapper,
                nodeMapper,
                instanceMapper,
                recordMapper,
                permissionFacade,
                permissionAuditLogService
        );
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(8L, "approver", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("11");
        when(instanceMapper.selectById(2L)).thenReturn(runningInstance(2L, 30L));
        when(nodeMapper.selectById(30L)).thenReturn(runningNode(30L, null));
        when(permissionFacade.checkWorkflowAction("default", "11", PermissionFacade.ACTION_APPROVE)).thenReturn(
                PermissionEngine.PermissionDecision.deny(
                        PermissionFacade.ACTION_APPROVE,
                        "命中拒绝策略",
                        PermissionReasonCode.DENY_MATCHED_POLICY.code(),
                        List.of(601L)
                )
        );

        assertThatThrownBy(() -> service.approve(2L, "8", "审批人", "拒绝"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("无权审批当前流程");

        ArgumentCaptor<PermissionAuditLog> auditCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(auditCaptor.capture());
        PermissionAuditLog auditLog = auditCaptor.getValue();
        assertThat(auditLog.getAllowed()).isEqualTo(0);
        assertThat(auditLog.getReasonCode()).isEqualTo(PermissionReasonCode.DENY_MATCHED_POLICY.code());
        assertThat(auditLog.getMatchedPolicyIds()).isEqualTo("601");
        verify(recordMapper, never()).insert(any(WorkflowRecord.class));
    }

    @Test
    void reject_shouldAllowAndWriteAudit() {
        service = new WorkflowProcessService(
                configMapper,
                nodeMapper,
                instanceMapper,
                recordMapper,
                permissionFacade,
                permissionAuditLogService
        );
        AuthSubjectContext.set(new AuthSubjectContext.AuthSubject(9L, "approver", "token"));
        TenantContext.setCurrentTenantId("default");
        SpaceContext.setCurrentSpaceId("12");
        WorkflowNode node = runningNode(40L, null);
        node.setRejectStrategy("END");
        when(instanceMapper.selectById(3L)).thenReturn(runningInstance(3L, 40L));
        when(nodeMapper.selectById(40L)).thenReturn(node);
        when(permissionFacade.checkWorkflowAction("default", "12", PermissionFacade.ACTION_REJECT)).thenReturn(
                PermissionEngine.PermissionDecision.allow(
                        PermissionEngine.PermissionTarget.page("workflow_approval_page"),
                        PermissionFacade.ACTION_REJECT,
                        PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                        List.of(701L)
                )
        );

        service.reject(3L, "9", "审批人", "驳回");

        ArgumentCaptor<PermissionAuditLog> auditCaptor = ArgumentCaptor.forClass(PermissionAuditLog.class);
        verify(permissionAuditLogMapper).insert(auditCaptor.capture());
        assertThat(auditCaptor.getValue().getAllowed()).isEqualTo(1);
        assertThat(auditCaptor.getValue().getMatchedPolicyIds()).isEqualTo("701");
        assertThat(auditCaptor.getValue().getAction()).isEqualTo(PermissionFacade.ACTION_REJECT);
        verify(recordMapper).insert(any(WorkflowRecord.class));
        verify(instanceMapper).updateById(any(WorkflowInstance.class));
    }

    private WorkflowInstance runningInstance(Long id, Long nodeId) {
        WorkflowInstance instance = new WorkflowInstance();
        instance.setId(id);
        instance.setStatus("running");
        instance.setCurrentNodeId(nodeId);
        instance.setWorkflowId(1L);
        return instance;
    }

    private WorkflowNode runningNode(Long id, Long nextNodeId) {
        WorkflowNode node = new WorkflowNode();
        node.setId(id);
        node.setWorkflowId(1L);
        node.setNodeName("审批节点");
        node.setApprovalMode("OR");
        node.setApproverIds("[\"7\"]");
        node.setNodeOrder(nextNodeId == null ? 2 : 1);
        if (nextNodeId != null) {
            node.setRejectNodeId(nextNodeId);
        }
        return node;
    }
}

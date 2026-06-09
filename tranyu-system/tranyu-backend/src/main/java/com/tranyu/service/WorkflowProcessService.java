package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tranyu.entity.WorkflowConfig;
import com.tranyu.entity.WorkflowInstance;
import com.tranyu.entity.WorkflowNode;
import com.tranyu.entity.WorkflowRecord;
import com.tranyu.mapper.WorkflowConfigMapper;
import com.tranyu.mapper.WorkflowInstanceMapper;
import com.tranyu.mapper.WorkflowNodeMapper;
import com.tranyu.mapper.WorkflowRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 流程任务管理：发起审批、审批操作、流程流转、失败处理、轨迹查询
 */
@Service
@RequiredArgsConstructor
public class WorkflowProcessService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final WorkflowConfigMapper configMapper;
    private final WorkflowNodeMapper nodeMapper;
    private final WorkflowInstanceMapper instanceMapper;
    private final WorkflowRecordMapper recordMapper;
    private final PermissionFacade permissionFacade;
    private final PermissionAuditLogService permissionAuditLogService;

    /** 发起审批 */
    @Transactional(rollbackFor = Exception.class)
    public WorkflowInstance startProcess(Long workflowId, String bizType, Long bizId, String bizTitle,
                                         String initiatorId, String initiatorName) {
        WorkflowConfig config = configMapper.selectById(workflowId);
        if (config == null || config.getEnabled() == null || config.getEnabled() != 1) {
            throw new IllegalArgumentException("工作流不存在或未启用");
        }
        List<WorkflowNode> nodes = nodeMapper.selectList(
            new LambdaQueryWrapper<WorkflowNode>()
                .eq(WorkflowNode::getWorkflowId, workflowId)
                .orderByAsc(WorkflowNode::getNodeOrder)
        );
        if (nodes.isEmpty()) {
            throw new IllegalArgumentException("工作流无节点配置");
        }
        WorkflowInstance inst = new WorkflowInstance();
        inst.setWorkflowId(workflowId);
        inst.setBizType(bizType);
        inst.setBizId(bizId);
        inst.setBizTitle(bizTitle);
        inst.setStatus("running");
        inst.setCurrentNodeId(nodes.get(0).getId());
        inst.setInitiatorId(initiatorId);
        inst.setInitiatorName(initiatorName);
        instanceMapper.insert(inst);
        return inst;
    }

    /** 审批通过：或签时一人通过即进入下一节点；会签时需当前节点所有人通过才进入下一节点 */
    @Transactional(rollbackFor = Exception.class)
    public void approve(Long instanceId, String approverId, String approverName, String comment) {
        WorkflowInstance inst = instanceMapper.selectById(instanceId);
        if (inst == null || !"running".equals(inst.getStatus())) {
            throw new IllegalArgumentException("流程不存在或已结束");
        }
        WorkflowNode node = nodeMapper.selectById(inst.getCurrentNodeId());
        if (node == null) {
            throw new IllegalArgumentException("当前节点不存在");
        }
        assertApprovalAuthorized(inst, PermissionFacade.ACTION_APPROVE, "无权审批当前流程");
        // 记录审批
        WorkflowRecord record = new WorkflowRecord();
        record.setInstanceId(instanceId);
        record.setNodeId(node.getId());
        record.setNodeName(node.getNodeName());
        record.setApproverId(approverId);
        record.setApproverName(approverName);
        record.setAction("approve");
        record.setComment(comment);
        recordMapper.insert(record);

        List<String> approverIds = parseApproverIds(node.getApproverIds());
        String mode = node.getApprovalMode();
        // 兼容旧值 or_sign / and_sign，新的常量为 OR / SIGN_ALL
        boolean orSign = mode == null
                || "OR".equalsIgnoreCase(mode)
                || "or_sign".equalsIgnoreCase(mode);
        if (orSign) {
            // 或签：一人通过即下一节点
            moveToNextNode(inst, node);
        } else {
            // 会签：统计当前节点已通过人数
            long approvedCount = recordMapper.selectCount(
                new LambdaQueryWrapper<WorkflowRecord>()
                    .eq(WorkflowRecord::getInstanceId, instanceId)
                    .eq(WorkflowRecord::getNodeId, node.getId())
                    .eq(WorkflowRecord::getAction, "approve")
            );
            if (approvedCount >= (approverIds.isEmpty() ? 1 : approverIds.size())) {
                moveToNextNode(inst, node);
            }
        }
    }

    /** 驳回：根据节点驳回策略处理（END/BACK_TO_SUBMITTER/BACK_TO_NODE） */
    @Transactional(rollbackFor = Exception.class)
    public void reject(Long instanceId, String approverId, String approverName, String comment) {
        WorkflowInstance inst = instanceMapper.selectById(instanceId);
        if (inst == null || !"running".equals(inst.getStatus())) {
            throw new IllegalArgumentException("流程不存在或已结束");
        }
        WorkflowNode node = nodeMapper.selectById(inst.getCurrentNodeId());
        if (node == null) {
            throw new IllegalArgumentException("当前节点不存在");
        }
        assertApprovalAuthorized(inst, PermissionFacade.ACTION_REJECT, "无权驳回当前流程");
        WorkflowRecord record = new WorkflowRecord();
        record.setInstanceId(instanceId);
        record.setNodeId(node.getId());
        record.setNodeName(node.getNodeName());
        record.setApproverId(approverId);
        record.setApproverName(approverName);
        record.setAction("reject");
        record.setComment(comment);
        recordMapper.insert(record);

        String strategy = node.getRejectStrategy();
        if ("BACK_TO_SUBMITTER".equalsIgnoreCase(strategy) || "BACK_TO_NODE".equalsIgnoreCase(strategy)) {
            List<WorkflowNode> nodes = nodeMapper.selectList(
                new LambdaQueryWrapper<WorkflowNode>()
                    .eq(WorkflowNode::getWorkflowId, inst.getWorkflowId())
                    .orderByAsc(WorkflowNode::getNodeOrder)
            );
            if (!nodes.isEmpty()) {
                Long targetNodeId = null;
                if ("BACK_TO_SUBMITTER".equalsIgnoreCase(strategy)) {
                    // 默认认为第一个节点为提交人节点
                    targetNodeId = nodes.get(0).getId();
                } else if ("BACK_TO_NODE".equalsIgnoreCase(strategy)) {
                    targetNodeId = node.getRejectNodeId() != null ? node.getRejectNodeId() : nodes.get(0).getId();
                }
                if (targetNodeId != null) {
                    inst.setCurrentNodeId(targetNodeId);
                    instanceMapper.updateById(inst);
                    return;
                }
            }
        }
        // 默认：结束流程
        inst.setStatus("rejected");
        inst.setCurrentNodeId(null);
        instanceMapper.updateById(inst);
    }

    private void moveToNextNode(WorkflowInstance inst, WorkflowNode currentNode) {
        List<WorkflowNode> nodes = nodeMapper.selectList(
            new LambdaQueryWrapper<WorkflowNode>()
                .eq(WorkflowNode::getWorkflowId, inst.getWorkflowId())
                .orderByAsc(WorkflowNode::getNodeOrder)
        );
        int idx = -1;
        for (int i = 0; i < nodes.size(); i++) {
            if (nodes.get(i).getId().equals(currentNode.getId())) { idx = i; break; }
        }
        if (idx >= 0 && idx < nodes.size() - 1) {
            inst.setCurrentNodeId(nodes.get(idx + 1).getId());
            instanceMapper.updateById(inst);
        } else {
            inst.setStatus("completed");
            inst.setCurrentNodeId(null);
            instanceMapper.updateById(inst);
        }
    }

    private void assertApprovalAuthorized(WorkflowInstance inst, String action, String denyMessage) {
        String tenantId = com.tranyu.context.TenantContext.getCurrentTenantIdOrDefault();
        String currentSpaceId = com.tranyu.context.SpaceContext.getCurrentSpaceId();
        String normalizedSpaceId = (currentSpaceId == null || currentSpaceId.isBlank()) ? "0" : currentSpaceId.trim();
        Long userId = resolveCurrentUserId();
        PermissionEngine.PermissionDecision decision = permissionFacade.checkWorkflowAction(tenantId, normalizedSpaceId, action);
        PermissionEngine.PermissionTarget auditTarget = resolveAuditTarget(decision);
        permissionAuditLogService.logDecision(
                userId,
                tenantId,
                safeParseLong(normalizedSpaceId),
                auditTarget.getResourceType(),
                auditTarget.getResourceCode(),
                PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL,
                String.valueOf(inst.getId()),
                null,
                action,
                decision
        );
        if (!decision.isAllowed()) {
            throw new IllegalArgumentException(denyMessage);
        }
    }

    private PermissionEngine.PermissionTarget resolveAuditTarget(PermissionEngine.PermissionDecision decision) {
        if (decision != null && decision.getMatchedTarget() != null) {
            return decision.getMatchedTarget();
        }
        return PermissionFacade.WORKFLOW_APPROVAL_TARGETS.get(0);
    }

    private Long resolveCurrentUserId() {
        Long currentUserId = com.tranyu.context.AuthSubjectContext.getCurrentUserId();
        return currentUserId == null ? 0L : currentUserId;
    }

    private Long safeParseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }

    private static List<String> parseApproverIds(String raw) {
        if (raw == null || raw.isBlank()) return new ArrayList<>();
        String s = raw.trim();
        // 优先兼容旧版 JSON 数组格式，如 ["1","2"]
        if (s.startsWith("[")) {
            try {
                List<Object> list = JSON.readValue(s, new TypeReference<List<Object>>() {});
                return list.stream().map(String::valueOf).collect(Collectors.toList());
            } catch (Exception ignored) {
                // fall through to comma-split
            }
        }
        // 新版：逗号/分号分隔的 ID 串
        return Arrays.stream(s.split("[,;]"))
                .map(String::trim)
                .filter(str -> !str.isEmpty())
                .collect(Collectors.toList());
    }

    /** 待我审批：当前节点审批人包含 approverId 且状态 running */
    public List<WorkflowInstance> listMyPendingTasks(String approverId) {
        List<WorkflowInstance> running = instanceMapper.selectList(
            new LambdaQueryWrapper<WorkflowInstance>().eq(WorkflowInstance::getStatus, "running")
        );
        List<WorkflowInstance> result = new ArrayList<>();
        for (WorkflowInstance inst : running) {
            if (inst.getCurrentNodeId() == null) continue;
            WorkflowNode node = nodeMapper.selectById(inst.getCurrentNodeId());
            if (node == null) continue;
            List<String> ids = parseApproverIds(node.getApproverIds());
            if (ids.isEmpty() || ids.contains(approverId)) {
                result.add(inst);
            }
        }
        return result;
    }

    /** 流程列表：按状态筛选 */
    public List<WorkflowInstance> listInstances(String status, String initiatorId) {
        LambdaQueryWrapper<WorkflowInstance> q = new LambdaQueryWrapper<>();
        if (status != null && !status.isBlank()) {
            q.eq(WorkflowInstance::getStatus, status);
        }
        if (initiatorId != null && !initiatorId.isBlank()) {
            q.eq(WorkflowInstance::getInitiatorId, initiatorId);
        }
        q.orderByDesc(WorkflowInstance::getCreatedAt);
        return instanceMapper.selectList(q);
    }

    /** 实例详情 + 审批轨迹（记录按时间排序） */
    public WorkflowInstance getInstanceDetail(Long instanceId) {
        WorkflowInstance inst = instanceMapper.selectById(instanceId);
        if (inst == null) return null;
        List<WorkflowRecord> records = recordMapper.selectList(
            new LambdaQueryWrapper<WorkflowRecord>()
                .eq(WorkflowRecord::getInstanceId, instanceId)
                .orderByAsc(WorkflowRecord::getCreatedAt)
        );
        inst.setRecords(records);
        return inst;
    }
}

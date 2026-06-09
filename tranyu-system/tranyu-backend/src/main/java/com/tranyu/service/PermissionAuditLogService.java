package com.tranyu.service;

import com.tranyu.entity.PermissionAuditLog;
import com.tranyu.mapper.PermissionAuditLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 持久化权限解释，供审计与问题排查使用。
 */
@Service
@RequiredArgsConstructor
public class PermissionAuditLogService {

    private final PermissionAuditLogMapper permissionAuditLogMapper;

    public void logDecision(Long userId,
                            String tenantId,
                            Long spaceId,
                            String resourceType,
                            String resourceId,
                            String resourceGroup,
                            String processInstanceId,
                            String taskId,
                            String action,
                            PermissionEngine.PermissionDecision decision) {
        PermissionAuditLog log = new PermissionAuditLog();
        String normalizedAction = ApprovalAction.normalizeCode(action);
        log.setUserId(userId);
        log.setTenantId(tenantId);
        log.setSpaceId(spaceId);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setResourceGroup(resourceGroup);
        log.setProcessInstanceId(processInstanceId);
        log.setTaskId(taskId);
        log.setAction(normalizedAction);
        log.setAllowed(decision != null && decision.isAllowed() ? 1 : 0);
        log.setReasonCode(PermissionReasonCode.normalizeCode(decision == null ? PermissionReasonCode.DEFAULT_DENY.code() : decision.getReasonCode()));
        log.setMatchedPolicyIds(joinPolicyIds(decision == null ? List.of() : decision.getMatchedPolicyIds()));
        log.setCreator("system");
        log.setUpdater("system");
        permissionAuditLogMapper.insert(log);
    }

    private String joinPolicyIds(List<Long> matchedPolicyIds) {
        if (matchedPolicyIds == null || matchedPolicyIds.isEmpty()) {
            return "";
        }
        return matchedPolicyIds.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }
}

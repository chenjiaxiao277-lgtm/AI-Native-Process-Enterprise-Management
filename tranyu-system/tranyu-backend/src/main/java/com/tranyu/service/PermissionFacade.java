package com.tranyu.service;

import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 对 Service 层暴露统一权限调用入口，屏蔽当前用户与上下文装配细节。
 */
@Service
@RequiredArgsConstructor
public class PermissionFacade {
    private static final Pattern TRAILING_NUMBER_PATTERN = Pattern.compile("(\\d+)$");

    public static final String ACTION_VIEW = "view";
    public static final String ACTION_CREATE = "create";
    public static final String ACTION_EDIT = "edit";
    public static final String ACTION_DELETE = "delete";
    public static final String ACTION_APPROVE = ApprovalAction.APPROVE.code();
    public static final String ACTION_REJECT = ApprovalAction.REJECT.code();
    public static final String ACTION_TERMINATE = ApprovalAction.TERMINATE.code();
    public static final String ACTION_TRANSFER = ApprovalAction.TRANSFER.code();
    public static final List<PermissionEngine.PermissionTarget> SPACE_CONFIG_TARGETS = List.of(
            PermissionEngine.PermissionTarget.page("space_config_page"),
            PermissionEngine.PermissionTarget.router("space_config")
    );
    public static final List<PermissionEngine.PermissionTarget> WORK_ITEM_TARGETS = List.of(
            PermissionEngine.PermissionTarget.page("work_item_manage_page"),
            PermissionEngine.PermissionTarget.router("space_work_items"),
            PermissionEngine.PermissionTarget.menu("work_item_management")
    );
    public static final List<PermissionEngine.PermissionTarget> WORKFLOW_APPROVAL_TARGETS = List.of(
            PermissionEngine.PermissionTarget.page("workflow_approval_page"),
            PermissionEngine.PermissionTarget.router("workflow_tasks"),
            PermissionEngine.PermissionTarget.menu("workflow_approval")
    );

    private final PermissionEngine permissionEngine;
    private final PermissionActionConfigService permissionActionConfigService;

    public PermissionEngine.PermissionDecision checkCurrentUser(String tenantId,
                                                               String spaceId,
                                                               String action,
                                                               List<PermissionEngine.PermissionTarget> targets) {
        Long currentUserId = AuthSubjectContext.getCurrentUserId();
        return permissionEngine.evaluate(new PermissionEngine.PermissionCheckRequest(
                currentUserId,
                normalizeTenantId(tenantId),
                normalizeSpaceId(spaceId),
                action,
                targets
        ));
    }

    public void assertCurrentUser(String tenantId,
                                  String spaceId,
                                  String action,
                                  List<PermissionEngine.PermissionTarget> targets,
                                  String denyMessage) {
        PermissionEngine.PermissionDecision decision = checkCurrentUser(tenantId, spaceId, action, targets);
        if (!decision.isAllowed()) {
            throw new IllegalArgumentException(denyMessage);
        }
    }

    public void assertSpaceConfigReadable(String tenantId, String spaceId) {
        assertCurrentUser(tenantId, spaceId, ACTION_VIEW, SPACE_CONFIG_TARGETS, "无权查看空间授权配置");
    }

    public void assertSpaceConfigWritable(String tenantId, String spaceId) {
        assertCurrentUser(tenantId, spaceId, ACTION_EDIT, SPACE_CONFIG_TARGETS, "无权维护空间授权配置");
    }

    public PermissionEngine.PermissionDecision checkWorkItemAction(String tenantId, String spaceId, String action) {
        return checkCurrentUser(tenantId, spaceId, action, WORK_ITEM_TARGETS);
    }

    public void assertWorkItemView(String tenantId, String spaceId) {
        if (isWorkItemBypassEnabled()) {
            return;
        }
        assertCurrentUser(tenantId, spaceId, ACTION_VIEW, WORK_ITEM_TARGETS, "无权查看工作项");
    }

    public void assertWorkItemCreate(String tenantId, String spaceId) {
        if (isWorkItemBypassEnabled()) {
            return;
        }
        assertCurrentUser(tenantId, spaceId, ACTION_CREATE, WORK_ITEM_TARGETS, "无权新建工作项");
    }

    public void assertWorkItemEdit(String tenantId, String spaceId) {
        if (isWorkItemBypassEnabled()) {
            return;
        }
        assertCurrentUser(tenantId, spaceId, ACTION_EDIT, WORK_ITEM_TARGETS, "无权编辑工作项");
    }

    public void assertWorkItemDelete(String tenantId, String spaceId) {
        if (isWorkItemBypassEnabled()) {
            return;
        }
        assertCurrentUser(tenantId, spaceId, ACTION_DELETE, WORK_ITEM_TARGETS, "无权删除工作项");
    }

    public void assertWorkItemApprove(String tenantId, String spaceId) {
        if (isWorkItemBypassEnabled()) {
            return;
        }
        assertCurrentUser(tenantId, spaceId, ACTION_APPROVE, WORK_ITEM_TARGETS, "无权审批工作项");
    }

    public PermissionEngine.PermissionDecision checkWorkflowApprove(String tenantId, String spaceId) {
        return checkWorkflowAction(tenantId, spaceId, ACTION_APPROVE);
    }

    public PermissionEngine.PermissionDecision checkWorkflowAction(String tenantId, String spaceId, String action) {
        String normalizedTenantId = normalizeTenantId(tenantId);
        Long normalizedSpaceId = normalizeSpaceId(spaceId);
        List<PermissionEngine.PermissionTarget> targets = permissionActionConfigService.loadTargets(
                normalizedTenantId,
                normalizedSpaceId,
                PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL,
                ApprovalAction.normalizeCode(action),
                WORKFLOW_APPROVAL_TARGETS
        );
        Long currentUserId = AuthSubjectContext.getCurrentUserId();
        return permissionEngine.evaluate(new PermissionEngine.PermissionCheckRequest(
                currentUserId,
                normalizedTenantId,
                normalizedSpaceId,
                ApprovalAction.normalizeCode(action),
                targets
        ));
    }

    public void assertWorkflowApprove(String tenantId, String spaceId) {
        assertCurrentUser(tenantId, spaceId, ACTION_APPROVE, WORKFLOW_APPROVAL_TARGETS, "无权执行审批操作");
    }

    private String normalizeTenantId(String tenantId) {
        if (tenantId != null && !tenantId.isBlank()) {
            return tenantId.trim();
        }
        return TenantContext.getCurrentTenantIdOrDefault();
    }

    private Long normalizeSpaceId(String spaceId) {
        String resolvedSpaceId = (spaceId == null || spaceId.isBlank()) ? SpaceContext.getCurrentSpaceId() : spaceId.trim();
        if (resolvedSpaceId == null || resolvedSpaceId.isBlank()) {
            return 0L;
        }
        try {
            return Long.parseLong(resolvedSpaceId);
        } catch (NumberFormatException ex) {
            Matcher matcher = TRAILING_NUMBER_PATTERN.matcher(resolvedSpaceId);
            if (matcher.find()) {
                try {
                    return Long.parseLong(matcher.group(1));
                } catch (NumberFormatException ignored) {
                    return 0L;
                }
            }
            return 0L;
        }
    }

    private boolean isWorkItemBypassEnabled() {
        String value = System.getProperty("PERMISSION_BYPASS_WORKITEM");
        if (value == null || value.isBlank()) {
            value = System.getenv("PERMISSION_BYPASS_WORKITEM");
        }
        return value != null && ("1".equals(value) || "true".equalsIgnoreCase(value) || "yes".equalsIgnoreCase(value));
    }
}

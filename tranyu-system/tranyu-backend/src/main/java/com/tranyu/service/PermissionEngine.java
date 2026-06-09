package com.tranyu.service;

import com.tranyu.entity.PermissionPolicy;
import com.tranyu.ai.crud.common.exception.PermissionDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionEngine {

    private final TenantAccessService tenantAccessService;
    private final SpaceAccessService spaceAccessService;
    private final PermissionSubjectResolver subjectResolver;
    private final PermissionPolicyQueryService policyQueryService;
    private final SysRoleService sysRoleService;

    public PermissionDecision check(com.tranyu.service.PermissionCheckRequest request) {
        if (request == null) {
            return new PermissionDecision(false, "INVALID_REQUEST", List.of());
        }
        Long userId = request.getUserId();
        String tenantId = request.getTenantId();
        String spaceId = request.getSpaceId();

        if (!tenantAccessService.canAccessTenant(userId, tenantId)) {
            return new PermissionDecision(false, "INVALID_TENANT", List.of());
        }

        if (sysRoleService.isPlatformAdmin(userId)
                && "tenant".equalsIgnoreCase(request.getResourceType())) {
            return new PermissionDecision(true, "PLATFORM_ADMIN", List.of());
        }

        if (spaceId != null && !spaceId.isBlank()) {
            boolean allowedBySpace = isManageAction(request.getAction())
                    ? spaceAccessService.canManageSpace(userId, tenantId, spaceId)
                    : spaceAccessService.canAccessSpace(userId, tenantId, spaceId);
            if (!allowedBySpace) {
                return new PermissionDecision(false, "INVALID_SPACE", List.of());
            }
        }

        if (isManageAction(request.getAction()) && isTenantManageScope(request.getResourceType())) {
            if (!tenantAccessService.canManageTenant(userId, tenantId)) {
                return new PermissionDecision(false, "TENANT_ADMIN_EXPIRED", List.of());
            }
        }

        Set<PermissionSubject> subjects = subjectResolver.resolveSubjects(userId, tenantId, spaceId);
        List<PermissionPolicy> policies = policyQueryService.listMatchedPolicies(
                subjects,
                tenantId,
                spaceId,
                request.getResourceType(),
                request.getAction(),
                request.getResourceKey()
        );
        if (policies.isEmpty()) {
            return new PermissionDecision(false, "NO_POLICY", List.of());
        }

        boolean hasDeny = policies.stream().anyMatch(p -> "DENY".equalsIgnoreCase(p.getEffect()));
        List<Long> policyIds = policies.stream().map(PermissionPolicy::getId).collect(Collectors.toList());
        if (hasDeny) {
            return new PermissionDecision(false, "DENY_BY_POLICY", policyIds);
        }
        return new PermissionDecision(true, "ALLOW", policyIds);
    }

    public void checkOrThrow(com.tranyu.service.PermissionCheckRequest request) {
        PermissionDecision decision = check(request);
        if (!decision.isAllowed()) {
            throw new PermissionDeniedException("权限不足：" + decision.getReason());
        }
    }

    /**
     * 兼容旧的路由/菜单权限调用入口（PermissionFacade 使用）
     */
    public PermissionDecision evaluate(PermissionCheckRequest request) {
        if (request == null) {
            return new PermissionDecision(false, "INVALID_REQUEST", List.of());
        }
        List<PermissionTarget> targets = request.getTargets();
        if (targets == null || targets.isEmpty()) {
            return new PermissionDecision(false, "NO_TARGET", List.of());
        }
        PermissionDecision lastDeny = null;
        for (PermissionTarget target : targets) {
            com.tranyu.service.PermissionCheckRequest bridge = new com.tranyu.service.PermissionCheckRequest();
            bridge.setUserId(request.getUserId());
            bridge.setTenantId(request.getTenantId());
            bridge.setSpaceId(normalizeSpaceId(request.getSpaceId()));
            bridge.setResourceType(target.getResourceType());
            bridge.setResourceKey(target.getResourceCode());
            bridge.setAction(request.getAction());
            PermissionDecision decision = check(bridge);
            if (decision.isAllowed()) {
                decision.setMatchedTarget(target);
                return decision;
            }
            lastDeny = decision;
        }
        PermissionDecision denied = lastDeny == null ? new PermissionDecision(false, "NO_POLICY", List.of()) : lastDeny;
        denied.setMatchedTarget(targets.get(0));
        return denied;
    }

    private boolean isManageAction(String action) {
        if (action == null) {
            return false;
        }
        return switch (action.toLowerCase()) {
            case "manage", "create", "edit", "delete", "enable", "disable" -> true;
            default -> false;
        };
    }

    private boolean isTenantManageScope(String resourceType) {
        if (resourceType == null) {
            return false;
        }
        return switch (resourceType.toLowerCase()) {
            case "tenant",
                 "user",
                 "space",
                 "permission",
                 "space_member",
                 "space_group",
                 "space_role",
                 "space_relation_auth" -> true;
            default -> false;
        };
    }

    private String normalizeSpaceId(Long spaceId) {
        if (spaceId == null || spaceId <= 0) {
            return null;
        }
        return String.valueOf(spaceId);
    }

    /**
     * 兼容旧版调用结构：路由/菜单/页面目标
     */
    public static class PermissionTarget {
        private final String resourceType;
        private final String resourceCode;

        public PermissionTarget(String resourceType, String resourceCode) {
            this.resourceType = resourceType;
            this.resourceCode = resourceCode;
        }

        public String getResourceType() {
            return resourceType;
        }

        public String getResourceCode() {
            return resourceCode;
        }

        public static PermissionTarget menu(String code) {
            return new PermissionTarget("menu", code);
        }

        public static PermissionTarget page(String code) {
            return new PermissionTarget("page", code);
        }

        public static PermissionTarget router(String code) {
            return new PermissionTarget("router", code);
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PermissionTarget)) return false;
            PermissionTarget that = (PermissionTarget) o;
            return resourceType.equals(that.resourceType) && resourceCode.equals(that.resourceCode);
        }

        @Override
        public int hashCode() {
            return (resourceType + ":" + resourceCode).hashCode();
        }
    }

    /**
     * 兼容旧版调用结构：权限检查请求
     */
    public static class PermissionCheckRequest {
        private final Long userId;
        private final String tenantId;
        private final Long spaceId;
        private final String action;
        private final List<PermissionTarget> targets;

        public PermissionCheckRequest(Long userId, String tenantId, Long spaceId, String action, List<PermissionTarget> targets) {
            this.userId = userId;
            this.tenantId = tenantId;
            this.spaceId = spaceId;
            this.action = action;
            this.targets = targets;
        }

        public Long getUserId() {
            return userId;
        }

        public String getTenantId() {
            return tenantId;
        }

        public Long getSpaceId() {
            return spaceId;
        }

        public String getAction() {
            return action;
        }

        public List<PermissionTarget> getTargets() {
            return targets;
        }
    }

    /**
     * 兼容旧版调用结构：权限决策结果
     */
    public static class PermissionDecision extends com.tranyu.service.PermissionDecision {
        private PermissionTarget matchedTarget;

        public PermissionDecision(boolean allowed, String reason, List<Long> matchedPolicyIds) {
            super(allowed, reason, matchedPolicyIds);
        }

        public PermissionTarget getMatchedTarget() {
            return matchedTarget;
        }

        public void setMatchedTarget(PermissionTarget matchedTarget) {
            this.matchedTarget = matchedTarget;
        }

        public String getReasonCode() {
            return getReason();
        }
    }
}

package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.tranyu.entity.PermissionMenu;
import com.tranyu.entity.PermissionPage;
import com.tranyu.entity.PermissionRoleResource;
import com.tranyu.entity.PermissionRouter;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.PermissionMenuMapper;
import com.tranyu.mapper.PermissionPageMapper;
import com.tranyu.mapper.PermissionRoleResourceMapper;
import com.tranyu.mapper.PermissionRouterMapper;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;

/**
 * 权限只读查询服务：按“用户 -> 角色 -> 资源”聚合菜单/路由/页面摘要。
 */
@Service
@RequiredArgsConstructor
public class PermissionQueryService {

    private static final long TENANT_LEVEL_SPACE_ID = 0L;
    private static final String RESOURCE_TYPE_MENU = "menu";
    private static final String RESOURCE_TYPE_ROUTER = "router";
    private static final String RESOURCE_TYPE_PAGE = "page";
    private static final String EFFECT_ALLOW = "allow";
    private static final String EFFECT_DENY = "deny";

    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final PermissionRoleResourceMapper permissionRoleResourceMapper;
    private final PermissionMenuMapper permissionMenuMapper;
    private final PermissionRouterMapper permissionRouterMapper;
    private final PermissionPageMapper permissionPageMapper;

    public PermissionResourceSummary queryCurrentUserSummary(Long userId) {
        return queryUserSummary(userId, TenantContext.getCurrentTenantIdOrDefault(), resolveCurrentSpaceId());
    }

    public PermissionResourceSummary queryUserSummary(Long userId, String tenantId, Long spaceId) {
        if (userId == null) {
            return PermissionResourceSummary.empty(normalizeTenantId(tenantId), normalizeSpaceId(spaceId));
        }

        String resolvedTenantId = normalizeTenantId(tenantId);
        long resolvedSpaceId = normalizeSpaceId(spaceId);
        List<SysRole> roles = listEnabledRolesByUserId(userId);
        if (roles.isEmpty()) {
            return PermissionResourceSummary.empty(resolvedTenantId, resolvedSpaceId);
        }

        List<Long> roleIds = roles.stream().map(SysRole::getId).filter(Objects::nonNull).toList();
        if (roleIds.isEmpty()) {
            return PermissionResourceSummary.empty(resolvedTenantId, resolvedSpaceId);
        }

        List<PermissionRoleResource> bindings = permissionRoleResourceMapper.selectList(
                new LambdaQueryWrapper<PermissionRoleResource>()
                        .eq(PermissionRoleResource::getTenantId, resolvedTenantId)
                        .in(PermissionRoleResource::getSpaceId, resolveVisibleSpaceIds(resolvedSpaceId))
                        .in(PermissionRoleResource::getRoleId, roleIds)
                        .eq(PermissionRoleResource::getStatus, 1)
                        .eq(PermissionRoleResource::getDeleted, 0)
        );

        ResourceAccess menuAccess = resolveResourceAccess(bindings, RESOURCE_TYPE_MENU);
        ResourceAccess routerAccess = resolveResourceAccess(bindings, RESOURCE_TYPE_ROUTER);
        ResourceAccess pageAccess = resolveResourceAccess(bindings, RESOURCE_TYPE_PAGE);

        List<PermissionMenu> menus = listMenus(resolvedTenantId, resolvedSpaceId, menuAccess.allowedCodes());
        List<PermissionRouter> routers = listRouters(resolvedTenantId, resolvedSpaceId, routerAccess.allowedCodes());
        List<PermissionPage> pages = listPages(resolvedTenantId, resolvedSpaceId, pageAccess.allowedCodes());

        return new PermissionResourceSummary(
                resolvedTenantId,
                resolvedSpaceId,
                roles.stream().map(RoleSummary::from).toList(),
                ResourceBucket.fromMenus(menus),
                ResourceBucket.fromRouters(routers),
                ResourceBucket.fromPages(pages)
        );
    }

    public PermissionPolicySnapshot queryUserPolicySnapshot(Long userId, String tenantId, Long spaceId) {
        String resolvedTenantId = normalizeTenantId(tenantId);
        long resolvedSpaceId = normalizeSpaceId(spaceId);
        if (userId == null) {
            return PermissionPolicySnapshot.empty(resolvedTenantId, resolvedSpaceId);
        }

        List<SysRole> roles = listEnabledRolesByUserId(userId);
        if (roles.isEmpty()) {
            return PermissionPolicySnapshot.empty(resolvedTenantId, resolvedSpaceId);
        }

        List<Long> roleIds = roles.stream().map(SysRole::getId).filter(Objects::nonNull).toList();
        if (roleIds.isEmpty()) {
            return PermissionPolicySnapshot.empty(resolvedTenantId, resolvedSpaceId);
        }

        List<PermissionRoleResource> bindings = permissionRoleResourceMapper.selectList(
                new LambdaQueryWrapper<PermissionRoleResource>()
                        .eq(PermissionRoleResource::getTenantId, resolvedTenantId)
                        .in(PermissionRoleResource::getSpaceId, resolveVisibleSpaceIds(resolvedSpaceId))
                        .in(PermissionRoleResource::getRoleId, roleIds)
                        .eq(PermissionRoleResource::getStatus, 1)
                        .eq(PermissionRoleResource::getDeleted, 0)
        );

        Map<String, List<EffectivePolicy>> allowPolicies = new LinkedHashMap<>();
        Map<String, List<EffectivePolicy>> denyPolicies = new LinkedHashMap<>();
        for (PermissionRoleResource binding : bindings) {
            String resourceType = trimToEmpty(binding.getResourceType());
            String resourceCode = trimToEmpty(binding.getResourceCode());
            if (resourceType.isEmpty() || resourceCode.isEmpty()) {
                continue;
            }
            List<String> actions = expandActionScope(binding.getActionScope());
            if (actions.isEmpty()) {
                continue;
            }
            EffectivePolicy policy = EffectivePolicy.from(binding);
            for (String action : actions) {
                String key = policyKey(resourceType, resourceCode, action);
                if (EFFECT_DENY.equalsIgnoreCase(trimToEmpty(binding.getEffectType()))) {
                    denyPolicies.computeIfAbsent(key, ignored -> new ArrayList<>()).add(policy);
                } else if (EFFECT_ALLOW.equalsIgnoreCase(trimToEmpty(binding.getEffectType()))) {
                    allowPolicies.computeIfAbsent(key, ignored -> new ArrayList<>()).add(policy);
                }
            }
        }

        return new PermissionPolicySnapshot(
                resolvedTenantId,
                resolvedSpaceId,
                preferPolicies(allowPolicies, resolvedSpaceId),
                preferPolicies(denyPolicies, resolvedSpaceId)
        );
    }

    private List<SysRole> listEnabledRolesByUserId(Long userId) {
        List<Long> roleIds = userRoleMapper.selectList(
                        new LambdaQueryWrapper<SysUserRole>()
                                .eq(SysUserRole::getUserId, userId)
                ).stream()
                .map(SysUserRole::getRoleId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (roleIds.isEmpty()) {
            return List.of();
        }
        return roleMapper.selectBatchIds(roleIds).stream()
                .filter(Objects::nonNull)
                .filter(role -> Objects.equals(role.getDeleted(), 0))
                .filter(role -> Objects.equals(role.getStatus(), 1))
                .sorted(Comparator.comparing(SysRole::getSort, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(SysRole::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();
    }

    private ResourceAccess resolveResourceAccess(List<PermissionRoleResource> bindings, String resourceType) {
        if (bindings == null || bindings.isEmpty()) {
            return ResourceAccess.empty();
        }
        Set<String> allowCodes = new LinkedHashSet<>();
        Set<String> denyCodes = new LinkedHashSet<>();
        for (PermissionRoleResource binding : bindings) {
            if (!resourceType.equalsIgnoreCase(trimToEmpty(binding.getResourceType()))) {
                continue;
            }
            String code = trimToEmpty(binding.getResourceCode());
            if (code.isEmpty()) {
                continue;
            }
            String effectType = trimToEmpty(binding.getEffectType()).toLowerCase(Locale.ROOT);
            if (EFFECT_DENY.equals(effectType)) {
                denyCodes.add(code);
                allowCodes.remove(code);
                continue;
            }
            if (EFFECT_ALLOW.equals(effectType) && !denyCodes.contains(code)) {
                allowCodes.add(code);
            }
        }
        return new ResourceAccess(allowCodes, denyCodes);
    }

    private List<PermissionMenu> listMenus(String tenantId, long spaceId, Set<String> allowedCodes) {
        if (allowedCodes.isEmpty()) {
            return List.of();
        }
        List<PermissionMenu> records = permissionMenuMapper.selectList(
                new LambdaQueryWrapper<PermissionMenu>()
                        .eq(PermissionMenu::getTenantId, tenantId)
                        .in(PermissionMenu::getSpaceId, resolveVisibleSpaceIds(spaceId))
                        .in(PermissionMenu::getMenuCode, allowedCodes)
                        .eq(PermissionMenu::getStatus, 1)
                        .eq(PermissionMenu::getDeleted, 0)
        );
        return deduplicateByCode(records, PermissionMenu::getMenuCode, spaceId,
                Comparator.comparing(PermissionMenu::getSort, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(PermissionMenu::getId, Comparator.nullsLast(Long::compareTo)));
    }

    private List<PermissionRouter> listRouters(String tenantId, long spaceId, Set<String> allowedCodes) {
        if (allowedCodes.isEmpty()) {
            return List.of();
        }
        List<PermissionRouter> records = permissionRouterMapper.selectList(
                new LambdaQueryWrapper<PermissionRouter>()
                        .eq(PermissionRouter::getTenantId, tenantId)
                        .in(PermissionRouter::getSpaceId, resolveVisibleSpaceIds(spaceId))
                        .in(PermissionRouter::getRouterCode, allowedCodes)
                        .eq(PermissionRouter::getStatus, 1)
                        .eq(PermissionRouter::getDeleted, 0)
        );
        return deduplicateByCode(records, PermissionRouter::getRouterCode, spaceId,
                Comparator.comparing(PermissionRouter::getSort, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(PermissionRouter::getId, Comparator.nullsLast(Long::compareTo)));
    }

    private List<PermissionPage> listPages(String tenantId, long spaceId, Set<String> allowedCodes) {
        if (allowedCodes.isEmpty()) {
            return List.of();
        }
        List<PermissionPage> records = permissionPageMapper.selectList(
                new LambdaQueryWrapper<PermissionPage>()
                        .eq(PermissionPage::getTenantId, tenantId)
                        .in(PermissionPage::getSpaceId, resolveVisibleSpaceIds(spaceId))
                        .in(PermissionPage::getPageCode, allowedCodes)
                        .eq(PermissionPage::getStatus, 1)
                        .eq(PermissionPage::getDeleted, 0)
        );
        return deduplicateByCode(records, PermissionPage::getPageCode, spaceId,
                Comparator.comparing(PermissionPage::getPageName, Comparator.nullsLast(String::compareTo))
                        .thenComparing(PermissionPage::getId, Comparator.nullsLast(Long::compareTo)));
    }

    private <T> List<T> deduplicateByCode(List<T> records,
                                          Function<T, String> codeGetter,
                                          long currentSpaceId,
                                          Comparator<T> finalOrder) {
        Map<String, T> bestByCode = new LinkedHashMap<>();
        for (T record : records) {
            String code = trimToEmpty(codeGetter.apply(record));
            if (code.isEmpty()) {
                continue;
            }
            T existing = bestByCode.get(code);
            if (existing == null || prefer(record, existing, currentSpaceId)) {
                bestByCode.put(code, record);
            }
        }
        return bestByCode.values().stream().sorted(finalOrder).toList();
    }

    private boolean prefer(Object candidate, Object existing, long currentSpaceId) {
        long candidateSpaceId = extractSpaceId(candidate);
        long existingSpaceId = extractSpaceId(existing);
        return candidateSpaceId == currentSpaceId && existingSpaceId != currentSpaceId;
    }

    private long extractSpaceId(Object resource) {
        if (resource instanceof PermissionMenu menu) {
            return menu.getSpaceId() == null ? TENANT_LEVEL_SPACE_ID : menu.getSpaceId();
        }
        if (resource instanceof PermissionRouter router) {
            return router.getSpaceId() == null ? TENANT_LEVEL_SPACE_ID : router.getSpaceId();
        }
        if (resource instanceof PermissionPage page) {
            return page.getSpaceId() == null ? TENANT_LEVEL_SPACE_ID : page.getSpaceId();
        }
        return TENANT_LEVEL_SPACE_ID;
    }

    private List<Long> resolveVisibleSpaceIds(long spaceId) {
        if (spaceId <= TENANT_LEVEL_SPACE_ID) {
            return List.of(TENANT_LEVEL_SPACE_ID);
        }
        return List.of(TENANT_LEVEL_SPACE_ID, spaceId);
    }

    private long resolveCurrentSpaceId() {
        String currentSpaceId = SpaceContext.getCurrentSpaceId();
        if (currentSpaceId == null || currentSpaceId.isBlank()) {
            return TENANT_LEVEL_SPACE_ID;
        }
        try {
            return Long.parseLong(currentSpaceId.trim());
        } catch (NumberFormatException ex) {
            return TENANT_LEVEL_SPACE_ID;
        }
    }

    private String normalizeTenantId(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return TenantContext.DEFAULT_TENANT_ID;
        }
        return tenantId.trim();
    }

    private long normalizeSpaceId(Long spaceId) {
        return spaceId == null || spaceId < TENANT_LEVEL_SPACE_ID ? TENANT_LEVEL_SPACE_ID : spaceId;
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private Map<String, List<EffectivePolicy>> preferPolicies(Map<String, List<EffectivePolicy>> rawPolicies, long currentSpaceId) {
        Map<String, List<EffectivePolicy>> preferredPolicies = new LinkedHashMap<>();
        for (Map.Entry<String, List<EffectivePolicy>> entry : rawPolicies.entrySet()) {
            List<EffectivePolicy> policies = entry.getValue();
            if (policies == null || policies.isEmpty()) {
                continue;
            }
            boolean hasCurrentSpacePolicy = policies.stream().anyMatch(policy -> policy.getSpaceId() == currentSpaceId);
            List<EffectivePolicy> selected = hasCurrentSpacePolicy
                    ? policies.stream().filter(policy -> policy.getSpaceId() == currentSpaceId).toList()
                    : List.copyOf(policies);
            preferredPolicies.put(entry.getKey(), selected);
        }
        return preferredPolicies;
    }

    private List<String> expandActionScope(String actionScope) {
        String normalizedScope = trimToEmpty(actionScope);
        if (normalizedScope.isEmpty() || "*".equals(normalizedScope)) {
            return List.of("*");
        }
        return List.of(normalizedScope.split(",")).stream()
                .map(this::trimToEmpty)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private String policyKey(String resourceType, String resourceCode, String action) {
        return resourceType + "|" + resourceCode + "|" + action;
    }

    private record ResourceAccess(Set<String> allowedCodes, Set<String> deniedCodes) {
        private static ResourceAccess empty() {
            return new ResourceAccess(Set.of(), Set.of());
        }
    }

    @Getter
    public static class PermissionResourceSummary {
        private final String tenantId;
        private final Long spaceId;
        private final List<RoleSummary> roles;
        private final ResourceBucket menus;
        private final ResourceBucket routers;
        private final ResourceBucket pages;

        public PermissionResourceSummary(String tenantId,
                                         Long spaceId,
                                         List<RoleSummary> roles,
                                         ResourceBucket menus,
                                         ResourceBucket routers,
                                         ResourceBucket pages) {
            this.tenantId = tenantId;
            this.spaceId = spaceId;
            this.roles = roles == null ? List.of() : List.copyOf(roles);
            this.menus = menus == null ? ResourceBucket.empty() : menus;
            this.routers = routers == null ? ResourceBucket.empty() : routers;
            this.pages = pages == null ? ResourceBucket.empty() : pages;
        }

        public static PermissionResourceSummary empty(String tenantId, Long spaceId) {
            return new PermissionResourceSummary(tenantId, spaceId, List.of(),
                    ResourceBucket.empty(), ResourceBucket.empty(), ResourceBucket.empty());
        }
    }

    @Getter
    public static class RoleSummary {
        private final Long id;
        private final String code;
        private final String name;

        public RoleSummary(Long id, String code, String name) {
            this.id = id;
            this.code = code;
            this.name = name;
        }

        public static RoleSummary from(SysRole role) {
            return new RoleSummary(role.getId(), role.getRoleCode(), role.getRoleName());
        }
    }

    @Getter
    public static class ResourceBucket {
        private final long count;
        private final List<String> codes;

        public ResourceBucket(Collection<String> codes) {
            List<String> normalizedCodes = codes == null ? List.of() : new ArrayList<>(codes);
            this.count = normalizedCodes.size();
            this.codes = List.copyOf(normalizedCodes);
        }

        public static ResourceBucket empty() {
            return new ResourceBucket(List.of());
        }

        public static ResourceBucket fromMenus(List<PermissionMenu> menus) {
            return fromResources(menus, PermissionMenu::getMenuCode, PermissionMenu::getSort);
        }

        public static ResourceBucket fromRouters(List<PermissionRouter> routers) {
            return fromResources(routers, PermissionRouter::getRouterCode, PermissionRouter::getSort);
        }

        public static ResourceBucket fromPages(List<PermissionPage> pages) {
            List<String> codes = pages == null ? List.of() : pages.stream()
                    .sorted(Comparator.comparing(PermissionPage::getPageName, Comparator.nullsLast(String::compareTo))
                            .thenComparing(PermissionPage::getId, Comparator.nullsLast(Long::compareTo)))
                    .map(PermissionPage::getPageCode)
                    .filter(Objects::nonNull)
                    .toList();
            return new ResourceBucket(codes);
        }

        private static <T> ResourceBucket fromResources(List<T> records,
                                                        Function<T, String> codeGetter,
                                                        Function<T, Integer> sortGetter) {
            List<String> codes = records == null ? List.of() : records.stream()
                    .sorted(Comparator.comparing(sortGetter, Comparator.nullsLast(Integer::compareTo))
                            .thenComparing(codeGetter))
                    .map(codeGetter)
                    .filter(Objects::nonNull)
                    .toList();
            return new ResourceBucket(codes);
        }
    }

    @Getter
    public static class PermissionPolicySnapshot {
        private final String tenantId;
        private final Long spaceId;
        private final Map<String, List<EffectivePolicy>> allowPolicies;
        private final Map<String, List<EffectivePolicy>> denyPolicies;

        public PermissionPolicySnapshot(String tenantId,
                                        Long spaceId,
                                        Map<String, List<EffectivePolicy>> allowPolicies,
                                        Map<String, List<EffectivePolicy>> denyPolicies) {
            this.tenantId = tenantId;
            this.spaceId = spaceId;
            this.allowPolicies = allowPolicies == null ? Map.of() : Map.copyOf(allowPolicies);
            this.denyPolicies = denyPolicies == null ? Map.of() : Map.copyOf(denyPolicies);
        }

        public static PermissionPolicySnapshot empty(String tenantId, Long spaceId) {
            return new PermissionPolicySnapshot(tenantId, spaceId, Map.of(), Map.of());
        }
    }

    @Getter
    public static class EffectivePolicy {
        private final Long bindingId;
        private final Long roleId;
        private final Long spaceId;
        private final String resourceType;
        private final String resourceCode;
        private final String effectType;
        private final String actionScope;

        public EffectivePolicy(Long bindingId,
                               Long roleId,
                               Long spaceId,
                               String resourceType,
                               String resourceCode,
                               String effectType,
                               String actionScope) {
            this.bindingId = bindingId;
            this.roleId = roleId;
            this.spaceId = spaceId == null ? TENANT_LEVEL_SPACE_ID : spaceId;
            this.resourceType = resourceType;
            this.resourceCode = resourceCode;
            this.effectType = effectType;
            this.actionScope = actionScope;
        }

        public static EffectivePolicy from(PermissionRoleResource binding) {
            return new EffectivePolicy(
                    binding.getId(),
                    binding.getRoleId(),
                    binding.getSpaceId(),
                    binding.getResourceType(),
                    binding.getResourceCode(),
                    binding.getEffectType(),
                    binding.getActionScope()
            );
        }
    }
}

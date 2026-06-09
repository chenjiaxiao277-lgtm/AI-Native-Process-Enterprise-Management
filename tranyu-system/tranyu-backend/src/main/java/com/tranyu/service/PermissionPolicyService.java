package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.dto.PermissionDTOs;
import com.tranyu.entity.PermissionPolicy;
import com.tranyu.mapper.PermissionPolicyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionPolicyService {

    private final PermissionPolicyMapper permissionPolicyMapper;

    public List<PermissionPolicy> listByScope(String tenantId, String spaceId) {
        LambdaQueryWrapper<PermissionPolicy> q = new LambdaQueryWrapper<PermissionPolicy>()
                .eq(PermissionPolicy::getTenantId, tenantId);
        if (spaceId != null) {
            q.eq(PermissionPolicy::getSpaceId, spaceId);
        }
        return permissionPolicyMapper.selectList(q);
    }

    public void save(PermissionPolicy policy) {
        if (policy.getId() == null) {
            permissionPolicyMapper.insert(policy);
        } else {
            permissionPolicyMapper.updateById(policy);
        }
    }

    public List<PermissionPolicy> listBySpaceAndType(String tenantId, String spaceId, String policyType) {
        LambdaQueryWrapper<PermissionPolicy> q = new LambdaQueryWrapper<PermissionPolicy>()
                .eq(PermissionPolicy::getTenantId, tenantId)
                .eq(PermissionPolicy::getSpaceId, spaceId)
                .eq(PermissionPolicy::getPolicyName, policyType);
        return permissionPolicyMapper.selectList(q);
    }

    public PermissionPolicy getPolicyByType(String tenantId, String spaceId, String policyType) {
        LambdaQueryWrapper<PermissionPolicy> q = new LambdaQueryWrapper<PermissionPolicy>()
                .eq(PermissionPolicy::getTenantId, tenantId)
                .eq(PermissionPolicy::getSpaceId, spaceId)
                .eq(PermissionPolicy::getPolicyName, policyType)
                .last("LIMIT 1");
        return permissionPolicyMapper.selectOne(q);
    }

    public List<PermissionPolicy> listBySpaceAndType(Long spaceId, String policyType) {
        return listBySpaceAndType("default", String.valueOf(spaceId), policyType);
    }

    public void saveOrUpdateBasic(String tenantId, String spaceId, PermissionDTOs.PermissionBasicRequest request) {
        saveOrUpdateSummary(tenantId, spaceId, "BASIC", request.getSummary());
    }

    public void saveOrUpdateData(String tenantId, String spaceId, PermissionDTOs.PermissionDataRequest request) {
        saveOrUpdateSummary(tenantId, spaceId, "DATA", request.getSummary());
    }

    public void saveOrUpdateAction(String tenantId, String spaceId, PermissionDTOs.PermissionActionRequest request) {
        saveOrUpdateSummary(tenantId, spaceId, "ACTION", request.getSummary());
    }

    public void saveOrUpdateFeature(String tenantId, String spaceId, PermissionDTOs.PermissionFeatureRequest request) {
        saveOrUpdateSummary(tenantId, spaceId, "FEATURE", request.getSummary());
    }

    /**
     * MVP：为租户管理员预置最小权限（仅存储策略，不做裁决扩展）
     */
    public void ensureTenantAdminPolicies(String tenantId, Long adminUserId) {
        if (tenantId == null || tenantId.isBlank() || adminUserId == null) {
            return;
        }
        String subjectId = String.valueOf(adminUserId);
        ensurePolicy(tenantId, null, "USER", subjectId, "user", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "user", "create");
        ensurePolicy(tenantId, null, "USER", subjectId, "user", "edit");
        ensurePolicy(tenantId, null, "USER", subjectId, "user", "enable");
        ensurePolicy(tenantId, null, "USER", subjectId, "user", "disable");

        ensurePolicy(tenantId, null, "USER", subjectId, "space", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "create");
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "edit");
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "disable");

        // 空间内管理类（空间级策略在创建空间时补齐 spaceId）
        ensurePolicy(tenantId, null, "USER", subjectId, "space_member", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_member", "manage");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_group", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_group", "manage");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_role", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_role", "manage");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_relation_auth", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_relation_auth", "manage");

        ensurePolicy(tenantId, null, "USER", subjectId, "permission", "read");
        ensurePolicy(tenantId, null, "USER", subjectId, "permission", "edit");

        ensurePolicyWithKey(tenantId, null, "USER", subjectId, "tenant", "manage", "tenant_admin_reset");
    }

    /**
     * MVP：为空间负责人预置最小权限（空间级）
     */
    public void ensureSpaceOwnerPolicies(String tenantId, String spaceId, Long ownerUserId) {
        if (tenantId == null || tenantId.isBlank() || spaceId == null || spaceId.isBlank() || ownerUserId == null) {
            return;
        }
        String subjectId = String.valueOf(ownerUserId);
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space", "edit");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space", "disable");

        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_member", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_member", "manage");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_group", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_group", "manage");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_role", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_role", "manage");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_relation_auth", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_relation_auth", "manage");

        ensurePolicy(tenantId, spaceId, "USER", subjectId, "permission", "read");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "permission", "edit");
    }

    /**
     * 超级空间管理员：租户级权限（用于进入企业入口后创建空间与管理空间角色）
     */
    public void ensureSpaceSuperAdminTenantPolicies(String tenantId, Long adminUserId) {
        if (tenantId == null || tenantId.isBlank() || adminUserId == null) {
            return;
        }
        String subjectId = String.valueOf(adminUserId);
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "create");
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "edit");
        ensurePolicy(tenantId, null, "USER", subjectId, "space", "disable");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_role", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_role", "manage");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_member", "view");
        ensurePolicy(tenantId, null, "USER", subjectId, "space_member", "manage");
    }

    /**
     * 超级空间管理员：空间级权限（用于空间入口内配置与工作项创建）
     */
    public void ensureSpaceSuperAdminSpacePolicies(String tenantId, String spaceId, Long adminUserId) {
        if (tenantId == null || tenantId.isBlank() || spaceId == null || spaceId.isBlank() || adminUserId == null) {
            return;
        }
        String subjectId = String.valueOf(adminUserId);
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "permission", "read");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "permission", "edit");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_member", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_member", "manage");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_role", "view");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "space_role", "manage");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "work_item", "create");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "work_item", "edit");
        ensurePolicy(tenantId, spaceId, "USER", subjectId, "work_item_type", "create");
        ensurePolicyWithKey(tenantId, spaceId, "USER", subjectId, "page", "create", "work_item_manage_page");
        ensurePolicyWithKey(tenantId, spaceId, "USER", subjectId, "router", "create", "space_work_items");
        ensurePolicyWithKey(tenantId, spaceId, "USER", subjectId, "menu", "create", "work_item_management");
    }

    private void saveOrUpdateSummary(String tenantId, String spaceId, String policyType, String summary) {
        PermissionPolicy existing = getPolicyByType(tenantId, spaceId, policyType);
        if (existing == null) {
            PermissionPolicy policy = new PermissionPolicy();
            policy.setTenantId(tenantId);
            policy.setSpaceId(spaceId);
            policy.setPolicyName(policyType);
            policy.setPolicyScope("SPACE");
            policy.setEffect("ALLOW");
            policy.setStatus(1);
            policy.setRemark(summary);
            permissionPolicyMapper.insert(policy);
            return;
        }
        existing.setRemark(summary);
        permissionPolicyMapper.updateById(existing);
    }

    private void ensurePolicy(String tenantId,
                              String spaceId,
                              String subjectType,
                              String subjectId,
                              String resourceType,
                              String action) {
        ensurePolicyWithKey(tenantId, spaceId, subjectType, subjectId, resourceType, action, null);
    }

    private void ensurePolicyWithKey(String tenantId,
                                     String spaceId,
                                     String subjectType,
                                     String subjectId,
                                     String resourceType,
                                     String action,
                                     String resourceKey) {
        LambdaQueryWrapper<PermissionPolicy> q = new LambdaQueryWrapper<PermissionPolicy>()
                .eq(PermissionPolicy::getTenantId, tenantId)
                .eq(PermissionPolicy::getSubjectType, subjectType)
                .eq(PermissionPolicy::getSubjectId, subjectId)
                .eq(PermissionPolicy::getResourceType, resourceType)
                .eq(PermissionPolicy::getAction, action);
        if (spaceId == null || spaceId.isBlank()) {
            q.and(w -> w.isNull(PermissionPolicy::getSpaceId).or().eq(PermissionPolicy::getSpaceId, ""));
        } else {
            q.eq(PermissionPolicy::getSpaceId, spaceId);
        }
        if (resourceKey == null || resourceKey.isBlank()) {
            q.and(w -> w.isNull(PermissionPolicy::getResourceKey).or().eq(PermissionPolicy::getResourceKey, ""));
        } else {
            q.eq(PermissionPolicy::getResourceKey, resourceKey);
        }
        if (permissionPolicyMapper.selectCount(q) > 0) {
            return;
        }
        PermissionPolicy policy = new PermissionPolicy();
        policy.setTenantId(tenantId);
        policy.setSpaceId(spaceId);
        policy.setSubjectType(subjectType);
        policy.setSubjectId(subjectId);
        policy.setResourceType(resourceType);
        policy.setAction(action);
        policy.setResourceKey(resourceKey);
        policy.setEffect("ALLOW");
        policy.setPolicyName("MVP_BOOTSTRAP");
        policy.setPolicyScope(spaceId == null || spaceId.isBlank() ? "TENANT" : "SPACE");
        policy.setStatus(1);
        permissionPolicyMapper.insert(policy);
    }
}

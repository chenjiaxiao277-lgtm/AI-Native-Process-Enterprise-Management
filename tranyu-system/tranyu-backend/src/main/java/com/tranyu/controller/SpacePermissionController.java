package com.tranyu.controller;

import com.tranyu.common.Result;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.TenantContext;
import com.tranyu.dto.PermissionDTOs;
import com.tranyu.entity.PermissionPolicy;
import com.tranyu.service.PermissionCheckRequest;
import com.tranyu.service.PermissionEngine;
import com.tranyu.service.PermissionPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces/{spaceId}/permissions")
@RequiredArgsConstructor
public class SpacePermissionController {

    private static final String DEFAULT_TENANT_ID = "default";

    private final PermissionPolicyService permissionPolicyService;
    private final PermissionEngine permissionEngine;

    @GetMapping("/basic")
    public Result<PermissionDTOs.PermissionBasicResponse> getBasic(@PathVariable String spaceId,
                                                                   @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "read", "permission_basic"));
        PermissionPolicy policy = permissionPolicyService.getPolicyByType(resolveTenantId(tenantId), spaceId, "BASIC");
        PermissionDTOs.PermissionBasicResponse resp = new PermissionDTOs.PermissionBasicResponse();
        resp.setSpaceId(spaceId);
        resp.setSummary(policy == null ? null : policy.getRemark());
        return Result.ok(resp);
    }

    @PutMapping("/basic")
    public Result<Void> updateBasic(@PathVariable String spaceId,
                                    @RequestParam(required = false) String tenantId,
                                    @RequestBody PermissionDTOs.PermissionBasicRequest request) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "edit", "permission_basic"));
        permissionPolicyService.saveOrUpdateBasic(resolveTenantId(tenantId), spaceId, request);
        return Result.ok(null);
    }

    @GetMapping("/data")
    public Result<PermissionDTOs.PermissionDataResponse> getData(@PathVariable String spaceId,
                                                                 @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "read", "permission_data"));
        PermissionPolicy policy = permissionPolicyService.getPolicyByType(resolveTenantId(tenantId), spaceId, "DATA");
        PermissionDTOs.PermissionDataResponse resp = new PermissionDTOs.PermissionDataResponse();
        resp.setSpaceId(spaceId);
        resp.setSummary(policy == null ? null : policy.getRemark());
        return Result.ok(resp);
    }

    @PutMapping("/data")
    public Result<Void> updateData(@PathVariable String spaceId,
                                   @RequestParam(required = false) String tenantId,
                                   @RequestBody PermissionDTOs.PermissionDataRequest request) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "edit", "permission_data"));
        permissionPolicyService.saveOrUpdateData(resolveTenantId(tenantId), spaceId, request);
        return Result.ok(null);
    }

    @GetMapping("/action")
    public Result<PermissionDTOs.PermissionActionResponse> getAction(@PathVariable String spaceId,
                                                                     @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "read", "permission_action"));
        PermissionPolicy policy = permissionPolicyService.getPolicyByType(resolveTenantId(tenantId), spaceId, "ACTION");
        PermissionDTOs.PermissionActionResponse resp = new PermissionDTOs.PermissionActionResponse();
        resp.setSpaceId(spaceId);
        resp.setSummary(policy == null ? null : policy.getRemark());
        return Result.ok(resp);
    }

    @PutMapping("/action")
    public Result<Void> updateAction(@PathVariable String spaceId,
                                     @RequestParam(required = false) String tenantId,
                                     @RequestBody PermissionDTOs.PermissionActionRequest request) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "edit", "permission_action"));
        permissionPolicyService.saveOrUpdateAction(resolveTenantId(tenantId), spaceId, request);
        return Result.ok(null);
    }

    @GetMapping("/feature")
    public Result<PermissionDTOs.PermissionFeatureResponse> getFeature(@PathVariable String spaceId,
                                                                       @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "read", "permission_feature"));
        PermissionPolicy policy = permissionPolicyService.getPolicyByType(resolveTenantId(tenantId), spaceId, "FEATURE");
        PermissionDTOs.PermissionFeatureResponse resp = new PermissionDTOs.PermissionFeatureResponse();
        resp.setSpaceId(spaceId);
        resp.setSummary(policy == null ? null : policy.getRemark());
        return Result.ok(resp);
    }

    @PutMapping("/feature")
    public Result<Void> updateFeature(@PathVariable String spaceId,
                                      @RequestParam(required = false) String tenantId,
                                      @RequestBody PermissionDTOs.PermissionFeatureRequest request) {
        permissionEngine.checkOrThrow(buildRequest(spaceId, tenantId, "edit", "permission_feature"));
        permissionPolicyService.saveOrUpdateFeature(resolveTenantId(tenantId), spaceId, request);
        return Result.ok(null);
    }

    private String resolveTenantId(String tenantId) {
        return (tenantId == null || tenantId.isBlank()) ? DEFAULT_TENANT_ID : tenantId.trim();
    }

    private PermissionCheckRequest buildRequest(String spaceId,
                                                String tenantId,
                                                String action,
                                                String resourceKey) {
        PermissionCheckRequest req = new PermissionCheckRequest();
        req.setUserId(AuthSubjectContext.getCurrentUserId());
        req.setTenantId(tenantId == null || tenantId.isBlank() ? TenantContext.getCurrentTenantIdOrDefault() : tenantId);
        req.setSpaceId(spaceId);
        req.setResourceType("permission");
        req.setAction(action);
        req.setResourceKey(resourceKey);
        return req;
    }
}

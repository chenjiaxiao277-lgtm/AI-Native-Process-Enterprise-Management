package com.tranyu.controller;

import com.tranyu.common.Result;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.TenantContext;
import com.tranyu.dto.TenantDTOs;
import com.tranyu.service.PermissionCheckRequest;
import com.tranyu.service.PermissionEngine;
import com.tranyu.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final PermissionEngine permissionEngine;

    @GetMapping
    public Result<List<TenantDTOs.TenantResponse>> list() {
        permissionEngine.checkOrThrow(buildRequest("tenant", "view", "tenant_list", null));
        List<TenantDTOs.TenantResponse> data = tenantService.listTenants().stream()
                .map(TenantController::toResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @GetMapping("/{id}")
    public Result<TenantDTOs.TenantResponse> detail(@PathVariable Long id) {
        permissionEngine.checkOrThrow(buildRequest("tenant", "view", "tenant_detail", String.valueOf(id)));
        return Result.ok(toResponse(tenantService.getTenant(id)));
    }

    @PostMapping
    public Result<Void> create(@RequestBody TenantDTOs.TenantCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("tenant", "create", "tenant_create", null));
        if (request.getAdminUserId() == null
                && (request.getAdminUsername() == null || request.getAdminUsername().isBlank())) {
            throw new IllegalArgumentException("租户管理员不能为空");
        }
        tenantService.createTenant(fromCreateRequest(request), request);
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody TenantDTOs.TenantUpdateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("tenant", "edit", "tenant_update", String.valueOf(id)));
        tenantService.updateTenant(fromUpdateRequest(id, request));
        return Result.ok(null);
    }

    @PutMapping("/{id}/admin")
    public Result<Void> resetAdmin(@PathVariable Long id, @RequestBody TenantDTOs.TenantAdminResetRequest request) {
        permissionEngine.checkOrThrow(buildRequest("tenant", "manage", "tenant_admin_reset", String.valueOf(id)));
        tenantService.resetTenantAdmin(id, request);
        return Result.ok(null);
    }

    @PostMapping("/{id}/enable")
    public Result<Void> enable(@PathVariable Long id) {
        permissionEngine.checkOrThrow(buildRequest("tenant", "enable", "tenant_enable", String.valueOf(id)));
        tenantService.enableTenant(id);
        return Result.ok(null);
    }

    @PostMapping("/{id}/disable")
    public Result<Void> disable(@PathVariable Long id) {
        permissionEngine.checkOrThrow(buildRequest("tenant", "disable", "tenant_disable", String.valueOf(id)));
        tenantService.disableTenant(id);
        return Result.ok(null);
    }

    private static TenantDTOs.TenantResponse toResponse(com.tranyu.entity.Tenant tenant) {
        if (tenant == null) return null;
        TenantDTOs.TenantResponse resp = new TenantDTOs.TenantResponse();
        resp.setId(tenant.getId());
        resp.setTenantId(tenant.getTenantId());
        resp.setTenantName(tenant.getTenantName());
        resp.setStatus(tenant.getStatus());
        resp.setRemark(tenant.getRemark());
        resp.setAccountLimit(tenant.getAccountLimit());
        resp.setAdminExpireAt(tenant.getAdminExpireAt());
        resp.setCreateTime(tenant.getCreateTime());
        resp.setUpdateTime(tenant.getUpdateTime());
        return resp;
    }

    private static com.tranyu.entity.Tenant fromCreateRequest(TenantDTOs.TenantCreateRequest request) {
        com.tranyu.entity.Tenant tenant = new com.tranyu.entity.Tenant();
        if (request.getTenantId() != null) {
            tenant.setTenantId(request.getTenantId().trim());
        }
        if (request.getTenantName() != null) {
            tenant.setTenantName(request.getTenantName().trim());
        }
        tenant.setStatus(request.getStatus());
        tenant.setRemark(request.getRemark());
        tenant.setAccountLimit(request.getAccountLimit());
        tenant.setAdminExpireAt(request.getAdminExpireAt());
        return tenant;
    }

    private static com.tranyu.entity.Tenant fromUpdateRequest(Long id, TenantDTOs.TenantUpdateRequest request) {
        com.tranyu.entity.Tenant tenant = new com.tranyu.entity.Tenant();
        tenant.setId(id);
        tenant.setTenantName(request.getTenantName());
        tenant.setStatus(request.getStatus());
        tenant.setRemark(request.getRemark());
        tenant.setAccountLimit(request.getAccountLimit());
        tenant.setAdminExpireAt(request.getAdminExpireAt());
        return tenant;
    }

    private PermissionCheckRequest buildRequest(String resourceType, String action, String resourceKey, String targetId) {
        PermissionCheckRequest req = new PermissionCheckRequest();
        req.setUserId(AuthSubjectContext.getCurrentUserId());
        req.setTenantId(TenantContext.getCurrentTenantIdOrDefault());
        req.setResourceType(resourceType);
        req.setAction(action);
        req.setResourceKey(resourceKey);
        req.setSpaceId(null);
        return req;
    }
}

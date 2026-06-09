package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.dto.TenantDTOs;
import com.tranyu.entity.TenantConfig;
import com.tranyu.entity.TenantFeatureToggle;
import com.tranyu.service.TenantConfigService;
import com.tranyu.service.TenantFeatureToggleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tenants/{tenantId}")
@RequiredArgsConstructor
public class TenantPermissionController {

    private final TenantConfigService tenantConfigService;
    private final TenantFeatureToggleService tenantFeatureToggleService;

    @GetMapping("/default-templates")
    public Result<TenantDTOs.TenantDefaultTemplateResponse> getDefaultTemplates(@PathVariable String tenantId) {
        TenantConfig config = tenantConfigService.getByTenantId(tenantId);
        TenantDTOs.TenantDefaultTemplateResponse resp = new TenantDTOs.TenantDefaultTemplateResponse();
        resp.setTemplateJson(config == null ? null : config.getDefaultTemplateJson());
        return Result.ok(resp);
    }

    @PutMapping("/default-templates")
    public Result<Void> updateDefaultTemplates(@PathVariable String tenantId,
                                               @RequestBody TenantDTOs.TenantDefaultTemplateRequest request) {
        tenantConfigService.saveDefaultTemplate(tenantId, request.getTemplateJson());
        return Result.ok(null);
    }

    @GetMapping("/feature-toggles")
    public Result<List<TenantDTOs.TenantFeatureToggleResponse>> getFeatureToggles(@PathVariable String tenantId) {
        List<TenantDTOs.TenantFeatureToggleResponse> data = tenantFeatureToggleService.listByTenant(tenantId).stream()
                .map(TenantPermissionController::toFeatureToggleResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @PutMapping("/feature-toggles")
    public Result<Void> updateFeatureToggles(@PathVariable String tenantId,
                                             @RequestBody TenantDTOs.TenantFeatureToggleRequest request) {
        TenantFeatureToggle toggle = new TenantFeatureToggle();
        toggle.setFeatureKey(request.getFeatureKey());
        toggle.setEnabled(request.getEnabled());
        toggle.setRemark(request.getRemark());
        tenantFeatureToggleService.saveOrUpdateToggle(tenantId, toggle);
        return Result.ok(null);
    }

    private static TenantDTOs.TenantFeatureToggleResponse toFeatureToggleResponse(TenantFeatureToggle toggle) {
        TenantDTOs.TenantFeatureToggleResponse resp = new TenantDTOs.TenantFeatureToggleResponse();
        resp.setId(toggle.getId());
        resp.setFeatureKey(toggle.getFeatureKey());
        resp.setEnabled(toggle.getEnabled());
        resp.setRemark(toggle.getRemark());
        return resp;
    }
}

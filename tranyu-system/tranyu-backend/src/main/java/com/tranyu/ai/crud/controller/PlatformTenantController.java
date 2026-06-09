package com.tranyu.ai.crud.controller;

import com.tranyu.ai.crud.common.page.PageQuery;
import com.tranyu.ai.crud.common.page.PageResult;
import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.ai.crud.model.request.TenantCreateRequest;
import com.tranyu.ai.crud.model.request.TenantUpdateRequest;
import com.tranyu.ai.crud.model.vo.TenantVO;
import com.tranyu.ai.crud.service.PlatformTenantService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 平台租户管理接口。
 */
@RestController
@RequestMapping("/api/platform/tenants")
public class PlatformTenantController {

    private final PlatformTenantService platformTenantService;

    public PlatformTenantController(PlatformTenantService platformTenantService) {
        this.platformTenantService = platformTenantService;
    }

    @GetMapping
    public Result<PageResult<TenantVO>> pageTenants(@ModelAttribute PageQuery query,
                                                    @RequestParam(required = false) String keyword) {
        return Result.success(platformTenantService.pageTenants(query, keyword));
    }

    @GetMapping("/{id}")
    public Result<TenantVO> getTenant(@PathVariable Long id) {
        return Result.success(platformTenantService.getTenantById(id));
    }

    @PostMapping
    public Result<TenantVO> createTenant(@RequestBody TenantCreateRequest request) {
        return Result.success(platformTenantService.createTenant(request));
    }

    @PutMapping("/{id}")
    public Result<TenantVO> updateTenant(@PathVariable Long id, @RequestBody TenantUpdateRequest request) {
        return Result.success(platformTenantService.updateTenant(id, request));
    }

    @PutMapping("/{id}/enable")
    public Result<Boolean> enableTenant(@PathVariable Long id) {
        return Result.success(platformTenantService.enableTenant(id));
    }

    @PutMapping("/{id}/disable")
    public Result<Boolean> disableTenant(@PathVariable Long id) {
        return Result.success(platformTenantService.disableTenant(id));
    }

    @GetMapping("/current")
    public Result<TenantVO> getCurrentTenant() {
        return Result.success(platformTenantService.getCurrentTenant());
    }
}

package com.tranyu.ai.crud.controller;

import com.tranyu.ai.crud.model.entity.PlatformPermissionEntity;
import com.tranyu.ai.crud.model.entity.PlatformRoleEntity;
import com.tranyu.ai.crud.model.entity.PlatformUserEntity;
import com.tranyu.ai.crud.service.PlatformIdentityService;
import com.tranyu.ai.crud.common.page.PageQuery;
import com.tranyu.ai.crud.common.page.PageResult;
import com.tranyu.ai.crud.common.result.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 用户、角色、权限基础查询接口。
 */
@RestController
@RequestMapping("/api/system")
public class PlatformIdentityController {

    private final PlatformIdentityService platformIdentityService;

    public PlatformIdentityController(PlatformIdentityService platformIdentityService) {
        this.platformIdentityService = platformIdentityService;
    }

    /**
     * 查询当前用户基础信息。
     */
    @GetMapping("/users/current")
    public Result<PlatformUserEntity> currentUser() {
        return Result.success(platformIdentityService.getCurrentUser());
    }

    /**
     * 查询当前用户角色列表。
     */
    @GetMapping("/users/current/roles")
    public Result<List<PlatformRoleEntity>> currentUserRoles() {
        return Result.success(platformIdentityService.getCurrentUserRoles());
    }

    /**
     * 查询当前用户权限编码列表。
     */
    @GetMapping("/users/current/permissions")
    public Result<List<String>> currentUserPermissions() {
        return Result.success(platformIdentityService.getCurrentUserPermissions());
    }

    /**
     * 查询用户分页列表。
     */
    @GetMapping("/users")
    public Result<PageResult<PlatformUserEntity>> users(@ModelAttribute PageQuery pageQuery,
                                                        @RequestParam(required = false) String keyword) {
        return Result.success(platformIdentityService.pageUsers(pageQuery, keyword));
    }

    /**
     * 查询角色分页列表。
     */
    @GetMapping("/roles")
    public Result<PageResult<PlatformRoleEntity>> roles(@ModelAttribute PageQuery pageQuery,
                                                        @RequestParam(required = false) String keyword) {
        return Result.success(platformIdentityService.pageRoles(pageQuery, keyword));
    }

    /**
     * 查询权限列表。
     */
    @GetMapping("/permissions")
    public Result<List<PlatformPermissionEntity>> permissions() {
        return Result.success(platformIdentityService.listPermissions());
    }
}

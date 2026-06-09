package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.TenantContext;
import com.tranyu.dto.UserDTOs;
import com.tranyu.entity.SysUser;
import com.tranyu.service.PermissionCheckRequest;
import com.tranyu.service.PermissionEngine;
import com.tranyu.service.RoleBoundary;
import com.tranyu.service.SysRoleService;
import com.tranyu.service.SysUserService;
import com.tranyu.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final SysUserService userService;
    private final PermissionEngine permissionEngine;
    private final SysRoleService sysRoleService;
    private final TenantService tenantService;

    @GetMapping
    public Result<List<UserDTOs.UserResponse>> list(@RequestParam(required = false) String tenantId,
                                                    @RequestParam(required = false) String username,
                                                    @RequestParam(required = false) String realName,
                                                    @RequestParam(required = false) Integer status) {
        permissionEngine.checkOrThrow(buildRequest("user", "view", "user_list"));
        String effectiveTenantId = resolveTenantId(tenantId);
        List<SysUser> users = userService.listUsers(effectiveTenantId, username, realName, status);
        if (!isPlatformAdmin()) {
            List<Long> platformAdminIds = sysRoleService.listUserIdsByRoleCode(RoleBoundary.PLATFORM_ADMIN);
            if (!platformAdminIds.isEmpty()) {
                users = users.stream().filter(user -> !platformAdminIds.contains(user.getId())).toList();
            }
        }
        List<UserDTOs.UserResponse> data = users.stream().map(UserController::toResponse).collect(Collectors.toList());
        return Result.ok(data);
    }

    @GetMapping("/{id}")
    public Result<UserDTOs.UserResponse> detail(@PathVariable Long id) {
        permissionEngine.checkOrThrow(buildRequest("user", "view", "user_detail"));
        return Result.ok(toResponse(userService.getUserDetail(id)));
    }

    @PostMapping
    public Result<Void> create(@RequestBody UserDTOs.UserCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("user", "create", "user_create"));
        if (!isPlatformAdmin()) {
            request.setTenantId(resolveTenantId(request.getTenantId()));
            tenantService.assertTenantAccountLimit(request.getTenantId());
        }
        userService.createUser(request);
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody UserDTOs.UserUpdateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("user", "edit", "user_update"));
        userService.updateUser(id, request);
        return Result.ok(null);
    }

    @PostMapping("/{id}/enable")
    public Result<Void> enable(@PathVariable Long id) {
        permissionEngine.checkOrThrow(buildRequest("user", "enable", "user_enable"));
        userService.enableUser(id);
        return Result.ok(null);
    }

    @PostMapping("/{id}/disable")
    public Result<Void> disable(@PathVariable Long id) {
        permissionEngine.checkOrThrow(buildRequest("user", "disable", "user_disable"));
        userService.disableUser(id);
        return Result.ok(null);
    }

    @PostMapping("/me/password")
    public Result<Void> changePassword(@RequestBody UserDTOs.ChangePasswordRequest request) {
        Long userId = AuthSubjectContext.getCurrentUserId();
        if (userId == null) {
            throw new IllegalArgumentException("未登录");
        }
        if (request == null) {
            throw new IllegalArgumentException("密码不能为空");
        }
        if (request.getNewPassword() == null || request.getConfirmPassword() == null
                || !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("新密码与确认密码不一致");
        }
        userService.changePassword(userId, request.getOldPassword(), request.getNewPassword());
        return Result.ok(null);
    }

    private static UserDTOs.UserResponse toResponse(SysUser user) {
        if (user == null) return null;
        UserDTOs.UserResponse resp = new UserDTOs.UserResponse();
        resp.setId(user.getId());
        resp.setTenantId(user.getTenantId());
        resp.setUsername(user.getUsername());
        resp.setRealName(user.getRealName());
        resp.setStatus(user.getStatus());
        resp.setPhone(user.getPhone());
        resp.setEmail(user.getEmail());
        resp.setCreateTime(user.getCreateTime());
        resp.setUpdateTime(user.getUpdateTime());
        return resp;
    }

    private PermissionCheckRequest buildRequest(String resourceType, String action, String resourceKey) {
        PermissionCheckRequest req = new PermissionCheckRequest();
        req.setUserId(AuthSubjectContext.getCurrentUserId());
        req.setTenantId(TenantContext.getCurrentTenantIdOrDefault());
        req.setResourceType(resourceType);
        req.setAction(action);
        req.setResourceKey(resourceKey);
        return req;
    }

    private boolean isPlatformAdmin() {
        return sysRoleService.isPlatformAdmin(AuthSubjectContext.getCurrentUserId());
    }

    private String resolveTenantId(String tenantId) {
        if (isPlatformAdmin()) {
            return tenantId;
        }
        String current = TenantContext.getCurrentTenantIdOrDefault();
        return current == null || current.isBlank() ? tenantId : current;
    }
}

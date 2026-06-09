package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SysUser;
import com.tranyu.entity.TenantAdmin;
import com.tranyu.mapper.SysUserMapper;
import com.tranyu.mapper.TenantMapper;
import com.tranyu.mapper.TenantAdminMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TenantAccessService {

    private final SysUserMapper userMapper;
    private final TenantAdminMapper tenantAdminMapper;
    private final TenantMapper tenantMapper;
    private final SysRoleService sysRoleService;

    public boolean canAccessTenant(Long userId, String tenantId) {
        if (userId == null || tenantId == null || tenantId.isBlank()) {
            return false;
        }
        if (sysRoleService.isPlatformAdmin(userId)) {
            return true;
        }
        SysUser user = userMapper.selectById(userId);
        if (user != null && tenantId.equals(user.getTenantId())) {
            return true;
        }
        return tenantAdminMapper.selectCount(new LambdaQueryWrapper<TenantAdmin>()
                .eq(TenantAdmin::getTenantId, tenantId)
                .eq(TenantAdmin::getUserId, userId)) > 0;
    }

    public boolean canManageTenant(Long userId, String tenantId) {
        if (userId == null || tenantId == null || tenantId.isBlank()) {
            return false;
        }
        if (sysRoleService.isPlatformAdmin(userId)) {
            return true;
        }
        return tenantAdminMapper.selectCount(new LambdaQueryWrapper<TenantAdmin>()
                .eq(TenantAdmin::getTenantId, tenantId)
                .eq(TenantAdmin::getUserId, userId)) > 0
                && !isTenantAdminExpired(tenantId);
    }

    private boolean isTenantAdminExpired(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return false;
        }
        com.tranyu.entity.Tenant tenant = tenantMapper.selectOne(new LambdaQueryWrapper<com.tranyu.entity.Tenant>()
                .eq(com.tranyu.entity.Tenant::getTenantId, tenantId)
                .last("LIMIT 1"));
        if (tenant == null || tenant.getAdminExpireAt() == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(tenant.getAdminExpireAt());
    }
}

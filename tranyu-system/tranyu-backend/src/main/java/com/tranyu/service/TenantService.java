package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.Tenant;
import com.tranyu.mapper.TenantMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantMapper tenantMapper;
    private final TenantAdminService tenantAdminService;
    private final com.tranyu.mapper.SysUserMapper userMapper;
    private final PermissionPolicyService permissionPolicyService;
    private final com.tranyu.mapper.SysUserRoleMapper userRoleMapper;
    private final SysRoleService sysRoleService;
    private final com.tranyu.util.PasswordEncoderUtil passwordEncoderUtil;

    public Tenant getByTenantId(String tenantId) {
        return tenantMapper.selectOne(new LambdaQueryWrapper<Tenant>()
                .eq(Tenant::getTenantId, tenantId));
    }

    public List<Tenant> listAll() {
        return tenantMapper.selectList(new LambdaQueryWrapper<>());
    }

    public void save(Tenant tenant) {
        if (tenant.getId() == null) {
            tenantMapper.insert(tenant);
        } else {
            tenantMapper.updateById(tenant);
        }
    }

    public List<Tenant> listTenants() {
        return listAll();
    }

    public Tenant getTenant(Long id) {
        return tenantMapper.selectById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void createTenant(Tenant tenant, com.tranyu.dto.TenantDTOs.TenantCreateRequest request) {
        if (tenant == null) {
            throw new IllegalArgumentException("租户信息不能为空");
        }
        if (tenant.getTenantId() == null || tenant.getTenantId().isBlank()) {
            throw new IllegalArgumentException("租户标识不能为空");
        }
        String normalizedTenantId = tenant.getTenantId().trim();
        tenant.setTenantId(normalizedTenantId);
        Tenant existingTenant = tenantMapper.selectOne(new LambdaQueryWrapper<Tenant>()
                .eq(Tenant::getTenantId, normalizedTenantId)
                .last("LIMIT 1"));
        if (existingTenant != null) {
            throw new IllegalArgumentException("租户标识已存在");
        }
        if (request == null) {
            throw new IllegalArgumentException("租户管理员不能为空");
        }
        if (request.getAdminUserId() == null) {
            String username = request.getAdminUsername();
            String password = request.getAdminPassword();
            if (username == null || username.isBlank() || password == null || password.isBlank()) {
                throw new IllegalArgumentException("租户管理员不能为空");
            }
            com.tranyu.entity.SysUser existingAdmin = userMapper.selectOne(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.tranyu.entity.SysUser>()
                            .eq(com.tranyu.entity.SysUser::getUsername, username.trim())
                            .last("LIMIT 1")
            );
            if (existingAdmin != null && Integer.valueOf(0).equals(existingAdmin.getDeleted())) {
                throw new IllegalArgumentException("租户管理员用户名已存在");
            }
        }
        tenantMapper.insert(tenant);
        if (tenant.getTenantId() == null || tenant.getTenantId().isBlank()) {
            return;
        }

        Long adminUserId = request == null ? null : request.getAdminUserId();
        if (adminUserId == null) {
            adminUserId = createTenantAdminUser(tenant.getTenantId(), request);
        }
        if (adminUserId == null) {
            throw new IllegalArgumentException("租户管理员不能为空");
        }
        com.tranyu.entity.SysUser adminUser = userMapper.selectById(adminUserId);
        if (adminUser != null && adminUser.getTenantId() != null && !adminUser.getTenantId().isBlank()
                && !adminUser.getTenantId().equals(tenant.getTenantId())) {
            throw new IllegalArgumentException("租户管理员已属于其他租户");
        }
        if (!tenantAdminService.exists(tenant.getTenantId(), adminUserId)) {
            tenantAdminService.removeByTenant(tenant.getTenantId());
            com.tranyu.entity.TenantAdmin admin = new com.tranyu.entity.TenantAdmin();
            admin.setTenantId(tenant.getTenantId());
            admin.setUserId(adminUserId);
            tenantAdminService.save(admin);
        }

        if (adminUser != null && (adminUser.getTenantId() == null || adminUser.getTenantId().isBlank())) {
            adminUser.setTenantId(tenant.getTenantId());
            userMapper.updateById(adminUser);
        }
        Long tenantAdminRoleId = sysRoleService.ensureTenantRole(tenant.getTenantId(), RoleBoundary.TENANT_ADMIN, "租户管理员");
        if (tenantAdminRoleId != null) {
            saveUserRole(adminUserId, tenantAdminRoleId);
        }
        permissionPolicyService.ensureTenantAdminPolicies(tenant.getTenantId(), adminUserId);
        ensureSpaceSuperAdmin(tenant.getTenantId(), request == null ? null : request.getAdminPassword());
    }

    public void resetTenantAdmin(Long tenantId, com.tranyu.dto.TenantDTOs.TenantAdminResetRequest request) {
        if (tenantId == null) {
            throw new IllegalArgumentException("租户ID不能为空");
        }
        Tenant tenant = tenantMapper.selectById(tenantId);
        if (tenant == null) {
            throw new IllegalArgumentException("租户不存在");
        }
        String username = request == null ? null : request.getAdminUsername();
        String password = request == null ? null : request.getAdminPassword();
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("管理员账号与密码不能为空");
        }
        com.tranyu.entity.SysUser existing = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.tranyu.entity.SysUser>()
                        .eq(com.tranyu.entity.SysUser::getUsername, username.trim())
                        .last("LIMIT 1")
        );
        Long adminUserId = null;
        if (existing == null) {
            com.tranyu.entity.SysUser user = new com.tranyu.entity.SysUser();
            user.setTenantId(tenant.getTenantId());
            user.setUsername(username.trim());
            user.setRealName(request.getAdminRealName());
            user.setStatus(1);
            user.setDeleted(0);
            user.setPassword(passwordEncoderUtil.encode(password.trim()));
            userMapper.insert(user);
            adminUserId = user.getId();
        } else {
            if (Integer.valueOf(0).equals(existing.getDeleted())
                    && existing.getTenantId() != null && !existing.getTenantId().isBlank()
                    && !existing.getTenantId().equals(tenant.getTenantId())) {
                throw new IllegalArgumentException("管理员账号已属于其他租户");
            }
            existing.setTenantId(tenant.getTenantId());
            existing.setRealName(request.getAdminRealName());
            existing.setPassword(passwordEncoderUtil.encode(password.trim()));
            existing.setDeleted(0);
            if (existing.getStatus() == null) {
                existing.setStatus(1);
            }
            userMapper.updateById(existing);
            adminUserId = existing.getId();
        }
        if (!tenantAdminService.exists(tenant.getTenantId(), adminUserId)) {
            tenantAdminService.removeByTenant(tenant.getTenantId());
            com.tranyu.entity.TenantAdmin admin = new com.tranyu.entity.TenantAdmin();
            admin.setTenantId(tenant.getTenantId());
            admin.setUserId(adminUserId);
            tenantAdminService.save(admin);
        }
        if (request != null && (request.getAccountLimit() != null || request.getAdminExpireAt() != null)) {
            tenant.setAccountLimit(request.getAccountLimit());
            tenant.setAdminExpireAt(request.getAdminExpireAt());
            tenantMapper.updateById(tenant);
        }
        Long tenantAdminRoleId = sysRoleService.ensureTenantRole(tenant.getTenantId(), RoleBoundary.TENANT_ADMIN, "租户管理员");
        if (tenantAdminRoleId != null) {
            saveUserRole(adminUserId, tenantAdminRoleId);
        }
        permissionPolicyService.ensureTenantAdminPolicies(tenant.getTenantId(), adminUserId);
        ensureSpaceSuperAdmin(tenant.getTenantId(), request == null ? null : request.getAdminPassword());
    }

    public void assertTenantAccountLimit(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return;
        }
        Tenant tenant = getByTenantId(tenantId);
        if (tenant == null) {
            return;
        }
        Integer limit = tenant.getAccountLimit();
        if (limit == null || limit <= 0) {
            return;
        }
        Long count = userMapper.selectCount(new LambdaQueryWrapper<com.tranyu.entity.SysUser>()
                .eq(com.tranyu.entity.SysUser::getTenantId, tenantId)
                .eq(com.tranyu.entity.SysUser::getDeleted, 0));
        if (count != null && count >= limit) {
            throw new IllegalArgumentException("当前租户账号数已达上限");
        }
    }

    private Long createTenantAdminUser(String tenantId, com.tranyu.dto.TenantDTOs.TenantCreateRequest request) {
        if (request == null) {
            return null;
        }
        String username = request.getAdminUsername();
        String password = request.getAdminPassword();
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return null;
        }
        com.tranyu.entity.SysUser existing = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.tranyu.entity.SysUser>()
                        .eq(com.tranyu.entity.SysUser::getUsername, username.trim())
                        .last("LIMIT 1")
        );
        if (existing != null && Integer.valueOf(0).equals(existing.getDeleted())) {
            throw new IllegalArgumentException("租户管理员用户名已存在");
        }
        if (existing != null) {
            existing.setTenantId(tenantId);
            existing.setUsername(username.trim());
            existing.setRealName(request.getAdminRealName());
            existing.setStatus(1);
            existing.setDeleted(0);
            existing.setPassword(passwordEncoderUtil.encode(password.trim()));
            userMapper.updateById(existing);
            return existing.getId();
        }
        com.tranyu.entity.SysUser user = new com.tranyu.entity.SysUser();
        user.setTenantId(tenantId);
        user.setUsername(username.trim());
        user.setRealName(request.getAdminRealName());
        user.setStatus(1);
        user.setDeleted(0);
        user.setPassword(passwordEncoderUtil.encode(password.trim()));
        userMapper.insert(user);
        return user.getId();
    }

    private void saveUserRole(Long userId, Long roleId) {
        if (userId == null || roleId == null) {
            return;
        }
        com.tranyu.entity.SysUserRole existing = userRoleMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.tranyu.entity.SysUserRole>()
                        .eq(com.tranyu.entity.SysUserRole::getUserId, userId)
                        .eq(com.tranyu.entity.SysUserRole::getRoleId, roleId)
                        .last("LIMIT 1")
        );
        if (existing != null) {
            return;
        }
        com.tranyu.entity.SysUserRole rel = new com.tranyu.entity.SysUserRole();
        rel.setUserId(userId);
        rel.setRoleId(roleId);
        userRoleMapper.insert(rel);
    }

    private void ensureSpaceSuperAdmin(String tenantId, String rawPassword) {
        if (tenantId == null || tenantId.isBlank()) {
            return;
        }
        String username = tenantId.trim() + "_space_admin";
        com.tranyu.entity.SysUser existing = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<com.tranyu.entity.SysUser>()
                        .eq(com.tranyu.entity.SysUser::getUsername, username)
                        .eq(com.tranyu.entity.SysUser::getDeleted, 0)
                        .last("LIMIT 1")
        );
        Long userId = null;
        if (existing == null) {
            com.tranyu.entity.SysUser user = new com.tranyu.entity.SysUser();
            user.setTenantId(tenantId);
            user.setUsername(username);
            user.setRealName("超级空间管理员");
            user.setStatus(1);
            user.setDeleted(0);
            if (rawPassword != null && !rawPassword.isBlank()) {
                user.setPassword(passwordEncoderUtil.encode(rawPassword.trim()));
            } else {
                user.setPassword(passwordEncoderUtil.encode("123456"));
            }
            userMapper.insert(user);
            userId = user.getId();
        } else {
            existing.setTenantId(tenantId);
            existing.setRealName("超级空间管理员");
            if (rawPassword != null && !rawPassword.isBlank()) {
                existing.setPassword(passwordEncoderUtil.encode(rawPassword.trim()));
            }
            userMapper.updateById(existing);
            userId = existing.getId();
        }
        Long superRoleId = sysRoleService.ensureTenantRole(tenantId, RoleBoundary.SPACE_SUPER_ADMIN, "超级空间管理员");
        if (superRoleId != null) {
            saveUserRole(userId, superRoleId);
        }
        permissionPolicyService.ensureSpaceSuperAdminTenantPolicies(tenantId, userId);
    }

    public void updateTenant(Tenant tenant) {
        tenantMapper.updateById(tenant);
    }

    public void enableTenant(Long id) {
        Tenant tenant = new Tenant();
        tenant.setId(id);
        tenant.setStatus(1);
        tenantMapper.updateById(tenant);
    }

    public void disableTenant(Long id) {
        Tenant tenant = new Tenant();
        tenant.setId(id);
        tenant.setStatus(0);
        tenantMapper.updateById(tenant);
    }
}

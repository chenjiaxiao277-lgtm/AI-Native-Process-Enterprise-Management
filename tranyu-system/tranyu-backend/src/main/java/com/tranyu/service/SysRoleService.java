package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUser;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 角色服务
 */
@Service
@RequiredArgsConstructor
public class SysRoleService {

    private final SysRoleMapper roleMapper;
    private final SysUserMapper userMapper;
    private final SysUserRoleMapper userRoleMapper;

    public Page<SysRole> page(int current, int size, String roleName, String roleCode, Integer status) {
        Page<SysRole> page = new Page<>(current, size);
        LambdaQueryWrapper<SysRole> q = new LambdaQueryWrapper<>();
        if (roleName != null && !roleName.isBlank()) {
            q.like(SysRole::getRoleName, roleName);
        }
        if (roleCode != null && !roleCode.isBlank()) {
            q.like(SysRole::getRoleCode, roleCode);
        }
        if (status != null) {
            q.eq(SysRole::getStatus, status);
        }
        q.orderByAsc(SysRole::getSort).orderByAsc(SysRole::getId);
        return roleMapper.selectPage(page, q);
    }

    public List<SysRole> listAllEnabled() {
        return roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getStatus, 1)
                        .orderByAsc(SysRole::getSort)
                        .orderByAsc(SysRole::getId)
        );
    }

    public SysRole getById(Long id) {
        return roleMapper.selectById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void save(SysRole role) {
        if (role.getId() == null) {
            if (role.getStatus() == null) role.setStatus(1);
            if (role.getDeleted() == null) role.setDeleted(0);
            roleMapper.insert(role);
        } else {
            roleMapper.updateById(role);
        }
    }

    public void changeStatus(Long id, Integer status) {
        SysRole r = new SysRole();
        r.setId(id);
        r.setStatus(status);
        roleMapper.updateById(r);
    }

    public void logicDelete(Long id) {
        SysRole r = new SysRole();
        r.setId(id);
        r.setDeleted(1);
        roleMapper.updateById(r);
    }

    /**
     * 查询角色下所有用户
     */
    public List<SysUser> listUsersByRole(Long roleId) {
        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getRoleId, roleId)
        );
        if (rels.isEmpty()) return List.of();
        List<Long> userIds = rels.stream().map(SysUserRole::getUserId).distinct().toList();
        return userMapper.selectBatchIds(userIds);
    }

    public List<SysRole> listSpaceRoles(String tenantId, String spaceId) {
        return roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getTenantId, tenantId)
                        .eq(SysRole::getSpaceId, spaceId)
                        .eq(SysRole::getRoleScope, "SPACE")
                        .eq(SysRole::getDeleted, 0)
        );
    }

    public boolean isPlatformAdmin(Long userId) {
        if (userId == null) {
            return false;
        }
        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId)
        );
        if (rels.isEmpty()) {
            return false;
        }
        List<Long> roleIds = rels.stream().map(SysUserRole::getRoleId).distinct().toList();
        if (roleIds.isEmpty()) {
            return false;
        }
        return roleMapper.selectCount(new LambdaQueryWrapper<SysRole>()
                .in(SysRole::getId, roleIds)
                .eq(SysRole::getRoleCode, RoleBoundary.PLATFORM_ADMIN)
                .eq(SysRole::getDeleted, 0)) > 0;
    }

    public List<Long> listUserIdsByRoleCode(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return List.of();
        }
        List<SysRole> roles = roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getRoleCode, roleCode)
                        .eq(SysRole::getDeleted, 0)
        );
        if (roles.isEmpty()) {
            return List.of();
        }
        List<Long> roleIds = roles.stream().map(SysRole::getId).distinct().toList();
        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().in(SysUserRole::getRoleId, roleIds)
        );
        if (rels.isEmpty()) {
            return List.of();
        }
        return rels.stream().map(SysUserRole::getUserId).distinct().toList();
    }

    public List<Long> listUserIdsByRoleCodeAndTenant(String tenantId, String roleCode) {
        if (tenantId == null || tenantId.isBlank() || roleCode == null || roleCode.isBlank()) {
            return List.of();
        }
        List<SysRole> roles = roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getTenantId, tenantId)
                        .eq(SysRole::getRoleCode, roleCode)
                        .eq(SysRole::getDeleted, 0)
        );
        if (roles.isEmpty()) {
            return List.of();
        }
        List<Long> roleIds = roles.stream().map(SysRole::getId).distinct().toList();
        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().in(SysUserRole::getRoleId, roleIds)
        );
        if (rels.isEmpty()) {
            return List.of();
        }
        return rels.stream().map(SysUserRole::getUserId).distinct().toList();
    }

    public Long ensureTenantRole(String tenantId, String roleCode, String roleName) {
        if (tenantId == null || tenantId.isBlank() || roleCode == null || roleCode.isBlank()) {
            return null;
        }
        SysRole global = roleMapper.selectOne(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getRoleCode, roleCode)
                        .eq(SysRole::getDeleted, 0)
                        .last("LIMIT 1")
        );
        if (global != null) {
            if (global.getTenantId() == null || global.getTenantId().isBlank()) {
                global.setTenantId(tenantId);
            }
            if (global.getRoleScope() == null || global.getRoleScope().isBlank()) {
                global.setRoleScope("TENANT");
            }
            if (global.getRoleType() == null || global.getRoleType().isBlank()) {
                global.setRoleType("SYSTEM");
            }
            roleMapper.updateById(global);
            return global.getId();
        }
        SysRole existing = roleMapper.selectOne(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getTenantId, tenantId)
                        .eq(SysRole::getRoleScope, "TENANT")
                        .eq(SysRole::getRoleCode, roleCode)
                        .eq(SysRole::getDeleted, 0)
                        .last("LIMIT 1")
        );
        if (existing != null) {
            return existing.getId();
        }
        SysRole role = new SysRole();
        role.setTenantId(tenantId);
        role.setRoleScope("TENANT");
        role.setRoleCode(roleCode);
        role.setRoleName(roleName == null || roleName.isBlank() ? roleCode : roleName);
        role.setRoleType("SYSTEM");
        role.setStatus(1);
        role.setDeleted(0);
        roleMapper.insert(role);
        return role.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void createSpaceRole(String tenantId, String spaceId, SysRole role) {
        role.setTenantId(tenantId);
        role.setSpaceId(spaceId);
        role.setRoleScope("SPACE");
        if (role.getRoleType() == null || role.getRoleType().isBlank()) {
            role.setRoleType("CUSTOM");
        }
        save(role);
    }
}

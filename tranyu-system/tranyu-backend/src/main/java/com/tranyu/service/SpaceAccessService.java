package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SpaceMember;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.SpaceMemberMapper;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpaceAccessService {

    private final SpaceMemberMapper spaceMemberMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final TenantAccessService tenantAccessService;

    public boolean canAccessSpace(Long userId, String tenantId, String spaceId) {
        if (userId == null || tenantId == null || tenantId.isBlank() || spaceId == null || spaceId.isBlank()) {
            return false;
        }
        if (isSpaceSuperAdmin(userId, tenantId)) {
            return true;
        }
        return spaceMemberMapper.selectCount(new LambdaQueryWrapper<SpaceMember>()
                .eq(SpaceMember::getTenantId, tenantId)
                .eq(SpaceMember::getSpaceId, spaceId)
                .eq(SpaceMember::getUserId, userId)) > 0;
    }

    public boolean canManageSpace(Long userId, String tenantId, String spaceId) {
        if (userId == null || tenantId == null || tenantId.isBlank() || spaceId == null || spaceId.isBlank()) {
            return false;
        }
        if (isSpaceOwner(userId, spaceId)) {
            return true;
        }
        if (isSpaceSuperAdmin(userId, tenantId)) {
            return true;
        }
        if (tenantAccessService.canManageTenant(userId, tenantId)) {
            return true;
        }
        // 预留：后续扩展 space_role 的管理能力
        return false;
    }

    private boolean isSpaceOwner(Long userId, String spaceId) {
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
                .eq(SysRole::getRoleScope, "SPACE")
                .eq(SysRole::getSpaceId, spaceId)
                .eq(SysRole::getRoleCode, RoleBoundary.SPACE_OWNER)
                .eq(SysRole::getDeleted, 0)) > 0;
    }

    private boolean isSpaceSuperAdmin(Long userId, String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
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
                .eq(SysRole::getTenantId, tenantId)
                .eq(SysRole::getRoleScope, "TENANT")
                .eq(SysRole::getRoleCode, RoleBoundary.SPACE_SUPER_ADMIN)
                .eq(SysRole::getDeleted, 0)) > 0;
    }
}

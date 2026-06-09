package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PermissionSubjectResolver {

    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;

    public Set<PermissionSubject> resolveSubjects(Long userId, String tenantId, String spaceId) {
        Set<PermissionSubject> subjects = new HashSet<>();
        if (userId == null) {
            return subjects;
        }
        subjects.add(new PermissionSubject("USER", String.valueOf(userId)));

        if (spaceId == null || spaceId.isBlank()) {
            return subjects;
        }

        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId)
        );
        if (rels.isEmpty()) {
            return subjects;
        }
        List<Long> roleIds = rels.stream().map(SysUserRole::getRoleId).distinct().toList();
        if (roleIds.isEmpty()) {
            return subjects;
        }
        List<SysRole> roles = roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>()
                        .in(SysRole::getId, roleIds)
                        .eq(SysRole::getRoleScope, "SPACE")
                        .eq(SysRole::getSpaceId, spaceId)
                        .eq(SysRole::getDeleted, 0)
        );
        for (SysRole role : roles) {
            subjects.add(new PermissionSubject("SPACE_ROLE", String.valueOf(role.getId())));
        }
        return subjects;
    }
}

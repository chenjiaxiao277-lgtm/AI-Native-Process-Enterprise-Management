package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.entity.SysDept;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUser;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.SysDeptMapper;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import com.tranyu.dto.UserDTOs;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 用户服务：分页查询、新增/编辑、角色分配、逻辑删除、启用/禁用
 */
@Service
@RequiredArgsConstructor
public class SysUserService {

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysDeptMapper deptMapper;
    private final SysRoleService sysRoleService;

    private static final BCryptPasswordEncoder PASSWORD_ENCODER = new BCryptPasswordEncoder();

    public Page<SysUser> page(int current, int size,
                              String username, String realName, Long deptId, Integer status) {
        Page<SysUser> page = new Page<>(current, size);
        LambdaQueryWrapper<SysUser> q = new LambdaQueryWrapper<>();
        if (username != null && !username.isBlank()) {
            q.like(SysUser::getUsername, username);
        }
        if (realName != null && !realName.isBlank()) {
            q.like(SysUser::getRealName, realName);
        }
        if (deptId != null) {
            q.eq(SysUser::getDeptId, deptId);
        }
        if (status != null) {
            q.eq(SysUser::getStatus, status);
        }
        q.orderByDesc(SysUser::getCreateTime);
        Page<SysUser> result = userMapper.selectPage(page, q);
        enrichUsers(result.getRecords());
        return result;
    }

    private void enrichUsers(List<SysUser> users) {
        if (users == null || users.isEmpty()) return;
        List<Long> userIds = users.stream().map(SysUser::getId).toList();

        // 部门名称
        Set<Long> deptIds = users.stream()
                .map(SysUser::getDeptId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, SysDept> deptMap = deptIds.isEmpty()
                ? Map.of()
                : deptMapper.selectBatchIds(deptIds).stream().collect(Collectors.toMap(SysDept::getId, d -> d));

        // 用户-角色关系
        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().in(SysUserRole::getUserId, userIds)
        );
        Map<Long, List<Long>> userRoleIds = new HashMap<>();
        for (SysUserRole r : rels) {
            userRoleIds.computeIfAbsent(r.getUserId(), k -> new ArrayList<>()).add(r.getRoleId());
        }
        Set<Long> allRoleIds = rels.stream().map(SysUserRole::getRoleId).collect(Collectors.toSet());
        Map<Long, SysRole> roleMap = allRoleIds.isEmpty()
                ? Map.of()
                : roleMapper.selectBatchIds(allRoleIds).stream().collect(Collectors.toMap(SysRole::getId, r -> r));

        for (SysUser u : users) {
            if (u.getDeptId() != null) {
                SysDept d = deptMap.get(u.getDeptId());
                if (d != null) u.setDeptName(d.getDeptName());
            }
            List<Long> rids = userRoleIds.getOrDefault(u.getId(), List.of());
            u.setRoleIds(rids);
            List<String> roleNames = rids.stream()
                    .map(roleMap::get)
                    .filter(Objects::nonNull)
                    .map(SysRole::getRoleName)
                    .toList();
            u.setRoleNames(roleNames);
        }
    }

    public SysUser getById(Long id) {
        SysUser u = userMapper.selectById(id);
        if (u == null) return null;
        enrichUsers(List.of(u));
        return u;
    }

    @Transactional(rollbackFor = Exception.class)
    public void createUser(SysUser user, List<Long> roleIds) {
        // 默认启用、未删除
        user.setStatus(user.getStatus() != null ? user.getStatus() : 1);
        user.setDeleted(0);
        // 默认密码 123456 加密
        user.setPassword(PASSWORD_ENCODER.encode("123456"));
        userMapper.insert(user);
        saveUserRoles(user.getId(), roleIds);
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateUser(SysUser user, List<Long> roleIds) {
        // 不允许通过此接口直接改密码
        user.setPassword(null);
        userMapper.updateById(user);
        if (roleIds != null) {
            userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, user.getId()));
            saveUserRoles(user.getId(), roleIds);
        }
    }

    private void saveUserRoles(Long userId, List<Long> roleIds) {
        if (userId == null || roleIds == null) return;
        for (Long rid : roleIds) {
            SysUserRole rel = new SysUserRole();
            rel.setUserId(userId);
            rel.setRoleId(rid);
            userRoleMapper.insert(rel);
        }
    }

    public void changeStatus(Long id, Integer status) {
        SysUser u = new SysUser();
        u.setId(id);
        u.setStatus(status);
        userMapper.updateById(u);
    }

    public void logicDelete(Long id) {
        SysUser u = new SysUser();
        u.setId(id);
        u.setDeleted(1);
        userMapper.updateById(u);
    }

    public List<SysUser> listUsers(String tenantId, String username, String realName, Integer status) {
        LambdaQueryWrapper<SysUser> q = new LambdaQueryWrapper<>();
        if (tenantId != null && !tenantId.isBlank()) {
            q.eq(SysUser::getTenantId, tenantId);
        }
        if (username != null && !username.isBlank()) {
            q.like(SysUser::getUsername, username);
        }
        if (realName != null && !realName.isBlank()) {
            q.like(SysUser::getRealName, realName);
        }
        if (status != null) {
            q.eq(SysUser::getStatus, status);
        }
        q.orderByDesc(SysUser::getCreateTime);
        List<SysUser> users = userMapper.selectList(q);
        enrichUsers(users);
        return users;
    }

    public SysUser getUserDetail(Long id) {
        return getById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void createUser(UserDTOs.UserCreateRequest req) {
        SysUser user = new SysUser();
        user.setTenantId(req.getTenantId());
        user.setUsername(req.getUsername());
        user.setRealName(req.getRealName());
        user.setDeptId(req.getDeptId());
        user.setStatus(req.getStatus());
        user.setPhone(req.getPhone());
        user.setEmail(req.getEmail());
        user.setGender(req.getGender());
        List<Long> roleIds = req.getRoleIds();
        if ((roleIds == null || roleIds.isEmpty()) && req.getRoleCode() != null && !req.getRoleCode().isBlank()) {
            String roleCode = req.getRoleCode().trim();
            String roleName = RoleBoundary.SPACE_OWNER.equals(roleCode) ? "空间管理员" :
                    RoleBoundary.SPACE_USER.equals(roleCode) ? "空间普通用户" : roleCode;
            Long roleId = sysRoleService.ensureTenantRole(req.getTenantId(), roleCode, roleName);
            if (roleId != null) {
                roleIds = List.of(roleId);
            }
        }
        createUser(user, roleIds);
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateUser(Long id, UserDTOs.UserUpdateRequest req) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setRealName(req.getRealName());
        user.setDeptId(req.getDeptId());
        user.setStatus(req.getStatus());
        user.setPhone(req.getPhone());
        user.setEmail(req.getEmail());
        user.setGender(req.getGender());
        updateUser(user, req.getRoleIds());
    }

    public void enableUser(Long id) {
        changeStatus(id, 1);
    }

    public void disableUser(Long id) {
        changeStatus(id, 0);
    }

    @Transactional(rollbackFor = Exception.class)
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        if (userId == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (oldPassword == null || oldPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("密码不能为空");
        }
        SysUser user = userMapper.selectById(userId);
        if (user == null || Integer.valueOf(1).equals(user.getDeleted())) {
            throw new IllegalArgumentException("用户不存在");
        }
        if (!PASSWORD_ENCODER.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("原密码不正确");
        }
        user.setPassword(PASSWORD_ENCODER.encode(newPassword));
        userMapper.updateById(user);
    }
}

package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.tranyu.config.JwtConfig;
import com.tranyu.entity.SysDept;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUser;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.SysDeptMapper;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import com.tranyu.util.PasswordEncoderUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 登录服务：用户名密码校验、账号状态校验、Token 生成、当前用户信息查询
 */
@Service
@RequiredArgsConstructor
public class LoginService {

    private final SysUserMapper userMapper;
    private final SysDeptMapper deptMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final PermissionQueryService permissionQueryService;
    private final PasswordEncoderUtil passwordEncoderUtil;
    private final JwtConfig jwtConfig;

    /**
     * 执行登录校验：
     * 1. 校验用户是否存在
     * 2. 校验账号是否启用
     * 3. 校验密码是否正确（BCrypt）
     * 4. 生成 JWT Token 并返回基础用户信息
     */
    public LoginResult login(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new IllegalArgumentException("用户名或密码不能为空");
        }
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>()
                        .eq(SysUser::getUsername, username)
                        .eq(SysUser::getDeleted, 0)
                        .last("limit 1")
        );
        if (user == null) {
            throw new IllegalArgumentException("用户名错误");
        }
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new IllegalArgumentException("账号已禁用，请联系管理员");
        }
        if (!passwordEncoderUtil.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("密码错误");
        }

        // 生成 Token
        String token = jwtConfig.generateToken(user.getId(), user.getUsername());

        // 组装前端需要的用户信息
        CurrentUserInfo info = buildUserInfo(user);

        LoginResult result = new LoginResult();
        result.setToken(token);
        result.setUser(info);
        return result;
    }

    /**
     * 根据 Token 查询当前用户信息
     */
    public CurrentUserInfo getCurrentUser(String token) {
        Long userId = jwtConfig.getUserId(token);
        if (userId == null) {
            return null;
        }
        SysUser user = userMapper.selectById(userId);
        if (user == null || Objects.equals(user.getDeleted(), 1)) {
            return null;
        }
        return buildUserInfo(user);
    }

    private CurrentUserInfo buildUserInfo(SysUser user) {
        CurrentUserInfo info = new CurrentUserInfo();
        info.setId(user.getId());
        info.setUsername(user.getUsername());
        info.setRealName(user.getRealName());
        info.setTenantId(user.getTenantId());

        // 部门名称
        if (user.getDeptId() != null) {
            SysDept dept = deptMapper.selectById(user.getDeptId());
            if (dept != null) {
                info.setDeptName(dept.getDeptName());
            }
        }

        // 角色名称列表
        List<SysUserRole> rels = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>()
                        .eq(SysUserRole::getUserId, user.getId())
        );
        if (!rels.isEmpty()) {
            List<Long> roleIds = rels.stream().map(SysUserRole::getRoleId).toList();
            Map<Long, SysRole> roleMap = roleMapper.selectBatchIds(roleIds).stream()
                    .collect(Collectors.toMap(SysRole::getId, r -> r));
            List<String> roleNames = new ArrayList<>();
            for (SysUserRole r : rels) {
                SysRole role = roleMap.get(r.getRoleId());
                if (role != null) {
                    roleNames.add(role.getRoleName());
                    if (role.getRoleCode() != null && !role.getRoleCode().isBlank()) {
                        roleNames.add(role.getRoleCode());
                    }
                }
            }
            info.setRoles(roleNames);
        }
        try {
            info.setResourceSummary(permissionQueryService.queryCurrentUserSummary(user.getId()));
        } catch (Exception ignore) {
            // 发布环境初始化不完整时，允许登录先成功，资源摘要回退为空
            info.setResourceSummary(PermissionQueryService.PermissionResourceSummary.empty(
                    user.getTenantId() == null || user.getTenantId().isBlank() ? "default" : user.getTenantId(),
                    0L
            ));
        }
        return info;
    }

    /** 登录成功返回结果：包含 Token 和基础用户信息 */
    @Data
    public static class LoginResult {
        private String token;
        private CurrentUserInfo user;
    }

    /** 当前登录用户信息：用户名、姓名、角色、部门 */
    @Data
    public static class CurrentUserInfo {
        private Long id;
        private String username;
        private String realName;
        private String tenantId;
        private String deptName;
        private List<String> roles;
        @JsonIgnore
        private PermissionQueryService.PermissionResourceSummary resourceSummary;
    }
}

package com.tranyu.ai.crud.service;

import com.tranyu.ai.crud.mapper.PlatformPermissionMapper;
import com.tranyu.ai.crud.mapper.PlatformRoleMapper;
import com.tranyu.ai.crud.mapper.PlatformUserMapper;
import com.tranyu.ai.crud.common.exception.ErrorCode;
import com.tranyu.ai.crud.common.exception.BusinessException;
import com.tranyu.ai.crud.model.entity.PlatformPermissionEntity;
import com.tranyu.ai.crud.model.entity.PlatformRoleEntity;
import com.tranyu.ai.crud.model.entity.PlatformUserEntity;
import com.tranyu.ai.crud.common.page.PageQuery;
import com.tranyu.ai.crud.common.page.PageResult;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 用户、角色、权限基础查询服务。
 */
@Service
public class PlatformIdentityService {

    private final PlatformUserMapper platformUserMapper;
    private final PlatformRoleMapper platformRoleMapper;
    private final PlatformPermissionMapper platformPermissionMapper;

    public PlatformIdentityService(PlatformUserMapper platformUserMapper,
                                   PlatformRoleMapper platformRoleMapper,
                                   PlatformPermissionMapper platformPermissionMapper) {
        this.platformUserMapper = platformUserMapper;
        this.platformRoleMapper = platformRoleMapper;
        this.platformPermissionMapper = platformPermissionMapper;
    }

    /**
     * 查询当前用户基础信息。
     */
    public PlatformUserEntity getCurrentUser() {
        return requireCurrentUser();
    }

    /**
     * 查询当前用户角色列表。
     */
    public List<PlatformRoleEntity> getCurrentUserRoles() {
        requireCurrentUser();
        return platformUserMapper.selectCurrentUserRoles(requireTenantId(), requireCurrentUserId());
    }

    /**
     * 查询当前用户权限编码列表。
     */
    public List<String> getCurrentUserPermissions() {
        Long tenantId = requireTenantId();
        Long userId = requireCurrentUserId();
        requireCurrentUser();
        Long spaceId = getSpaceId();
        return spaceId == null
                ? platformPermissionMapper.selectCurrentUserPermissionCodes(tenantId, userId)
                : platformPermissionMapper.selectCurrentUserPermissionCodesBySpace(tenantId, spaceId, userId);
    }

    /**
     * 分页查询用户列表。
     */
    public PageResult<PlatformUserEntity> pageUsers(PageQuery pageQuery, String keyword) {
        Long tenantId = requireTenantId();
        long total = platformUserMapper.countUsers(tenantId, keyword);
        List<PlatformUserEntity> records = platformUserMapper.selectUsers(
                tenantId,
                keyword,
                pageQuery.getPageSize(),
                offset(pageQuery)
        );
        return PageResult.of(records, total, pageQuery.getPageNo(), pageQuery.getPageSize());
    }

    /**
     * 分页查询角色列表。
     */
    public PageResult<PlatformRoleEntity> pageRoles(PageQuery pageQuery, String keyword) {
        Long tenantId = requireTenantId();
        long total = platformRoleMapper.countRoles(tenantId, keyword);
        List<PlatformRoleEntity> records = platformRoleMapper.selectRoles(
                tenantId,
                keyword,
                pageQuery.getPageSize(),
                offset(pageQuery)
        );
        return PageResult.of(records, total, pageQuery.getPageNo(), pageQuery.getPageSize());
    }

    /**
     * 查询权限列表。
     */
    public List<PlatformPermissionEntity> listPermissions() {
        Long tenantId = requireTenantId();
        Long spaceId = getSpaceId();
        return spaceId == null
                ? platformPermissionMapper.selectPermissions(tenantId)
                : platformPermissionMapper.selectPermissionsBySpace(tenantId, spaceId);
    }

    private Long requireTenantId() {
        String tenantId = TenantContext.get();
        if (tenantId == null || tenantId.isBlank()) {
            throw new BusinessException(ErrorCode.BAD_REQUEST.getCode(), "缺少租户上下文");
        }
        return parseLong(tenantId, "租户上下文无效");
    }

    private Long requireCurrentUserId() {
        Long userId = AuthSubjectContext.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR);
        }
        return userId;
    }

    /**
     * 校验当前请求用户存在，避免后续接口在匿名或脏上下文下误返回空数据。
     */
    private PlatformUserEntity requireCurrentUser() {
        Long tenantId = requireTenantId();
        Long userId = requireCurrentUserId();
        PlatformUserEntity user = platformUserMapper.selectCurrentUser(tenantId, userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return user;
    }

    private Long getSpaceId() {
        String spaceId = SpaceContext.get();
        if (spaceId == null || spaceId.isBlank()) {
            return null;
        }
        return parseLong(spaceId, "空间上下文无效");
    }

    private long offset(PageQuery pageQuery) {
        long pageNo = Math.max(pageQuery.getPageNo(), 1L);
        long pageSize = Math.max(pageQuery.getPageSize(), 1L);
        return (pageNo - 1) * pageSize;
    }

    private Long parseLong(String value, String message) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BusinessException(ErrorCode.BAD_REQUEST.getCode(), message);
        }
    }
}

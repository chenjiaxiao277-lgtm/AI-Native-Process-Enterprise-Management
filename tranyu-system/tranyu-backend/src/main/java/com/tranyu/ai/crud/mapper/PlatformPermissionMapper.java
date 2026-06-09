package com.tranyu.ai.crud.mapper;

import com.tranyu.ai.crud.model.entity.PlatformPermissionEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 平台权限查询 Mapper。
 */
@Mapper
public interface PlatformPermissionMapper {

    /**
     * 查询当前用户权限编码列表。
     */
    @Select("""
            SELECT DISTINCT pr.resource_code
            FROM tr_permission_resource pr
            INNER JOIN tr_permission_role_resource rr ON rr.resource_id = pr.id
            INNER JOIN tr_org_user_role ur ON ur.role_id = rr.role_id
            WHERE pr.tenant_id = #{tenantId}
              AND ur.tenant_id = #{tenantId}
              AND ur.user_id = #{userId}
              AND pr.deleted_flag = 0
              AND rr.deleted_flag = 0
              AND ur.deleted_flag = 0
            ORDER BY pr.resource_code
            """)
    List<String> selectCurrentUserPermissionCodes(@Param("tenantId") Long tenantId,
                                                  @Param("userId") Long userId);

    /**
     * 查询当前用户权限编码列表（按空间过滤）。
     */
    @Select("""
            SELECT DISTINCT pr.resource_code
            FROM tr_permission_resource pr
            INNER JOIN tr_permission_role_resource rr ON rr.resource_id = pr.id
            INNER JOIN tr_org_user_role ur ON ur.role_id = rr.role_id
            WHERE pr.tenant_id = #{tenantId}
              AND ur.tenant_id = #{tenantId}
              AND ur.user_id = #{userId}
              AND pr.space_id = #{spaceId}
              AND pr.deleted_flag = 0
              AND rr.deleted_flag = 0
              AND ur.deleted_flag = 0
            ORDER BY pr.resource_code
            """)
    List<String> selectCurrentUserPermissionCodesBySpace(@Param("tenantId") Long tenantId,
                                                         @Param("spaceId") Long spaceId,
                                                         @Param("userId") Long userId);

    /**
     * 查询权限列表。
     */
    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_id AS spaceId,
                   resource_code AS resourceCode,
                   resource_name AS resourceName,
                   resource_type AS resourceType,
                   parent_id AS parentId,
                   path,
                   status,
                   sort_no AS sortNo,
                   created_time AS createdTime,
                   updated_time AS updatedTime
            FROM tr_permission_resource
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            ORDER BY sort_no ASC, id ASC
            """)
    List<PlatformPermissionEntity> selectPermissions(@Param("tenantId") Long tenantId);

    /**
     * 查询权限列表（按空间过滤）。
     */
    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_id AS spaceId,
                   resource_code AS resourceCode,
                   resource_name AS resourceName,
                   resource_type AS resourceType,
                   parent_id AS parentId,
                   path,
                   status,
                   sort_no AS sortNo,
                   created_time AS createdTime,
                   updated_time AS updatedTime
            FROM tr_permission_resource
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
              AND space_id = #{spaceId}
            ORDER BY sort_no ASC, id ASC
            """)
    List<PlatformPermissionEntity> selectPermissionsBySpace(@Param("tenantId") Long tenantId, @Param("spaceId") Long spaceId);
}

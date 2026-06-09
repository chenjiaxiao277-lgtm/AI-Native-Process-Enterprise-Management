package com.tranyu.ai.crud.mapper;

import com.tranyu.ai.crud.model.entity.PlatformRoleEntity;
import com.tranyu.ai.crud.model.entity.PlatformUserEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 平台用户查询 Mapper。
 */
@Mapper
public interface PlatformUserMapper {

    /**
     * 查询当前用户基础信息。
     */
    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   username,
                   real_name AS realName,
                   mobile,
                   email,
                   avatar_url AS avatarUrl,
                   status,
                   last_login_time AS lastLoginTime,
                   created_time AS createdTime,
                   updated_time AS updatedTime
            FROM tr_org_user
            WHERE tenant_id = #{tenantId}
              AND id = #{userId}
              AND deleted_flag = 0
            """)
    PlatformUserEntity selectCurrentUser(@Param("tenantId") Long tenantId, @Param("userId") Long userId);

    /**
     * 查询当前用户角色列表。
     */
    @Select("""
            SELECT DISTINCT r.id,
                   r.tenant_id AS tenantId,
                   r.role_code AS roleCode,
                   r.role_name AS roleName,
                   r.role_type AS roleType,
                   r.status,
                   r.sort_no AS sortNo,
                   r.created_time AS createdTime,
                   r.updated_time AS updatedTime
            FROM tr_org_role r
            INNER JOIN tr_org_user_role ur ON ur.role_id = r.id
            WHERE ur.tenant_id = #{tenantId}
              AND ur.user_id = #{userId}
              AND ur.deleted_flag = 0
              AND r.deleted_flag = 0
            ORDER BY r.sort_no ASC, r.id ASC
            """)
    List<PlatformRoleEntity> selectCurrentUserRoles(@Param("tenantId") Long tenantId, @Param("userId") Long userId);

    /**
     * 查询用户总数。
     */
    @Select("""
            <script>
            SELECT COUNT(1)
            FROM tr_org_user
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (username LIKE CONCAT('%', #{keyword}, '%')
                OR real_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            </script>
            """)
    long countUsers(@Param("tenantId") Long tenantId, @Param("keyword") String keyword);

    /**
     * 分页查询用户。
     */
    @Select("""
            <script>
            SELECT id,
                   tenant_id AS tenantId,
                   username,
                   real_name AS realName,
                   mobile,
                   email,
                   avatar_url AS avatarUrl,
                   status,
                   last_login_time AS lastLoginTime,
                   created_time AS createdTime,
                   updated_time AS updatedTime
            FROM tr_org_user
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (username LIKE CONCAT('%', #{keyword}, '%')
                OR real_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            ORDER BY id DESC
            LIMIT #{pageSize} OFFSET #{offset}
            </script>
            """)
    List<PlatformUserEntity> selectUsers(@Param("tenantId") Long tenantId,
                                         @Param("keyword") String keyword,
                                         @Param("pageSize") long pageSize,
                                         @Param("offset") long offset);
}

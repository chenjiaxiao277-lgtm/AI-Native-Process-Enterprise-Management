package com.tranyu.ai.crud.mapper;

import com.tranyu.ai.crud.model.entity.PlatformRoleEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 平台角色查询 Mapper。
 */
@Mapper
public interface PlatformRoleMapper {

    /**
     * 查询角色总数。
     */
    @Select("""
            <script>
            SELECT COUNT(1)
            FROM tr_org_role
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (role_code LIKE CONCAT('%', #{keyword}, '%')
                OR role_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            </script>
            """)
    long countRoles(@Param("tenantId") Long tenantId, @Param("keyword") String keyword);

    /**
     * 分页查询角色。
     */
    @Select("""
            <script>
            SELECT id,
                   tenant_id AS tenantId,
                   role_code AS roleCode,
                   role_name AS roleName,
                   role_type AS roleType,
                   status,
                   sort_no AS sortNo,
                   created_time AS createdTime,
                   updated_time AS updatedTime
            FROM tr_org_role
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (role_code LIKE CONCAT('%', #{keyword}, '%')
                OR role_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            ORDER BY sort_no ASC, id ASC
            LIMIT #{pageSize} OFFSET #{offset}
            </script>
            """)
    List<PlatformRoleEntity> selectRoles(@Param("tenantId") Long tenantId,
                                         @Param("keyword") String keyword,
                                         @Param("pageSize") long pageSize,
                                         @Param("offset") long offset);
}

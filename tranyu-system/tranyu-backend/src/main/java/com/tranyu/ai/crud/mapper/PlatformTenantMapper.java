package com.tranyu.ai.crud.mapper;

import com.tranyu.ai.crud.model.entity.PlatformTenantEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 平台租户查询与维护 Mapper。
 */
@Mapper
public interface PlatformTenantMapper {

    @Select("""
            SELECT id,
                   tenant_code AS tenantCode,
                   tenant_name AS tenantName,
                   tenant_type AS tenantType,
                   status,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_tenant
            WHERE id = #{id}
              AND deleted_flag = 0
            """)
    PlatformTenantEntity selectById(@Param("id") Long id);

    @Select("""
            SELECT id,
                   tenant_code AS tenantCode,
                   tenant_name AS tenantName,
                   tenant_type AS tenantType,
                   status,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_tenant
            WHERE tenant_code = #{tenantCode}
              AND deleted_flag = 0
            LIMIT 1
            """)
    PlatformTenantEntity selectByCode(@Param("tenantCode") String tenantCode);

    @Select("""
            <script>
            SELECT COUNT(1)
            FROM tr_tenant
            WHERE deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (tenant_code LIKE CONCAT('%', #{keyword}, '%')
                   OR tenant_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            </script>
            """)
    long countTenants(@Param("keyword") String keyword);

    @Select("""
            <script>
            SELECT id,
                   tenant_code AS tenantCode,
                   tenant_name AS tenantName,
                   tenant_type AS tenantType,
                   status,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_tenant
            WHERE deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (tenant_code LIKE CONCAT('%', #{keyword}, '%')
                   OR tenant_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            ORDER BY id DESC
            LIMIT #{pageSize} OFFSET #{offset}
            </script>
            """)
    List<PlatformTenantEntity> selectTenants(@Param("keyword") String keyword,
                                             @Param("pageSize") long pageSize,
                                             @Param("offset") long offset);

    @Insert("""
            INSERT INTO tr_tenant (
                tenant_code,
                tenant_name,
                tenant_type,
                status,
                remark,
                created_by,
                updated_by,
                deleted_flag,
                version
            ) VALUES (
                #{tenantCode},
                #{tenantName},
                #{tenantType},
                #{status},
                #{remark},
                #{createdBy},
                #{updatedBy},
                #{deletedFlag},
                #{version}
            )
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertTenant(PlatformTenantEntity tenant);

    @Update("""
            UPDATE tr_tenant
            SET tenant_code = #{tenantCode},
                tenant_name = #{tenantName},
                status = #{status},
                remark = #{remark},
                updated_by = #{updatedBy},
                updated_time = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE id = #{id}
              AND deleted_flag = 0
            """)
    int updateTenant(PlatformTenantEntity tenant);

    @Update("""
            UPDATE tr_tenant
            SET status = 'ENABLED',
                updated_by = #{updatedBy},
                updated_time = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE id = #{id}
              AND deleted_flag = 0
            """)
    int enableTenant(@Param("id") Long id, @Param("updatedBy") Long updatedBy);

    @Update("""
            UPDATE tr_tenant
            SET status = 'DISABLED',
                updated_by = #{updatedBy},
                updated_time = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE id = #{id}
              AND deleted_flag = 0
            """)
    int disableTenant(@Param("id") Long id, @Param("updatedBy") Long updatedBy);

    @Select("""
            <script>
            SELECT COUNT(1)
            FROM tr_tenant
            WHERE tenant_code = #{tenantCode}
              AND deleted_flag = 0
            <if test="excludeId != null">
              AND id &lt;&gt; #{excludeId}
            </if>
            </script>
            """)
    long countByCode(@Param("tenantCode") String tenantCode, @Param("excludeId") Long excludeId);

    @Select("""
            SELECT id,
                   tenant_code AS tenantCode,
                   tenant_name AS tenantName,
                   tenant_type AS tenantType,
                   status,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_tenant
            WHERE tenant_code = 'TRANYU_DEFAULT'
              AND deleted_flag = 0
            LIMIT 1
            """)
    PlatformTenantEntity selectDefaultTenant();

    @Select("""
            SELECT id,
                   tenant_code AS tenantCode,
                   tenant_name AS tenantName,
                   tenant_type AS tenantType,
                   status,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_tenant
            WHERE id = #{id}
              AND deleted_flag = 0
              AND status = 'ENABLED'
            LIMIT 1
            """)
    PlatformTenantEntity selectEnabledById(@Param("id") Long id);
}

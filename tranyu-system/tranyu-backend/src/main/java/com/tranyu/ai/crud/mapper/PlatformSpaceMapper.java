package com.tranyu.ai.crud.mapper;

import com.tranyu.ai.crud.model.entity.PlatformSpaceEntity;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 平台空间查询与维护 Mapper。
 */
@Mapper
public interface PlatformSpaceMapper {

    @Select("""
            <script>
            SELECT COUNT(1)
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (space_code LIKE CONCAT('%', #{keyword}, '%')
                   OR space_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            </script>
            """)
    long countSpaces(@Param("tenantId") Long tenantId, @Param("keyword") String keyword);

    @Select("""
            <script>
            SELECT id,
                   tenant_id AS tenantId,
                   space_code AS spaceCode,
                   space_name AS spaceName,
                   space_type AS spaceType,
                   status,
                   sort_no AS sortNo,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND deleted_flag = 0
            <if test="keyword != null and keyword != ''">
              AND (space_code LIKE CONCAT('%', #{keyword}, '%')
                   OR space_name LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            ORDER BY sort_no ASC, id ASC
            LIMIT #{pageSize} OFFSET #{offset}
            </script>
            """)
    List<PlatformSpaceEntity> selectSpaces(@Param("tenantId") Long tenantId,
                                           @Param("keyword") String keyword,
                                           @Param("pageSize") long pageSize,
                                           @Param("offset") long offset);

    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_code AS spaceCode,
                   space_name AS spaceName,
                   space_type AS spaceType,
                   status,
                   sort_no AS sortNo,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND id = #{id}
              AND deleted_flag = 0
            LIMIT 1
            """)
    PlatformSpaceEntity selectByTenantAndId(@Param("tenantId") Long tenantId, @Param("id") Long id);

    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_code AS spaceCode,
                   space_name AS spaceName,
                   space_type AS spaceType,
                   status,
                   sort_no AS sortNo,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND space_code = #{spaceCode}
              AND deleted_flag = 0
            LIMIT 1
            """)
    PlatformSpaceEntity selectByTenantAndCode(@Param("tenantId") Long tenantId, @Param("spaceCode") String spaceCode);

    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_code AS spaceCode,
                   space_name AS spaceName,
                   space_type AS spaceType,
                   status,
                   sort_no AS sortNo,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND space_type = #{spaceType}
              AND deleted_flag = 0
            ORDER BY sort_no ASC, id ASC
            """)
    List<PlatformSpaceEntity> selectByTenantAndType(@Param("tenantId") Long tenantId, @Param("spaceType") String spaceType);

    @Insert("""
            INSERT INTO tr_space (
                tenant_id,
                space_code,
                space_name,
                space_type,
                status,
                sort_no,
                remark,
                created_by,
                updated_by,
                deleted_flag,
                version
            ) VALUES (
                #{tenantId},
                #{spaceCode},
                #{spaceName},
                #{spaceType},
                #{status},
                #{sortNo},
                #{remark},
                #{createdBy},
                #{updatedBy},
                #{deletedFlag},
                #{version}
            )
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insertSpace(PlatformSpaceEntity space);

    @Update("""
            UPDATE tr_space
            SET space_code = #{spaceCode},
                space_name = #{spaceName},
                space_type = #{spaceType},
                status = #{status},
                remark = #{remark},
                updated_by = #{updatedBy},
                updated_time = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE tenant_id = #{tenantId}
              AND id = #{id}
              AND deleted_flag = 0
            """)
    int updateSpace(PlatformSpaceEntity space);

    @Update("""
            UPDATE tr_space
            SET status = 'ENABLED',
                updated_by = #{updatedBy},
                updated_time = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE tenant_id = #{tenantId}
              AND id = #{id}
              AND deleted_flag = 0
            """)
    int enableSpace(@Param("tenantId") Long tenantId, @Param("id") Long id, @Param("updatedBy") Long updatedBy);

    @Update("""
            UPDATE tr_space
            SET status = 'DISABLED',
                updated_by = #{updatedBy},
                updated_time = CURRENT_TIMESTAMP,
                version = version + 1
            WHERE tenant_id = #{tenantId}
              AND id = #{id}
              AND deleted_flag = 0
            """)
    int disableSpace(@Param("tenantId") Long tenantId, @Param("id") Long id, @Param("updatedBy") Long updatedBy);

    @Select("""
            <script>
            SELECT COUNT(1)
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND space_code = #{spaceCode}
              AND deleted_flag = 0
            <if test="excludeId != null">
              AND id &lt;&gt; #{excludeId}
            </if>
            </script>
            """)
    long countByCode(@Param("tenantId") Long tenantId,
                     @Param("spaceCode") String spaceCode,
                     @Param("excludeId") Long excludeId);

    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_code AS spaceCode,
                   space_name AS spaceName,
                   space_type AS spaceType,
                   status,
                   sort_no AS sortNo,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND space_code = 'MASTER'
              AND deleted_flag = 0
            LIMIT 1
            """)
    PlatformSpaceEntity selectDefaultMasterSpace(@Param("tenantId") Long tenantId);

    @Select("""
            SELECT id,
                   tenant_id AS tenantId,
                   space_code AS spaceCode,
                   space_name AS spaceName,
                   space_type AS spaceType,
                   status,
                   sort_no AS sortNo,
                   remark,
                   created_by AS createdBy,
                   created_time AS createdTime,
                   updated_by AS updatedBy,
                   updated_time AS updatedTime,
                   deleted_flag AS deletedFlag,
                   version
            FROM tr_space
            WHERE tenant_id = #{tenantId}
              AND space_code IN ('LTC', 'IPD', 'PPM')
              AND deleted_flag = 0
            ORDER BY sort_no ASC, id ASC
            """)
    List<PlatformSpaceEntity> selectDefaultBusinessSpaces(@Param("tenantId") Long tenantId);
}

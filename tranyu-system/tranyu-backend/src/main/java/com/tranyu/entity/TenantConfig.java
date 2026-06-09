package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 租户配置（扩展性预留）
 */
@Data
@TableName("ltc_tenant_config")
public class TenantConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("tenant_name")
    private String tenantName;

    /**
     * 租户等级：small / medium / large
     */
    private String tier;

    @TableField("max_users")
    private Integer maxUsers;

    @TableField("max_spaces")
    private Integer maxSpaces;

    @TableField("max_work_items")
    private Long maxWorkItems;

    @TableField("db_shard_hint")
    private String dbShardHint;

    @TableField("cache_shard_hint")
    private String cacheShardHint;

    @TableField("default_template_json")
    private String defaultTemplateJson;

    /**
     * 状态：active / inactive
     */
    private String status;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

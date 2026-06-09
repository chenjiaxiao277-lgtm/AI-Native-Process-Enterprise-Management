package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 审批资源动作配置。
 */
@Data
@TableName("ltc_permission_action_config")
public class PermissionActionConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private Long spaceId;

    @TableField("resource_group")
    private String resourceGroup;

    @TableField("action_code")
    private String actionCode;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_code")
    private String resourceCode;

    private Integer sort;

    private Integer status;

    @TableLogic
    private Integer deleted;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

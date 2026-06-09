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
 * 角色与权限资源绑定
 */
@Data
@TableName("ltc_permission_role_resource")
public class PermissionRoleResource {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private Long spaceId;

    @TableField("role_id")
    private Long roleId;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_code")
    private String resourceCode;

    @TableField("effect_type")
    private String effectType;

    @TableField("action_scope")
    private String actionScope;

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

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
 * 角色实体，对应表：sys_role
 */
@Data
@TableName("sys_role")
public class SysRole {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private String spaceId;

    @TableField("role_name")
    private String roleName;

    @TableField("role_code")
    private String roleCode;

    @TableField("role_scope")
    private String roleScope;

    @TableField("role_type")
    private String roleType;

    /**
     * 状态：0 禁用，1 启用
     */
    private Integer status;

    /**
     * 逻辑删除：0 未删，1 已删
     */
    @TableLogic
    private Integer deleted;

    private String description;

    private Integer sort;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ltc_permission_menu_binding")
public class PermissionMenuBinding {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private String spaceId;

    @TableField("policy_id")
    private Long policyId;

    @TableField("menu_key")
    private String menuKey;

    private String effect;

    private Integer status;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

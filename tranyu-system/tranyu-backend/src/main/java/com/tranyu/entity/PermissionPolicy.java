package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ltc_permission_policy")
public class PermissionPolicy {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private String spaceId;

    @TableField("subject_type")
    private String subjectType;

    @TableField("subject_id")
    private String subjectId;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_key")
    private String resourceKey;

    private String action;

    private String effect;

    @TableField("policy_name")
    private String policyName;

    @TableField("policy_scope")
    private String policyScope;

    private Integer status;

    private String remark;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

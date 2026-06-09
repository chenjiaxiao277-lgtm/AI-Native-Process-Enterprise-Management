package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 权限判定审计日志。
 */
@Data
@TableName("ltc_permission_audit_log")
public class PermissionAuditLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private Long spaceId;

    @TableField("user_id")
    private Long userId;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_id")
    private String resourceId;

    @TableField("resource_group")
    private String resourceGroup;

    @TableField("process_instance_id")
    private String processInstanceId;

    @TableField("task_id")
    private String taskId;

    private String action;

    @TableField("allowed")
    private Integer allowed;

    @TableField("reason_code")
    private String reasonCode;

    @TableField("matched_policy_ids")
    private String matchedPolicyIds;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

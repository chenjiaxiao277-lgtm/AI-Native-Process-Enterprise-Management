package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 权限审计报表视图行。
 */
@Data
@TableName("vw_permission_audit_report")
public class PermissionAuditReportRow {

    @TableField("tenant_id")
    private String tenantId;

    @TableField("space_id")
    private Long spaceId;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_id")
    private String resourceId;

    @TableField("audit_day")
    private String auditDay;

    private String action;

    @TableField("reason_code")
    private String reasonCode;

    @TableField("reason_label")
    private String reasonLabel;

    @TableField("resource_group")
    private String resourceGroup;

    @TableField("total_count")
    private Long totalCount;

    @TableField("allow_count")
    private Long allowCount;

    @TableField("deny_count")
    private Long denyCount;
}

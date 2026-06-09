package com.tranyu.service;

import lombok.Data;

import java.time.LocalDate;

/**
 * 审计查询统一 DTO。
 */
@Data
public class ApprovalAuditQuery {

    private String tenantId;

    private Long spaceId;

    private Long userId;

    private String processInstanceId;

    private String taskId;

    private String resourceType;

    private String resourceId;

    private String resourceGroup;

    private String action;

    private String reasonCode;

    private LocalDate auditDayFrom;

    private LocalDate auditDayTo;

    private Long pageNo;

    private Long pageSize;
}

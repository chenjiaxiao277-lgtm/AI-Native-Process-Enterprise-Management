package com.tranyu.ai.crud.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 平台租户返回对象。
 */
@Data
public class TenantVO {
    private Long id;
    private String tenantCode;
    private String tenantName;
    private String status;
    private String remark;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}

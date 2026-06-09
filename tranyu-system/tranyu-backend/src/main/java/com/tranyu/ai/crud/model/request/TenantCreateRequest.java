package com.tranyu.ai.crud.model.request;

import lombok.Data;

/**
 * 平台租户创建入参。
 */
@Data
public class TenantCreateRequest {
    private String tenantCode;
    private String tenantName;
    private String status;
    private String remark;
}

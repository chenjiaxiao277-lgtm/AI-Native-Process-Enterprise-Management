package com.tranyu.ai.crud.model.request;

import lombok.Data;

/**
 * 平台租户更新入参。
 */
@Data
public class TenantUpdateRequest {
    private String tenantCode;
    private String tenantName;
    private String status;
    private String remark;
}

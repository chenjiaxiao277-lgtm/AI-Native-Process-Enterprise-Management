package com.tranyu.ai.crud.model.entity;

import com.tranyu.ai.crud.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台租户实体。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PlatformTenantEntity extends BaseEntity {
    private String tenantCode;
    private String tenantName;
    private String tenantType;
    private String status;
    private String remark;
}

package com.tranyu.ai.crud.model.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 平台角色：对应租户或空间下角色定义。
 */
@Data
public class PlatformRoleEntity {
    private Long id;
    private Long tenantId;
    private String roleCode;
    private String roleName;
    private String roleType;
    private String status;
    private Integer sortNo;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}

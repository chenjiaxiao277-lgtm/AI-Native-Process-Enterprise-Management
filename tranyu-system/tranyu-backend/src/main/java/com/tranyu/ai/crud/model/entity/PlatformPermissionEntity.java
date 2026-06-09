package com.tranyu.ai.crud.model.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 平台权限资源：对应可授权资源节点。
 */
@Data
public class PlatformPermissionEntity {
    private Long id;
    private Long tenantId;
    private Long spaceId;
    private String resourceCode;
    private String resourceName;
    private String resourceType;
    private Long parentId;
    private String path;
    private String status;
    private Integer sortNo;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}

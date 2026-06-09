package com.tranyu.ai.crud.model.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 平台用户：对应租户内用户基础信息。
 */
@Data
public class PlatformUserEntity {
    private Long id;
    private Long tenantId;
    private String username;
    private String realName;
    private String mobile;
    private String email;
    private String avatarUrl;
    private String status;
    private LocalDateTime lastLoginTime;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}

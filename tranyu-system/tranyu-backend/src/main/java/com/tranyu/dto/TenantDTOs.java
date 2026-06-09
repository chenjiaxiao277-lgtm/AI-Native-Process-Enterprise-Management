package com.tranyu.dto;

import lombok.Data;

import java.time.LocalDateTime;

public class TenantDTOs {

    @Data
    public static class TenantCreateRequest {
        private String tenantId;
        private String tenantName;
        private Integer status;
        private String remark;
        private Long adminUserId;
        private String adminUsername;
        private String adminPassword;
        private String adminRealName;
        private Integer accountLimit;
        private LocalDateTime adminExpireAt;
    }

    @Data
    public static class TenantUpdateRequest {
        private String tenantName;
        private Integer status;
        private String remark;
        private Integer accountLimit;
        private LocalDateTime adminExpireAt;
    }

    @Data
    public static class TenantAdminResetRequest {
        private String adminUsername;
        private String adminPassword;
        private String adminRealName;
        private Integer accountLimit;
        private LocalDateTime adminExpireAt;
    }

    @Data
    public static class TenantResponse {
        private Long id;
        private String tenantId;
        private String tenantName;
        private Integer status;
        private String remark;
        private Integer accountLimit;
        private LocalDateTime adminExpireAt;
        private LocalDateTime createTime;
        private LocalDateTime updateTime;
    }

    @Data
    public static class TenantDefaultTemplateRequest {
        private String templateJson;
    }

    @Data
    public static class TenantDefaultTemplateResponse {
        private String templateJson;
    }

    @Data
    public static class TenantFeatureToggleRequest {
        private String featureKey;
        private Integer enabled;
        private String remark;
    }

    @Data
    public static class TenantFeatureToggleResponse {
        private Long id;
        private String featureKey;
        private Integer enabled;
        private String remark;
    }
}

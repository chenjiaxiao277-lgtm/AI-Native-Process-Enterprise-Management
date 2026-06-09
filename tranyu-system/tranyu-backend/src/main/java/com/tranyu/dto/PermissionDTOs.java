package com.tranyu.dto;

import lombok.Data;

import java.time.LocalDateTime;

public class PermissionDTOs {

    @Data
    public static class PermissionPolicyResponse {
        private Long id;
        private String tenantId;
        private String spaceId;
        private String subjectType;
        private String subjectId;
        private String resourceType;
        private String action;
        private String effect;
        private Integer status;
        private String remark;
        private LocalDateTime createTime;
    }

    @Data
    public static class PermissionPolicyRequest {
        private String subjectType;
        private String subjectId;
        private String resourceType;
        private String action;
        private String effect;
        private String remark;
    }

    @Data
    public static class PermissionBasicRequest {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionBasicResponse {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionDataRequest {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionDataResponse {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionActionRequest {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionActionResponse {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionFeatureRequest {
        private String spaceId;
        private String summary;
    }

    @Data
    public static class PermissionFeatureResponse {
        private String spaceId;
        private String summary;
    }
}

package com.tranyu.dto;

import lombok.Data;

import java.time.LocalDateTime;

public class SpaceDTOs {

    @Data
    public static class SpaceCreateRequest {
        private String tenantId;
        private String spaceId;
        private String spaceName;
        private Integer status;
        private String description;
        private Long ownerUserId;
    }

    @Data
    public static class SpaceUpdateRequest {
        private String spaceName;
        private Integer status;
        private Integer archived;
        private String description;
    }

    @Data
    public static class SpaceResponse {
        private Long id;
        private String tenantId;
        private String spaceId;
        private String spaceName;
        private Integer status;
        private Integer archived;
        private String description;
        private LocalDateTime createTime;
        private LocalDateTime updateTime;
    }

    @Data
    public static class SpaceMemberRequest {
        private Long userId;
        private Long roleId;
        private Integer status;
    }

    @Data
    public static class SpaceMemberCreateRequest {
        private Long userId;
        private Long roleId;
        private Integer status;
    }

    @Data
    public static class SpaceMemberResponse {
        private Long id;
        private Long userId;
        private Long roleId;
        private Integer status;
        private LocalDateTime createTime;
    }

    @Data
    public static class SpaceGroupRequest {
        private String groupName;
        private String groupCode;
        private Integer status;
        private String description;
    }

    @Data
    public static class SpaceGroupCreateRequest {
        private String groupName;
        private String groupCode;
        private Integer status;
        private String description;
    }

    @Data
    public static class SpaceGroupResponse {
        private Long id;
        private String groupName;
        private String groupCode;
        private Integer status;
        private String description;
        private LocalDateTime createTime;
    }

    @Data
    public static class SpaceRoleCreateRequest {
        private String roleName;
        private String roleCode;
        private Integer status;
        private String description;
        private Integer sort;
    }

    @Data
    public static class SpaceRoleResponse {
        private Long id;
        private String roleName;
        private String roleCode;
        private Integer status;
        private String description;
        private Integer sort;
    }

    @Data
    public static class SpaceRelationAuthCreateRequest {
        private String targetSpaceId;
        private String resourceType;
        private String resourceKey;
        private Integer status;
        private String remark;
    }

    @Data
    public static class SpaceRelationAuthResponse {
        private Long id;
        private String targetSpaceId;
        private String resourceType;
        private String resourceKey;
        private Integer status;
        private String remark;
        private LocalDateTime expireTime;
        private LocalDateTime createTime;
    }
}

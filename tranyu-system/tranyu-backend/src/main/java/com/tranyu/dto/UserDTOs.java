package com.tranyu.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

public class UserDTOs {

    @Data
    public static class UserCreateRequest {
        private String tenantId;
        private String username;
        private String realName;
        private Long deptId;
        private Integer status;
        private String phone;
        private String email;
        private Integer gender;
        private List<Long> roleIds;
        private String roleCode;
    }

    @Data
    public static class UserUpdateRequest {
        private String realName;
        private Long deptId;
        private Integer status;
        private String phone;
        private String email;
        private Integer gender;
        private List<Long> roleIds;
    }

    @Data
    public static class UserResponse {
        private Long id;
        private String tenantId;
        private String username;
        private String realName;
        private Integer status;
        private String phone;
        private String email;
        private LocalDateTime createTime;
        private LocalDateTime updateTime;
    }

    @Data
    public static class UserAuthAccountResponse {
        private Long id;
        private String authType;
        private String account;
        private Integer status;
    }

    @Data
    public static class UserStatusLogResponse {
        private Long id;
        private Integer fromStatus;
        private Integer toStatus;
        private String reason;
        private Long operatorId;
        private LocalDateTime createTime;
    }

    @Data
    public static class ChangePasswordRequest {
        private String oldPassword;
        private String newPassword;
        private String confirmPassword;
    }
}

package com.tranyu.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginServiceJsonContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void currentUserInfo_shouldIgnoreResourceSummaryDuringSerialization() throws Exception {
        LoginService.CurrentUserInfo info = new LoginService.CurrentUserInfo();
        info.setId(1L);
        info.setUsername("admin");
        info.setRealName("管理员");
        info.setDeptName("研发部");
        info.setRoles(java.util.List.of("空间管理员"));
        info.setResourceSummary(new PermissionQueryService.PermissionResourceSummary(
                "default",
                0L,
                java.util.List.of(),
                PermissionQueryService.ResourceBucket.empty(),
                PermissionQueryService.ResourceBucket.empty(),
                PermissionQueryService.ResourceBucket.empty()
        ));

        String json = objectMapper.writeValueAsString(info);

        assertThat(json).contains("\"id\":1");
        assertThat(json).contains("\"username\":\"admin\"");
        assertThat(json).contains("\"roles\":[\"空间管理员\"]");
        assertThat(json).doesNotContain("resourceSummary");
    }
}

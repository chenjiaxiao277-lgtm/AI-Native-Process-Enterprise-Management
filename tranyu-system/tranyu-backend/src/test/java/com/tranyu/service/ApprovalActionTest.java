package com.tranyu.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ApprovalActionTest {

    @Test
    void normalizeCode_shouldUseUnifiedEnum() {
        assertThat(ApprovalAction.normalizeCode("APPROVE")).isEqualTo("approve");
        assertThat(ApprovalAction.normalizeCode("transfer")).isEqualTo("transfer");
        assertThat(ApprovalAction.explain("reject")).isEqualTo("审批驳回");
        assertThat(PermissionReasonCode.explain("DEFAULT_DENY")).isEqualTo("未命中允许规则，默认拒绝");
    }
}

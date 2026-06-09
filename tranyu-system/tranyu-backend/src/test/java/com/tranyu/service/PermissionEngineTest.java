package com.tranyu.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionEngineTest {

    @Mock
    private PermissionQueryService permissionQueryService;

    @InjectMocks
    private PermissionEngine permissionEngine;

    @Test
    void evaluate_shouldAllowApproveActionAndReturnExplanation() {
        PermissionQueryService.EffectivePolicy allowPolicy = new PermissionQueryService.EffectivePolicy(
                101L, 1L, 0L, "page", "work_item_manage_page", "allow", "view,create,edit,delete,approve"
        );
        when(permissionQueryService.queryUserPolicySnapshot(1L, "default", 9L))
                .thenReturn(new PermissionQueryService.PermissionPolicySnapshot(
                        "default",
                        9L,
                        Map.of("page|work_item_manage_page|approve", List.of(allowPolicy)),
                        Map.of()
                ));

        PermissionEngine.PermissionDecision decision = permissionEngine.evaluate(
                new PermissionEngine.PermissionCheckRequest(
                        1L,
                        "default",
                        9L,
                        PermissionFacade.ACTION_APPROVE,
                        List.of(PermissionEngine.PermissionTarget.page("work_item_manage_page"))
                )
        );

        assertThat(decision.isAllowed()).isTrue();
        assertThat(decision.getReasonCode()).isEqualTo(PermissionReasonCode.ALLOW_MATCHED_POLICY.code());
        assertThat(decision.getMatchedPolicyIds()).containsExactly(101L);
        assertThat(decision.getMatchedTarget().getResourceCode()).isEqualTo("work_item_manage_page");
    }

    @Test
    void evaluate_shouldDenyWhenDenyPolicyMatches() {
        PermissionQueryService.EffectivePolicy denyPolicy = new PermissionQueryService.EffectivePolicy(
                202L, 1L, 9L, "page", "work_item_manage_page", "deny", "delete"
        );
        when(permissionQueryService.queryUserPolicySnapshot(1L, "default", 9L))
                .thenReturn(new PermissionQueryService.PermissionPolicySnapshot(
                        "default",
                        9L,
                        Map.of(),
                        Map.of("page|work_item_manage_page|delete", List.of(denyPolicy))
                ));

        PermissionEngine.PermissionDecision decision = permissionEngine.evaluate(
                new PermissionEngine.PermissionCheckRequest(
                        1L,
                        "default",
                        9L,
                        PermissionFacade.ACTION_DELETE,
                        List.of(PermissionEngine.PermissionTarget.page("work_item_manage_page"))
                )
        );

        assertThat(decision.isAllowed()).isFalse();
        assertThat(decision.getReasonCode()).isEqualTo(PermissionReasonCode.DENY_MATCHED_POLICY.code());
        assertThat(decision.getMatchedPolicyIds()).containsExactly(202L);
    }

    @Test
    void evaluate_shouldDefaultDenyWhenNoPolicyMatches() {
        when(permissionQueryService.queryUserPolicySnapshot(1L, "default", 9L))
                .thenReturn(new PermissionQueryService.PermissionPolicySnapshot(
                        "default",
                        9L,
                        Map.of(),
                        Map.of()
                ));

        PermissionEngine.PermissionDecision decision = permissionEngine.evaluate(
                new PermissionEngine.PermissionCheckRequest(
                        1L,
                        "default",
                        9L,
                        PermissionFacade.ACTION_VIEW,
                        List.of(PermissionEngine.PermissionTarget.router("space_work_items"))
                )
        );

        assertThat(decision.isAllowed()).isFalse();
        assertThat(decision.getReasonCode()).isEqualTo(PermissionReasonCode.DEFAULT_DENY.code());
        assertThat(decision.getMatchedPolicyIds()).isEmpty();
    }
}

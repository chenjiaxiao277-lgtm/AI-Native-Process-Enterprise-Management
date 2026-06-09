package com.tranyu.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionFacadeTest {

    @Mock
    private PermissionEngine permissionEngine;
    @Mock
    private PermissionActionConfigService permissionActionConfigService;

    @InjectMocks
    private PermissionFacade permissionFacade;

    @Test
    void checkWorkItemAction_shouldNormalizePrefixedSpaceId() {
        when(permissionEngine.evaluate(any())).thenReturn(
                PermissionEngine.PermissionDecision.allow(
                        PermissionEngine.PermissionTarget.page("work_item_manage_page"),
                        PermissionFacade.ACTION_VIEW,
                        PermissionReasonCode.ALLOW_MATCHED_POLICY.code(),
                        List.of(1L)
                )
        );

        permissionFacade.checkWorkItemAction("default", "space_1774660589968", PermissionFacade.ACTION_VIEW);

        ArgumentCaptor<PermissionEngine.PermissionCheckRequest> captor = ArgumentCaptor.forClass(PermissionEngine.PermissionCheckRequest.class);
        verify(permissionEngine).evaluate(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(1774660589968L);
    }
}

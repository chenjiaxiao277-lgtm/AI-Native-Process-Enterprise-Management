package com.tranyu.service;

import com.tranyu.entity.PermissionActionConfig;
import com.tranyu.mapper.PermissionActionConfigMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionActionConfigServiceTest {

    @Mock
    private PermissionActionConfigMapper permissionActionConfigMapper;

    @InjectMocks
    private PermissionActionConfigService service;

    @Test
    void loadTargets_shouldReadConfiguredTargetsFirst() {
        PermissionActionConfig page = config(2L, 0L, "approve", "page", "workflow_approval_page", 10);
        PermissionActionConfig router = config(3L, 0L, "approve", "router", "workflow_tasks", 20);
        when(permissionActionConfigMapper.selectList(any())).thenReturn(List.of(page, router));

        List<PermissionEngine.PermissionTarget> targets = service.loadTargets(
                "default",
                0L,
                PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL,
                "APPROVE",
                List.of(PermissionEngine.PermissionTarget.menu("fallback"))
        );

        assertThat(targets).containsExactly(
                PermissionEngine.PermissionTarget.page("workflow_approval_page"),
                PermissionEngine.PermissionTarget.router("workflow_tasks")
        );
    }

    @Test
    void loadTargets_shouldFallbackWhenNoConfigFound() {
        when(permissionActionConfigMapper.selectList(any())).thenReturn(List.of());
        List<PermissionEngine.PermissionTarget> fallback = List.of(PermissionEngine.PermissionTarget.page("workflow_approval_page"));

        List<PermissionEngine.PermissionTarget> targets = service.loadTargets(
                "default",
                0L,
                PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL,
                "terminate",
                fallback
        );

        assertThat(targets).isEqualTo(fallback);
    }

    private PermissionActionConfig config(Long id, Long spaceId, String action, String type, String code, int sort) {
        PermissionActionConfig config = new PermissionActionConfig();
        config.setId(id);
        config.setTenantId("default");
        config.setSpaceId(spaceId);
        config.setResourceGroup(PermissionActionConfigService.RESOURCE_GROUP_WORKFLOW_APPROVAL);
        config.setActionCode(action);
        config.setResourceType(type);
        config.setResourceCode(code);
        config.setSort(sort);
        config.setStatus(1);
        config.setDeleted(0);
        return config;
    }
}

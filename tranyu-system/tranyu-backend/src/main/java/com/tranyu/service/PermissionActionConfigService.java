package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.PermissionActionConfig;
import com.tranyu.mapper.PermissionActionConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

/**
 * 审批资源动作配置读取服务。
 */
@Service
@RequiredArgsConstructor
public class PermissionActionConfigService {

    public static final String RESOURCE_GROUP_WORKFLOW_APPROVAL = "workflow_approval";

    private final PermissionActionConfigMapper permissionActionConfigMapper;

    public List<PermissionEngine.PermissionTarget> loadTargets(String tenantId,
                                                               Long spaceId,
                                                               String resourceGroup,
                                                               String actionCode,
                                                               List<PermissionEngine.PermissionTarget> fallbackTargets) {
        String normalizedAction = ApprovalAction.normalizeCode(actionCode);
        List<PermissionActionConfig> configs = permissionActionConfigMapper.selectList(
                new LambdaQueryWrapper<PermissionActionConfig>()
                        .eq(PermissionActionConfig::getTenantId, tenantId)
                        .in(PermissionActionConfig::getSpaceId, List.of(0L, spaceId == null ? 0L : spaceId))
                        .eq(PermissionActionConfig::getResourceGroup, resourceGroup)
                        .in(PermissionActionConfig::getActionCode, List.of(normalizedAction, "*"))
                        .eq(PermissionActionConfig::getStatus, 1)
                        .eq(PermissionActionConfig::getDeleted, 0)
                        .orderByAsc(PermissionActionConfig::getSpaceId)
                        .orderByAsc(PermissionActionConfig::getSort)
                        .orderByAsc(PermissionActionConfig::getId)
        );
        if (configs.isEmpty()) {
            return fallbackTargets;
        }
        return configs.stream()
                .sorted(Comparator.comparing(PermissionActionConfig::getSpaceId, Comparator.nullsLast(Long::compareTo)).reversed()
                        .thenComparing(PermissionActionConfig::getSort, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(PermissionActionConfig::getId, Comparator.nullsLast(Long::compareTo)))
                .map(config -> new PermissionEngine.PermissionTarget(config.getResourceType(), config.getResourceCode()))
                .distinct()
                .toList();
    }
}

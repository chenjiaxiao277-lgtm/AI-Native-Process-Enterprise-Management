package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.PermissionPolicy;
import com.tranyu.mapper.PermissionPolicyMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PermissionPolicyQueryService {

    private final PermissionPolicyMapper permissionPolicyMapper;

    public List<PermissionPolicy> listMatchedPolicies(Set<PermissionSubject> subjects,
                                                      String tenantId,
                                                      String spaceId,
                                                      String resourceType,
                                                      String action,
                                                      String resourceKey) {
        if (subjects == null || subjects.isEmpty()) {
            return Collections.emptyList();
        }
        List<PermissionPolicy> exact = queryPolicies(subjects, tenantId, spaceId, resourceType, action, resourceKey);
        if (!exact.isEmpty()) {
            return exact;
        }
        return queryPolicies(subjects, tenantId, spaceId, resourceType, action, null);
    }

    private List<PermissionPolicy> queryPolicies(Set<PermissionSubject> subjects,
                                                 String tenantId,
                                                 String spaceId,
                                                 String resourceType,
                                                 String action,
                                                 String resourceKey) {
        List<PermissionPolicy> results = new ArrayList<>();
        for (PermissionSubject subject : subjects) {
            LambdaQueryWrapper<PermissionPolicy> q = new LambdaQueryWrapper<PermissionPolicy>()
                    .eq(PermissionPolicy::getTenantId, tenantId)
                    .eq(PermissionPolicy::getResourceType, resourceType)
                    .eq(PermissionPolicy::getAction, action)
                    .eq(PermissionPolicy::getSubjectType, subject.getType())
                    .eq(PermissionPolicy::getSubjectId, subject.getId());
            if (spaceId != null && !spaceId.isBlank()) {
                q.eq(PermissionPolicy::getSpaceId, spaceId);
            }
            if (resourceKey == null || resourceKey.isBlank()) {
                q.and(w -> w.isNull(PermissionPolicy::getResourceKey).or().eq(PermissionPolicy::getResourceKey, ""));
            } else {
                q.eq(PermissionPolicy::getResourceKey, resourceKey);
            }
            results.addAll(permissionPolicyMapper.selectList(q));
        }
        return results;
    }
}

package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.PermissionFeatureBinding;
import com.tranyu.mapper.PermissionFeatureBindingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionFeatureBindingService {

    private final PermissionFeatureBindingMapper permissionFeatureBindingMapper;

    public List<PermissionFeatureBinding> listByPolicy(String tenantId, String spaceId, Long policyId) {
        LambdaQueryWrapper<PermissionFeatureBinding> q = new LambdaQueryWrapper<PermissionFeatureBinding>()
                .eq(PermissionFeatureBinding::getTenantId, tenantId)
                .eq(PermissionFeatureBinding::getPolicyId, policyId);
        if (spaceId != null) {
            q.eq(PermissionFeatureBinding::getSpaceId, spaceId);
        }
        return permissionFeatureBindingMapper.selectList(q);
    }

    public void save(PermissionFeatureBinding binding) {
        if (binding.getId() == null) {
            permissionFeatureBindingMapper.insert(binding);
        } else {
            permissionFeatureBindingMapper.updateById(binding);
        }
    }
}

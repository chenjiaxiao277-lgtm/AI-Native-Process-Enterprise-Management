package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.PermissionMenuBinding;
import com.tranyu.mapper.PermissionMenuBindingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionMenuBindingService {

    private final PermissionMenuBindingMapper permissionMenuBindingMapper;

    public List<PermissionMenuBinding> listByPolicy(String tenantId, String spaceId, Long policyId) {
        LambdaQueryWrapper<PermissionMenuBinding> q = new LambdaQueryWrapper<PermissionMenuBinding>()
                .eq(PermissionMenuBinding::getTenantId, tenantId)
                .eq(PermissionMenuBinding::getPolicyId, policyId);
        if (spaceId != null) {
            q.eq(PermissionMenuBinding::getSpaceId, spaceId);
        }
        return permissionMenuBindingMapper.selectList(q);
    }

    public void save(PermissionMenuBinding binding) {
        if (binding.getId() == null) {
            permissionMenuBindingMapper.insert(binding);
        } else {
            permissionMenuBindingMapper.updateById(binding);
        }
    }
}

package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.PermissionFieldBinding;
import com.tranyu.mapper.PermissionFieldBindingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionFieldBindingService {

    private final PermissionFieldBindingMapper permissionFieldBindingMapper;

    public List<PermissionFieldBinding> listByPolicy(String tenantId, String spaceId, Long policyId) {
        LambdaQueryWrapper<PermissionFieldBinding> q = new LambdaQueryWrapper<PermissionFieldBinding>()
                .eq(PermissionFieldBinding::getTenantId, tenantId)
                .eq(PermissionFieldBinding::getPolicyId, policyId);
        if (spaceId != null) {
            q.eq(PermissionFieldBinding::getSpaceId, spaceId);
        }
        return permissionFieldBindingMapper.selectList(q);
    }

    public void save(PermissionFieldBinding binding) {
        if (binding.getId() == null) {
            permissionFieldBindingMapper.insert(binding);
        } else {
            permissionFieldBindingMapper.updateById(binding);
        }
    }
}

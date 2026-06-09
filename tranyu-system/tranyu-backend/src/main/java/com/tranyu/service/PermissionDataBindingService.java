package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.PermissionDataBinding;
import com.tranyu.mapper.PermissionDataBindingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionDataBindingService {

    private final PermissionDataBindingMapper permissionDataBindingMapper;

    public List<PermissionDataBinding> listByPolicy(String tenantId, String spaceId, Long policyId) {
        LambdaQueryWrapper<PermissionDataBinding> q = new LambdaQueryWrapper<PermissionDataBinding>()
                .eq(PermissionDataBinding::getTenantId, tenantId)
                .eq(PermissionDataBinding::getPolicyId, policyId);
        if (spaceId != null) {
            q.eq(PermissionDataBinding::getSpaceId, spaceId);
        }
        return permissionDataBindingMapper.selectList(q);
    }

    public void save(PermissionDataBinding binding) {
        if (binding.getId() == null) {
            permissionDataBindingMapper.insert(binding);
        } else {
            permissionDataBindingMapper.updateById(binding);
        }
    }
}

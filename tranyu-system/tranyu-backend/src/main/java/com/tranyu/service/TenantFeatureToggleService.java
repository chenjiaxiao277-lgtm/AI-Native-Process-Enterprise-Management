package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.TenantFeatureToggle;
import com.tranyu.mapper.TenantFeatureToggleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantFeatureToggleService {

    private final TenantFeatureToggleMapper tenantFeatureToggleMapper;

    public List<TenantFeatureToggle> listByTenant(String tenantId) {
        return tenantFeatureToggleMapper.selectList(new LambdaQueryWrapper<TenantFeatureToggle>()
                .eq(TenantFeatureToggle::getTenantId, tenantId));
    }

    public void save(TenantFeatureToggle toggle) {
        if (toggle.getId() == null) {
            tenantFeatureToggleMapper.insert(toggle);
        } else {
            tenantFeatureToggleMapper.updateById(toggle);
        }
    }

    public void saveOrUpdateToggle(String tenantId, TenantFeatureToggle toggle) {
        toggle.setTenantId(tenantId);
        TenantFeatureToggle existing = tenantFeatureToggleMapper.selectOne(
                new LambdaQueryWrapper<TenantFeatureToggle>()
                        .eq(TenantFeatureToggle::getTenantId, tenantId)
                        .eq(TenantFeatureToggle::getFeatureKey, toggle.getFeatureKey())
        );
        if (existing == null) {
            tenantFeatureToggleMapper.insert(toggle);
        } else {
            toggle.setId(existing.getId());
            tenantFeatureToggleMapper.updateById(toggle);
        }
    }
}

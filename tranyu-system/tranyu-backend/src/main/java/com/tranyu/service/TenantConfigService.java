package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.TenantConfig;
import com.tranyu.mapper.TenantConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantConfigService {

    private final TenantConfigMapper tenantConfigMapper;

    public TenantConfig getByTenantId(String tenantId) {
        return tenantConfigMapper.selectOne(new LambdaQueryWrapper<TenantConfig>()
                .eq(TenantConfig::getTenantId, tenantId));
    }

    public List<TenantConfig> listAll() {
        return tenantConfigMapper.selectList(new LambdaQueryWrapper<>());
    }

    public void save(TenantConfig config) {
        if (config.getId() == null) {
            tenantConfigMapper.insert(config);
        } else {
            tenantConfigMapper.updateById(config);
        }
    }

    public void saveDefaultTemplate(String tenantId, String templateJson) {
        TenantConfig existing = getByTenantId(tenantId);
        if (existing == null) {
            TenantConfig cfg = new TenantConfig();
            cfg.setTenantId(tenantId);
            cfg.setDefaultTemplateJson(templateJson);
            tenantConfigMapper.insert(cfg);
        } else {
            existing.setDefaultTemplateJson(templateJson);
            tenantConfigMapper.updateById(existing);
        }
    }
}

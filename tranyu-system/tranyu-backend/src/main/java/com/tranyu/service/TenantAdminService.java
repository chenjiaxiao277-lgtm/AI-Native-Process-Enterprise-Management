package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.TenantAdmin;
import com.tranyu.mapper.TenantAdminMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantAdminService {

    private final TenantAdminMapper tenantAdminMapper;

    public List<TenantAdmin> listByTenant(String tenantId) {
        return tenantAdminMapper.selectList(new LambdaQueryWrapper<TenantAdmin>()
                .eq(TenantAdmin::getTenantId, tenantId));
    }

    public void save(TenantAdmin admin) {
        if (admin.getId() == null) {
            tenantAdminMapper.insert(admin);
        } else {
            tenantAdminMapper.updateById(admin);
        }
    }

    public boolean exists(String tenantId, Long userId) {
        if (tenantId == null || tenantId.isBlank() || userId == null) {
            return false;
        }
        return tenantAdminMapper.selectCount(new LambdaQueryWrapper<TenantAdmin>()
                .eq(TenantAdmin::getTenantId, tenantId)
                .eq(TenantAdmin::getUserId, userId)) > 0;
    }

    public void removeByTenant(String tenantId) {
        if (tenantId == null || tenantId.isBlank()) {
            return;
        }
        tenantAdminMapper.delete(new LambdaQueryWrapper<TenantAdmin>()
                .eq(TenantAdmin::getTenantId, tenantId));
    }
}

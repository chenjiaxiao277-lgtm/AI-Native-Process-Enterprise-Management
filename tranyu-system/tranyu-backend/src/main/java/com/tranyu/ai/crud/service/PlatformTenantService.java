package com.tranyu.ai.crud.service;

import com.tranyu.ai.crud.common.context.AuthSubjectContext;
import com.tranyu.ai.crud.common.context.TenantContext;
import com.tranyu.ai.crud.common.exception.BusinessException;
import com.tranyu.ai.crud.common.exception.ErrorCode;
import com.tranyu.ai.crud.common.page.PageQuery;
import com.tranyu.ai.crud.common.page.PageResult;
import com.tranyu.ai.crud.mapper.PlatformTenantMapper;
import com.tranyu.ai.crud.model.entity.PlatformTenantEntity;
import com.tranyu.ai.crud.model.request.TenantCreateRequest;
import com.tranyu.ai.crud.model.request.TenantUpdateRequest;
import com.tranyu.ai.crud.model.vo.TenantVO;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 平台租户管理服务。
 */
@Service
public class PlatformTenantService {

    private static final String STATUS_ENABLED = "ENABLED";
    private static final String STATUS_DISABLED = "DISABLED";
    private static final String TENANT_TYPE_INTERNAL = "INTERNAL";

    private final PlatformTenantMapper platformTenantMapper;

    public PlatformTenantService(PlatformTenantMapper platformTenantMapper) {
        this.platformTenantMapper = platformTenantMapper;
    }

    public PageResult<TenantVO> pageTenants(PageQuery query, String keyword) {
        long total = platformTenantMapper.countTenants(normalizeKeyword(keyword));
        List<TenantVO> records = platformTenantMapper.selectTenants(
                        normalizeKeyword(keyword),
                        query.getPageSize(),
                        offset(query))
                .stream()
                .map(this::toVO)
                .toList();
        return PageResult.of(records, total, query.getPageNo(), query.getPageSize());
    }

    public TenantVO getTenantById(Long id) {
        return toVO(requireTenant(id));
    }

    public TenantVO createTenant(TenantCreateRequest request) {
        String tenantCode = requireTenantCode(request == null ? null : request.getTenantCode(), null);
        String tenantName = requireTenantName(request == null ? null : request.getTenantName());
        PlatformTenantEntity tenant = new PlatformTenantEntity();
        tenant.setTenantCode(tenantCode);
        tenant.setTenantName(tenantName);
        tenant.setTenantType(TENANT_TYPE_INTERNAL);
        tenant.setStatus(resolveStatus(request == null ? null : request.getStatus(), true));
        tenant.setRemark(normalizeText(request == null ? null : request.getRemark()));
        tenant.setCreatedBy(AuthSubjectContext.getCurrentUserId());
        tenant.setUpdatedBy(AuthSubjectContext.getCurrentUserId());
        tenant.setDeletedFlag(0);
        tenant.setVersion(0);
        platformTenantMapper.insertTenant(tenant);
        return toVO(requireTenant(tenant.getId()));
    }

    public TenantVO updateTenant(Long id, TenantUpdateRequest request) {
        PlatformTenantEntity existing = requireTenant(id);
        String tenantCode = requireTenantCode(request == null ? null : request.getTenantCode(), id);
        String tenantName = requireTenantName(request == null ? null : request.getTenantName());
        existing.setTenantCode(tenantCode);
        existing.setTenantName(tenantName);
        existing.setStatus(resolveStatus(request == null ? null : request.getStatus(), existing.getStatus()));
        existing.setRemark(normalizeText(request == null ? null : request.getRemark()));
        existing.setUpdatedBy(AuthSubjectContext.getCurrentUserId());
        platformTenantMapper.updateTenant(existing);
        return toVO(requireTenant(id));
    }

    public boolean enableTenant(Long id) {
        requireTenant(id);
        return platformTenantMapper.enableTenant(id, AuthSubjectContext.getCurrentUserId()) > 0;
    }

    public boolean disableTenant(Long id) {
        requireTenant(id);
        return platformTenantMapper.disableTenant(id, AuthSubjectContext.getCurrentUserId()) > 0;
    }

    public TenantVO getCurrentTenant() {
        return toVO(validateCurrentTenant());
    }

    public PlatformTenantEntity validateCurrentTenant() {
        String tenantId = TenantContext.get();
        if (tenantId == null || tenantId.isBlank()) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        Long id = parseLong(tenantId, "当前租户上下文无效");
        PlatformTenantEntity tenant = requireTenant(id);
        if (!STATUS_ENABLED.equalsIgnoreCase(tenant.getStatus())) {
            throw new BusinessException(ErrorCode.FORBIDDEN.getCode(), "当前租户已停用");
        }
        return tenant;
    }

    public TenantVO getDefaultTenant() {
        PlatformTenantEntity tenant = platformTenantMapper.selectDefaultTenant();
        if (tenant == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return toVO(tenant);
    }

    public PlatformTenantEntity getEnabledTenantById(Long id) {
        return platformTenantMapper.selectEnabledById(id);
    }

    private PlatformTenantEntity requireTenant(Long id) {
        if (id == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR);
        }
        PlatformTenantEntity tenant = platformTenantMapper.selectById(id);
        if (tenant == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return tenant;
    }

    private String requireTenantCode(String tenantCode, Long excludeId) {
        String value = normalizeCode(tenantCode);
        if (value == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "tenantCode不能为空");
        }
        if (platformTenantMapper.countByCode(value, excludeId) > 0) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR.getCode(), "tenantCode已存在");
        }
        return value;
    }

    private String requireTenantName(String tenantName) {
        String value = normalizeText(tenantName);
        if (value == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "tenantName不能为空");
        }
        return value;
    }

    private String resolveStatus(String status, boolean useDefaultEnabled) {
        return resolveStatus(status, useDefaultEnabled ? STATUS_ENABLED : null);
    }

    private String resolveStatus(String status, String defaultStatus) {
        String value = normalizeCode(status);
        if (value == null) {
            return defaultStatus == null ? STATUS_ENABLED : defaultStatus;
        }
        if (!STATUS_ENABLED.equals(value) && !STATUS_DISABLED.equals(value)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "status仅支持ENABLED或DISABLED");
        }
        return value;
    }

    private String normalizeKeyword(String keyword) {
        String value = normalizeText(keyword);
        return value == null ? null : value;
    }

    private String normalizeCode(String value) {
        String text = normalizeText(value);
        return text == null ? null : text.toUpperCase();
    }

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private long offset(PageQuery query) {
        long pageNo = Math.max(query.getPageNo(), 1L);
        long pageSize = Math.max(query.getPageSize(), 1L);
        return (pageNo - 1) * pageSize;
    }

    private Long parseLong(String value, String message) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), message);
        }
    }

    private TenantVO toVO(PlatformTenantEntity tenant) {
        TenantVO vo = new TenantVO();
        vo.setId(tenant.getId());
        vo.setTenantCode(tenant.getTenantCode());
        vo.setTenantName(tenant.getTenantName());
        vo.setStatus(tenant.getStatus());
        vo.setRemark(tenant.getRemark());
        vo.setCreatedTime(tenant.getCreatedTime());
        vo.setUpdatedTime(tenant.getUpdatedTime());
        return vo;
    }
}

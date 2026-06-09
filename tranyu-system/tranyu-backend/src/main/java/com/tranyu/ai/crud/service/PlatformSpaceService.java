package com.tranyu.ai.crud.service;

import com.tranyu.ai.crud.common.context.AuthSubjectContext;
import com.tranyu.ai.crud.common.context.SpaceContext;
import com.tranyu.ai.crud.common.context.TenantContext;
import com.tranyu.ai.crud.common.exception.BusinessException;
import com.tranyu.ai.crud.common.exception.ErrorCode;
import com.tranyu.ai.crud.common.page.PageQuery;
import com.tranyu.ai.crud.common.page.PageResult;
import com.tranyu.ai.crud.mapper.PlatformSpaceMapper;
import com.tranyu.ai.crud.model.entity.PlatformSpaceEntity;
import com.tranyu.ai.crud.model.enums.SpaceType;
import com.tranyu.ai.crud.model.request.SpaceCreateRequest;
import com.tranyu.ai.crud.model.request.SpaceUpdateRequest;
import com.tranyu.ai.crud.model.vo.SpaceVO;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 平台空间管理服务。
 */
@Service
public class PlatformSpaceService {

    private static final String STATUS_ENABLED = "ENABLED";
    private static final String STATUS_DISABLED = "DISABLED";

    private final PlatformSpaceMapper platformSpaceMapper;

    public PlatformSpaceService(PlatformSpaceMapper platformSpaceMapper) {
        this.platformSpaceMapper = platformSpaceMapper;
    }

    public PageResult<SpaceVO> pageSpaces(PageQuery query, String keyword) {
        Long tenantId = requireTenantId();
        long total = platformSpaceMapper.countSpaces(tenantId, normalizeText(keyword));
        List<SpaceVO> records = platformSpaceMapper.selectSpaces(
                        tenantId,
                        normalizeText(keyword),
                        query.getPageSize(),
                        offset(query))
                .stream()
                .map(this::toVO)
                .toList();
        return PageResult.of(records, total, query.getPageNo(), query.getPageSize());
    }

    public List<SpaceVO> listCurrentTenantSpaces() {
        Long tenantId = requireTenantId();
        return platformSpaceMapper.selectSpaces(tenantId, null, 1000, 0)
                .stream()
                .map(this::toVO)
                .toList();
    }

    public SpaceVO getSpaceById(Long id) {
        return toVO(requireSpace(requireTenantId(), id));
    }

    public SpaceVO createSpace(SpaceCreateRequest request) {
        Long tenantId = requireTenantId();
        String spaceCode = requireSpaceCode(tenantId, request == null ? null : request.getSpaceCode(), null);
        String spaceName = requireSpaceName(request == null ? null : request.getSpaceName());
        String spaceType = requireSpaceType(request == null ? null : request.getSpaceType());

        PlatformSpaceEntity entity = new PlatformSpaceEntity();
        entity.setTenantId(tenantId);
        entity.setSpaceCode(spaceCode);
        entity.setSpaceName(spaceName);
        entity.setSpaceType(spaceType);
        entity.setStatus(resolveStatus(request == null ? null : request.getStatus(), STATUS_ENABLED));
        entity.setRemark(normalizeText(request == null ? null : request.getRemark()));
        entity.setSortNo(0);
        entity.setCreatedBy(AuthSubjectContext.getCurrentUserId());
        entity.setUpdatedBy(AuthSubjectContext.getCurrentUserId());
        entity.setDeletedFlag(0);
        entity.setVersion(0);
        platformSpaceMapper.insertSpace(entity);
        return toVO(requireSpace(tenantId, entity.getId()));
    }

    public SpaceVO updateSpace(Long id, SpaceUpdateRequest request) {
        Long tenantId = requireTenantId();
        PlatformSpaceEntity existing = requireSpace(tenantId, id);
        existing.setSpaceCode(requireSpaceCode(tenantId, request == null ? null : request.getSpaceCode(), id));
        existing.setSpaceName(requireSpaceName(request == null ? null : request.getSpaceName()));
        existing.setSpaceType(requireSpaceType(request == null ? null : request.getSpaceType()));
        existing.setStatus(resolveStatus(request == null ? null : request.getStatus(), existing.getStatus()));
        existing.setRemark(normalizeText(request == null ? null : request.getRemark()));
        existing.setUpdatedBy(AuthSubjectContext.getCurrentUserId());
        platformSpaceMapper.updateSpace(existing);
        return toVO(requireSpace(tenantId, id));
    }

    public boolean enableSpace(Long id) {
        Long tenantId = requireTenantId();
        requireSpace(tenantId, id);
        return platformSpaceMapper.enableSpace(tenantId, id, AuthSubjectContext.getCurrentUserId()) > 0;
    }

    public boolean disableSpace(Long id) {
        Long tenantId = requireTenantId();
        requireSpace(tenantId, id);
        return platformSpaceMapper.disableSpace(tenantId, id, AuthSubjectContext.getCurrentUserId()) > 0;
    }

    public SpaceVO getCurrentSpace() {
        return toVO(validateCurrentSpace());
    }

    public PlatformSpaceEntity validateCurrentSpace() {
        Long tenantId = requireTenantId();
        String currentSpaceId = SpaceContext.get();
        if (currentSpaceId == null || currentSpaceId.isBlank()) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        Long id = parseLong(currentSpaceId, "当前空间上下文无效");
        PlatformSpaceEntity space = requireSpace(tenantId, id);
        if (!STATUS_ENABLED.equalsIgnoreCase(space.getStatus())) {
            throw new BusinessException(ErrorCode.FORBIDDEN.getCode(), "当前空间已停用");
        }
        return space;
    }

    public SpaceVO getDefaultMasterSpace() {
        PlatformSpaceEntity space = platformSpaceMapper.selectDefaultMasterSpace(requireTenantId());
        if (space == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return toVO(space);
    }

    public PlatformSpaceEntity getEnabledSpaceById(Long tenantId, Long id) {
        PlatformSpaceEntity space = platformSpaceMapper.selectByTenantAndId(tenantId, id);
        if (space == null || !STATUS_ENABLED.equalsIgnoreCase(space.getStatus())) {
            return null;
        }
        return space;
    }

    public PlatformSpaceEntity getMasterSpace(Long tenantId) {
        return platformSpaceMapper.selectDefaultMasterSpace(tenantId);
    }

    private Long requireTenantId() {
        String tenantId = TenantContext.get();
        if (tenantId == null || tenantId.isBlank()) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return parseLong(tenantId, "当前租户上下文无效");
    }

    private PlatformSpaceEntity requireSpace(Long tenantId, Long id) {
        if (id == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR);
        }
        PlatformSpaceEntity entity = platformSpaceMapper.selectByTenantAndId(tenantId, id);
        if (entity == null) {
            throw new BusinessException(ErrorCode.DATA_NOT_FOUND);
        }
        return entity;
    }

    private String requireSpaceCode(Long tenantId, String spaceCode, Long excludeId) {
        String value = normalizeCode(spaceCode);
        if (value == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "spaceCode不能为空");
        }
        if (platformSpaceMapper.countByCode(tenantId, value, excludeId) > 0) {
            throw new BusinessException(ErrorCode.BUSINESS_ERROR.getCode(), "spaceCode已存在");
        }
        return value;
    }

    private String requireSpaceName(String spaceName) {
        String value = normalizeText(spaceName);
        if (value == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "spaceName不能为空");
        }
        return value;
    }

    private String requireSpaceType(String spaceType) {
        String value = normalizeCode(spaceType);
        if (value == null) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "spaceType不能为空");
        }
        try {
            SpaceType.valueOf(value);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "spaceType不合法");
        }
        return value;
    }

    private String resolveStatus(String status, String defaultStatus) {
        String value = normalizeCode(status);
        if (value == null) {
            return defaultStatus;
        }
        if (!STATUS_ENABLED.equals(value) && !STATUS_DISABLED.equals(value)) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), "status仅支持ENABLED或DISABLED");
        }
        return value;
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

    private Long parseLong(String value, String message) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            throw new BusinessException(ErrorCode.PARAM_ERROR.getCode(), message);
        }
    }

    private long offset(PageQuery query) {
        long pageNo = Math.max(query.getPageNo(), 1L);
        long pageSize = Math.max(query.getPageSize(), 1L);
        return (pageNo - 1) * pageSize;
    }

    private SpaceVO toVO(PlatformSpaceEntity entity) {
        SpaceVO vo = new SpaceVO();
        vo.setId(entity.getId());
        vo.setTenantId(entity.getTenantId());
        vo.setSpaceCode(entity.getSpaceCode());
        vo.setSpaceName(entity.getSpaceName());
        vo.setSpaceType(entity.getSpaceType());
        vo.setStatus(entity.getStatus());
        vo.setRemark(entity.getRemark());
        vo.setCreatedTime(entity.getCreatedTime());
        vo.setUpdatedTime(entity.getUpdatedTime());
        return vo;
    }
}

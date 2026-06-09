package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SpaceRelationAuth;
import com.tranyu.mapper.SpaceRelationAuthMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpaceRelationAuthService {

    private static final String DEFAULT_TENANT_ID = "default";

    private final SpaceRelationAuthMapper mapper;
    private final PermissionFacade permissionFacade;

    public List<SpaceRelationAuth> listBySourceSpace(String tenantId, String sourceSpaceId, String resourceType) {
        permissionFacade.assertSpaceConfigReadable(tenantId, sourceSpaceId);
        LambdaQueryWrapper<SpaceRelationAuth> q = new LambdaQueryWrapper<SpaceRelationAuth>()
                .eq(SpaceRelationAuth::getTenantId, normalizeTenantId(tenantId))
                .eq(SpaceRelationAuth::getSourceSpaceId, sourceSpaceId)
                .orderByDesc(SpaceRelationAuth::getId);
        if (resourceType != null && !resourceType.isBlank()) {
            q.eq(SpaceRelationAuth::getResourceType, resourceType.trim());
        }
        return mapper.selectList(q);
    }

    public boolean hasReadableAuth(String tenantId,
                                   String sourceSpaceId,
                                   String targetSpaceId,
                                   String resourceType,
                                   String resourceKey) {
        if (sourceSpaceId == null || targetSpaceId == null || resourceType == null || resourceType.isBlank()) {
            return false;
        }
        if (sourceSpaceId.equals(targetSpaceId)) {
            return true;
        }
        LocalDateTime now = LocalDateTime.now();
        LambdaQueryWrapper<SpaceRelationAuth> q = new LambdaQueryWrapper<SpaceRelationAuth>()
                .eq(SpaceRelationAuth::getTenantId, normalizeTenantId(tenantId))
                .eq(SpaceRelationAuth::getSourceSpaceId, sourceSpaceId)
                .eq(SpaceRelationAuth::getTargetSpaceId, targetSpaceId)
                .eq(SpaceRelationAuth::getResourceType, resourceType.trim())
                .eq(SpaceRelationAuth::getStatus, 1)
                .and(w -> w.isNull(SpaceRelationAuth::getExpireTime).or().gt(SpaceRelationAuth::getExpireTime, now));

        String normalizedKey = normalizeResourceKey(resourceKey);
        if (normalizedKey == null) {
            q.isNull(SpaceRelationAuth::getResourceKey);
        } else {
            q.and(w -> w.isNull(SpaceRelationAuth::getResourceKey)
                    .or()
                    .eq(SpaceRelationAuth::getResourceKey, normalizedKey));
        }
        return mapper.selectCount(q) > 0;
    }

    public List<String> listReadableResourceKeys(String tenantId,
                                                 String sourceSpaceId,
                                                 String targetSpaceId,
                                                 String resourceType) {
        if (sourceSpaceId == null || targetSpaceId == null || resourceType == null || resourceType.isBlank()) {
            return List.of();
        }
        if (sourceSpaceId.equals(targetSpaceId)) {
            return List.of();
        }
        LocalDateTime now = LocalDateTime.now();
        LambdaQueryWrapper<SpaceRelationAuth> q = new LambdaQueryWrapper<SpaceRelationAuth>()
                .eq(SpaceRelationAuth::getTenantId, normalizeTenantId(tenantId))
                .eq(SpaceRelationAuth::getSourceSpaceId, sourceSpaceId)
                .eq(SpaceRelationAuth::getTargetSpaceId, targetSpaceId)
                .eq(SpaceRelationAuth::getResourceType, resourceType.trim())
                .eq(SpaceRelationAuth::getStatus, 1)
                .isNotNull(SpaceRelationAuth::getResourceKey)
                .and(w -> w.isNull(SpaceRelationAuth::getExpireTime).or().gt(SpaceRelationAuth::getExpireTime, now))
                .orderByDesc(SpaceRelationAuth::getId);
        return mapper.selectList(q).stream()
                .map(SpaceRelationAuth::getResourceKey)
                .filter(v -> v != null && !v.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    @Transactional(rollbackFor = Exception.class)
    public Long save(String tenantId, String sourceSpaceId, SpaceRelationAuth item) {
        permissionFacade.assertSpaceConfigWritable(tenantId, sourceSpaceId);
        validate(item, sourceSpaceId);
        String normalizedTenantId = normalizeTenantId(tenantId);
        item.setTenantId(normalizedTenantId);
        item.setSourceSpaceId(sourceSpaceId);
        item.setResourceType(item.getResourceType().trim());
        item.setResourceKey(normalizeResourceKey(item.getResourceKey()));
        if (item.getStatus() == null) {
            item.setStatus(1);
        }

        if (item.getId() == null) {
            SpaceRelationAuth existing = findByScope(
                    normalizedTenantId,
                    sourceSpaceId,
                    item.getTargetSpaceId(),
                    item.getResourceType(),
                    item.getResourceKey());
            if (existing != null) {
                item.setId(existing.getId());
                mapper.updateById(item);
                return existing.getId();
            }
            mapper.insert(item);
            return item.getId();
        }

        SpaceRelationAuth existing = mapper.selectById(item.getId());
        if (existing == null
                || !normalizedTenantId.equals(existing.getTenantId())
                || !sourceSpaceId.equals(existing.getSourceSpaceId())) {
            throw new IllegalArgumentException("授权记录不存在");
        }
        mapper.updateById(item);
        return item.getId();
    }

    public void delete(String tenantId, String sourceSpaceId, Long id) {
        permissionFacade.assertSpaceConfigWritable(tenantId, sourceSpaceId);
        SpaceRelationAuth existing = mapper.selectById(id);
        if (existing == null
                || !normalizeTenantId(tenantId).equals(existing.getTenantId())
                || !sourceSpaceId.equals(existing.getSourceSpaceId())) {
            throw new IllegalArgumentException("授权记录不存在");
        }
        mapper.deleteById(id);
    }

    private SpaceRelationAuth findByScope(String tenantId,
                                          String sourceSpaceId,
                                          String targetSpaceId,
                                          String resourceType,
                                          String resourceKey) {
        LambdaQueryWrapper<SpaceRelationAuth> q = new LambdaQueryWrapper<SpaceRelationAuth>()
                .eq(SpaceRelationAuth::getTenantId, tenantId)
                .eq(SpaceRelationAuth::getSourceSpaceId, sourceSpaceId)
                .eq(SpaceRelationAuth::getTargetSpaceId, targetSpaceId)
                .eq(SpaceRelationAuth::getResourceType, resourceType);
        if (resourceKey == null) {
            q.isNull(SpaceRelationAuth::getResourceKey);
        } else {
            q.eq(SpaceRelationAuth::getResourceKey, resourceKey);
        }
        q.last("LIMIT 1");
        return mapper.selectOne(q);
    }

    private String normalizeTenantId(String tenantId) {
        return (tenantId == null || tenantId.isBlank()) ? DEFAULT_TENANT_ID : tenantId.trim();
    }

    private String normalizeResourceKey(String resourceKey) {
        if (resourceKey == null) {
            return null;
        }
        String trimmed = resourceKey.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validate(SpaceRelationAuth item, String sourceSpaceId) {
        if (sourceSpaceId == null || sourceSpaceId.isBlank()) {
            throw new IllegalArgumentException("缺少来源空间标识");
        }
        if (item == null) {
            throw new IllegalArgumentException("授权参数不能为空");
        }
        if (item.getTargetSpaceId() == null || item.getTargetSpaceId().isBlank()) {
            throw new IllegalArgumentException("目标空间不能为空");
        }
        if (sourceSpaceId.trim().equals(item.getTargetSpaceId().trim())) {
            throw new IllegalArgumentException("来源空间与目标空间不能相同");
        }
        if (item.getResourceType() == null || item.getResourceType().isBlank()) {
            throw new IllegalArgumentException("资源类型不能为空");
        }
    }
}

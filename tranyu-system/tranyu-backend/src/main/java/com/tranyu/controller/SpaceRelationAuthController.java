package com.tranyu.controller;

import com.tranyu.common.Result;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.tranyu.entity.SpaceRelationAuth;
import com.tranyu.service.SpaceRelationAuthService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/system/space-relations")
@RequiredArgsConstructor
public class SpaceRelationAuthController {

    private final SpaceRelationAuthService service;

    @GetMapping("/auths")
    public Result<List<SpaceRelationAuth>> list(@RequestParam(required = false) String resourceType,
                                                @RequestHeader(value = "X-Space-Id", required = false) String sourceSpaceId,
                                                @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        try {
            return Result.ok(service.listBySourceSpace(currentTenantId(tenantId), requireSpaceId(sourceSpaceId), resourceType));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/auths")
    public Result<Long> create(@RequestBody SpaceRelationAuthBody body,
                               @RequestHeader(value = "X-Space-Id", required = false) String sourceSpaceId,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        try {
            SpaceRelationAuth item = toEntity(body, null);
            return Result.ok(service.save(currentTenantId(tenantId), requireSpaceId(sourceSpaceId), item));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/auths/{id}")
    public Result<Long> update(@PathVariable Long id,
                               @RequestBody SpaceRelationAuthBody body,
                               @RequestHeader(value = "X-Space-Id", required = false) String sourceSpaceId,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        try {
            SpaceRelationAuth item = toEntity(body, id);
            return Result.ok(service.save(currentTenantId(tenantId), requireSpaceId(sourceSpaceId), item));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @DeleteMapping("/auths/{id}")
    public Result<Void> delete(@PathVariable Long id,
                               @RequestHeader(value = "X-Space-Id", required = false) String sourceSpaceId,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
        try {
            service.delete(currentTenantId(tenantId), requireSpaceId(sourceSpaceId), id);
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    private String requireSpaceId(String spaceIdHeader) {
        String fromRequest = (spaceIdHeader == null || spaceIdHeader.isBlank()) ? null : spaceIdHeader.trim();
        String spaceId = fromRequest != null ? fromRequest : SpaceContext.getCurrentSpaceId();
        if (spaceId == null || spaceId.isBlank()) {
            throw new IllegalArgumentException("缺少空间标识，请刷新页面后重试");
        }
        return spaceId;
    }

    private String currentTenantId(String tenantIdHeader) {
        if (tenantIdHeader != null && !tenantIdHeader.isBlank()) {
            return tenantIdHeader.trim();
        }
        return TenantContext.getCurrentTenantIdOrDefault();
    }

    private SpaceRelationAuth toEntity(SpaceRelationAuthBody body, Long id) {
        SpaceRelationAuth item = new SpaceRelationAuth();
        item.setId(id);
        item.setTargetSpaceId(body.getTargetSpaceId());
        item.setResourceType(body.getResourceType());
        item.setResourceKey(body.getResourceKey());
        item.setStatus(body.getStatus());
        item.setExpireTime(body.getExpireTime());
        item.setGrantedBy(body.getGrantedBy());
        item.setRemark(body.getRemark());
        return item;
    }

    @Data
    private static class SpaceRelationAuthBody {
        private String targetSpaceId;
        private String resourceType;
        private String resourceKey;
        private Integer status;
        private LocalDateTime expireTime;
        private String grantedBy;
        private String remark;
    }
}

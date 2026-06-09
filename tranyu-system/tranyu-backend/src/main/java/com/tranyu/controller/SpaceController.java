package com.tranyu.controller;

import com.tranyu.common.Result;
import com.tranyu.context.AuthSubjectContext;
import com.tranyu.context.TenantContext;
import com.tranyu.dto.SpaceDTOs;
import com.tranyu.entity.Space;
import com.tranyu.entity.SpaceGroup;
import com.tranyu.entity.SpaceMember;
import com.tranyu.entity.SpaceRelationAuth;
import com.tranyu.entity.SysRole;
import com.tranyu.service.PermissionCheckRequest;
import com.tranyu.service.PermissionEngine;
import com.tranyu.service.SpaceGroupService;
import com.tranyu.service.SpaceMemberService;
import com.tranyu.service.SpaceRelationAuthService;
import com.tranyu.service.SpaceService;
import com.tranyu.service.SysRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/spaces")
@RequiredArgsConstructor
public class SpaceController {

    private final SpaceService spaceService;
    private final SpaceMemberService spaceMemberService;
    private final SpaceGroupService spaceGroupService;
    private final SpaceRelationAuthService spaceRelationAuthService;
    private final SysRoleService sysRoleService;
    private final PermissionEngine permissionEngine;

    @GetMapping
    public Result<List<SpaceDTOs.SpaceResponse>> list(@RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest("space", "view", "space_list", null, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(Collections.emptyList());
        }
        List<SpaceDTOs.SpaceResponse> data = spaceService.listSpaces(tenantId).stream()
                .map(SpaceController::toResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @GetMapping("/{id}")
    public Result<SpaceDTOs.SpaceResponse> detail(@PathVariable String id,
                                                  @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest("space", "view", "space_detail", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        return Result.ok(toResponse(spaceService.getSpace(tenantId, id)));
    }

    @PostMapping
    public Result<Void> create(@RequestBody SpaceDTOs.SpaceCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("space", "create", "space_create", null, request.getTenantId()));
        if (request.getOwnerUserId() == null) {
            throw new IllegalArgumentException("空间负责人不能为空");
        }
        Space space = new Space();
        space.setTenantId(request.getTenantId());
        space.setSpaceId(request.getSpaceId());
        space.setSpaceName(request.getSpaceName());
        space.setStatus(request.getStatus());
        space.setDescription(request.getDescription());
        spaceService.createSpaceWithOwner(space, request.getOwnerUserId());
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable String id,
                               @RequestParam(required = false) String tenantId,
                               @RequestBody SpaceDTOs.SpaceUpdateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("space", "edit", "space_update", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        Space existing = spaceService.getSpace(tenantId, id);
        if (existing == null) {
            return Result.ok(null);
        }
        Space space = new Space();
        space.setId(existing.getId());
        space.setSpaceName(request.getSpaceName());
        space.setStatus(request.getStatus());
        space.setArchived(request.getArchived());
        space.setDescription(request.getDescription());
        spaceService.updateSpace(space);
        return Result.ok(null);
    }

    @PostMapping("/{id}/archive")
    public Result<Void> archive(@PathVariable String id,
                                @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest("space", "disable", "space_archive", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        Space existing = spaceService.getSpace(tenantId, id);
        if (existing == null) {
            return Result.ok(null);
        }
        spaceService.archiveSpace(existing.getId());
        return Result.ok(null);
    }

    @GetMapping("/{id}/members")
    public Result<List<SpaceDTOs.SpaceMemberResponse>> listMembers(@PathVariable String id,
                                                                   @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest("space_member", "view", "space_member_list", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(Collections.emptyList());
        }
        List<SpaceDTOs.SpaceMemberResponse> data = spaceMemberService.listBySpace(tenantId, id).stream()
                .map(SpaceController::toMemberResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @PostMapping("/{id}/members")
    public Result<Void> addMember(@PathVariable String id,
                                  @RequestParam(required = false) String tenantId,
                                  @RequestBody SpaceDTOs.SpaceMemberCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("space_member", "manage", "space_member_add", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        SpaceMember member = new SpaceMember();
        member.setTenantId(tenantId);
        member.setSpaceId(id);
        member.setUserId(request.getUserId());
        member.setRoleId(request.getRoleId());
        member.setStatus(request.getStatus());
        spaceMemberService.addMember(member);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public Result<Void> removeMember(@PathVariable String id,
                                     @RequestParam(required = false) String tenantId,
                                     @PathVariable Long memberId) {
        permissionEngine.checkOrThrow(buildRequest("space_member", "manage", "space_member_remove", id, tenantId));
        spaceMemberService.removeMember(memberId);
        return Result.ok(null);
    }

    @GetMapping("/{id}/groups")
    public Result<List<SpaceDTOs.SpaceGroupResponse>> listGroups(@PathVariable String id,
                                                                 @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest("space_group", "view", "space_group_list", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(Collections.emptyList());
        }
        List<SpaceDTOs.SpaceGroupResponse> data = spaceGroupService.listBySpace(tenantId, id).stream()
                .map(SpaceController::toGroupResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @PostMapping("/{id}/groups")
    public Result<Void> createGroup(@PathVariable String id,
                                    @RequestParam(required = false) String tenantId,
                                    @RequestBody SpaceDTOs.SpaceGroupCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("space_group", "manage", "space_group_create", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        SpaceGroup group = new SpaceGroup();
        group.setTenantId(tenantId);
        group.setSpaceId(id);
        group.setGroupName(request.getGroupName());
        group.setGroupCode(request.getGroupCode());
        group.setStatus(request.getStatus());
        group.setDescription(request.getDescription());
        spaceGroupService.save(group);
        return Result.ok(null);
    }

    @GetMapping("/{id}/roles")
    public Result<List<SpaceDTOs.SpaceRoleResponse>> listRoles(@PathVariable String id,
                                                               @RequestParam(required = false) String tenantId) {
        permissionEngine.checkOrThrow(buildRequest("space_role", "view", "space_role_list", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(Collections.emptyList());
        }
        List<SpaceDTOs.SpaceRoleResponse> data = sysRoleService.listSpaceRoles(tenantId, id).stream()
                .map(SpaceController::toRoleResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @PostMapping("/{id}/roles")
    public Result<Void> createRole(@PathVariable String id,
                                   @RequestParam(required = false) String tenantId,
                                   @RequestBody SpaceDTOs.SpaceRoleCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("space_role", "manage", "space_role_create", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        SysRole role = new SysRole();
        role.setRoleName(request.getRoleName());
        role.setRoleCode(request.getRoleCode());
        role.setStatus(request.getStatus());
        role.setDescription(request.getDescription());
        role.setSort(request.getSort());
        sysRoleService.createSpaceRole(tenantId, id, role);
        return Result.ok(null);
    }

    @GetMapping("/{id}/relation-auth")
    public Result<List<SpaceDTOs.SpaceRelationAuthResponse>> listRelationAuth(@PathVariable String id,
                                                                              @RequestParam(required = false) String tenantId,
                                                                              @RequestParam(required = false) String resourceType) {
        permissionEngine.checkOrThrow(buildRequest("space_relation_auth", "view", "space_relation_list", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(Collections.emptyList());
        }
        List<SpaceDTOs.SpaceRelationAuthResponse> data = spaceRelationAuthService
                .listBySourceSpace(tenantId, id, resourceType)
                .stream()
                .map(SpaceController::toRelationAuthResponse)
                .collect(Collectors.toList());
        return Result.ok(data);
    }

    @PostMapping("/{id}/relation-auth")
    public Result<Void> createRelationAuth(@PathVariable String id,
                                           @RequestParam(required = false) String tenantId,
                                           @RequestBody SpaceDTOs.SpaceRelationAuthCreateRequest request) {
        permissionEngine.checkOrThrow(buildRequest("space_relation_auth", "manage", "space_relation_create", id, tenantId));
        if (tenantId == null || tenantId.isBlank()) {
            return Result.ok(null);
        }
        SpaceRelationAuth auth = new SpaceRelationAuth();
        auth.setTargetSpaceId(request.getTargetSpaceId());
        auth.setResourceType(request.getResourceType());
        auth.setResourceKey(request.getResourceKey());
        auth.setStatus(request.getStatus());
        auth.setRemark(request.getRemark());
        spaceRelationAuthService.save(tenantId, id, auth);
        return Result.ok(null);
    }

    private static SpaceDTOs.SpaceResponse toResponse(Space space) {
        if (space == null) return null;
        SpaceDTOs.SpaceResponse resp = new SpaceDTOs.SpaceResponse();
        resp.setId(space.getId());
        resp.setTenantId(space.getTenantId());
        resp.setSpaceId(space.getSpaceId());
        resp.setSpaceName(space.getSpaceName());
        resp.setStatus(space.getStatus());
        resp.setArchived(space.getArchived());
        resp.setDescription(space.getDescription());
        resp.setCreateTime(space.getCreateTime());
        resp.setUpdateTime(space.getUpdateTime());
        return resp;
    }

    private static SpaceDTOs.SpaceMemberResponse toMemberResponse(SpaceMember member) {
        SpaceDTOs.SpaceMemberResponse resp = new SpaceDTOs.SpaceMemberResponse();
        resp.setId(member.getId());
        resp.setUserId(member.getUserId());
        resp.setRoleId(member.getRoleId());
        resp.setStatus(member.getStatus());
        resp.setCreateTime(member.getCreateTime());
        return resp;
    }

    private static SpaceDTOs.SpaceGroupResponse toGroupResponse(SpaceGroup group) {
        SpaceDTOs.SpaceGroupResponse resp = new SpaceDTOs.SpaceGroupResponse();
        resp.setId(group.getId());
        resp.setGroupName(group.getGroupName());
        resp.setGroupCode(group.getGroupCode());
        resp.setStatus(group.getStatus());
        resp.setDescription(group.getDescription());
        resp.setCreateTime(group.getCreateTime());
        return resp;
    }

    private static SpaceDTOs.SpaceRoleResponse toRoleResponse(SysRole role) {
        SpaceDTOs.SpaceRoleResponse resp = new SpaceDTOs.SpaceRoleResponse();
        resp.setId(role.getId());
        resp.setRoleName(role.getRoleName());
        resp.setRoleCode(role.getRoleCode());
        resp.setStatus(role.getStatus());
        resp.setDescription(role.getDescription());
        resp.setSort(role.getSort());
        return resp;
    }

    private static SpaceDTOs.SpaceRelationAuthResponse toRelationAuthResponse(SpaceRelationAuth auth) {
        SpaceDTOs.SpaceRelationAuthResponse resp = new SpaceDTOs.SpaceRelationAuthResponse();
        resp.setId(auth.getId());
        resp.setTargetSpaceId(auth.getTargetSpaceId());
        resp.setResourceType(auth.getResourceType());
        resp.setResourceKey(auth.getResourceKey());
        resp.setStatus(auth.getStatus());
        resp.setRemark(auth.getRemark());
        resp.setExpireTime(auth.getExpireTime());
        resp.setCreateTime(auth.getCreateTime());
        return resp;
    }

    private PermissionCheckRequest buildRequest(String resourceType,
                                               String action,
                                               String resourceKey,
                                               String spaceId,
                                               String tenantId) {
        PermissionCheckRequest req = new PermissionCheckRequest();
        req.setUserId(AuthSubjectContext.getCurrentUserId());
        req.setTenantId(tenantId == null || tenantId.isBlank() ? TenantContext.getCurrentTenantIdOrDefault() : tenantId);
        req.setSpaceId(spaceId);
        req.setResourceType(resourceType);
        req.setAction(action);
        req.setResourceKey(resourceKey);
        return req;
    }
}

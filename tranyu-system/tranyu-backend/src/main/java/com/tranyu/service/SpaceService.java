package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.Space;
import com.tranyu.mapper.SpaceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpaceService {

    private final SpaceMapper spaceMapper;
    private final SpaceMemberService spaceMemberService;
    private final PermissionPolicyService permissionPolicyService;
    private final SysRoleService sysRoleService;

    public List<Space> listByTenant(String tenantId) {
        return spaceMapper.selectList(new LambdaQueryWrapper<Space>()
                .eq(Space::getTenantId, tenantId));
    }

    public Space getBySpaceId(String tenantId, String spaceId) {
        return spaceMapper.selectOne(new LambdaQueryWrapper<Space>()
                .eq(Space::getTenantId, tenantId)
                .eq(Space::getSpaceId, spaceId));
    }

    public void save(Space space) {
        if (space.getId() == null) {
            spaceMapper.insert(space);
        } else {
            spaceMapper.updateById(space);
        }
    }

    public List<Space> listSpaces(String tenantId) {
        return listByTenant(tenantId);
    }

    public Space getSpace(String tenantId, String spaceId) {
        return getBySpaceId(tenantId, spaceId);
    }

    public void createSpace(Space space) {
        spaceMapper.insert(space);
    }

    public void createSpaceWithOwner(Space space, Long ownerUserId) {
        if (space == null) {
            throw new IllegalArgumentException("空间信息不能为空");
        }
        if (ownerUserId == null) {
            throw new IllegalArgumentException("空间负责人不能为空");
        }
        if (space.getStatus() == null) {
            space.setStatus(1);
        }
        if (space.getArchived() == null) {
            space.setArchived(0);
        }
        spaceMapper.insert(space);
        com.tranyu.entity.SpaceMember member = new com.tranyu.entity.SpaceMember();
        member.setTenantId(space.getTenantId());
        member.setSpaceId(space.getSpaceId());
        member.setUserId(ownerUserId);
        member.setStatus(1);
        spaceMemberService.addMember(member);
        permissionPolicyService.ensureSpaceOwnerPolicies(space.getTenantId(), space.getSpaceId(), ownerUserId);

        // 同步超级空间管理员的空间级权限（若已存在）
        List<Long> superAdmins = sysRoleService.listUserIdsByRoleCodeAndTenant(space.getTenantId(), RoleBoundary.SPACE_SUPER_ADMIN);
        for (Long adminId : superAdmins) {
            permissionPolicyService.ensureSpaceSuperAdminSpacePolicies(space.getTenantId(), space.getSpaceId(), adminId);
        }
    }

    public void updateSpace(Space space) {
        spaceMapper.updateById(space);
    }

    public void archiveSpace(Long id) {
        Space space = new Space();
        space.setId(id);
        space.setArchived(1);
        spaceMapper.updateById(space);
    }
}

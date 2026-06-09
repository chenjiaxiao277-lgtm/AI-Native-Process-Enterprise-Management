package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SpaceMember;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.SpaceMemberMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpaceMemberService {

    private final SpaceMemberMapper spaceMemberMapper;
    private final SysUserRoleMapper userRoleMapper;

    public List<SpaceMember> listBySpace(String tenantId, String spaceId) {
        return spaceMemberMapper.selectList(new LambdaQueryWrapper<SpaceMember>()
                .eq(SpaceMember::getTenantId, tenantId)
                .eq(SpaceMember::getSpaceId, spaceId));
    }

    public void save(SpaceMember member) {
        if (member.getId() == null) {
            spaceMemberMapper.insert(member);
        } else {
            spaceMemberMapper.updateById(member);
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void addMember(SpaceMember member) {
        spaceMemberMapper.insert(member);
        if (member.getUserId() == null || member.getRoleId() == null) {
            return;
        }
        SysUserRole existing = userRoleMapper.selectOne(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, member.getUserId())
                .eq(SysUserRole::getRoleId, member.getRoleId())
                .last("LIMIT 1"));
        if (existing == null) {
            SysUserRole rel = new SysUserRole();
            rel.setUserId(member.getUserId());
            rel.setRoleId(member.getRoleId());
            userRoleMapper.insert(rel);
        }
    }

    public void removeMember(Long memberId) {
        spaceMemberMapper.deleteById(memberId);
    }
}

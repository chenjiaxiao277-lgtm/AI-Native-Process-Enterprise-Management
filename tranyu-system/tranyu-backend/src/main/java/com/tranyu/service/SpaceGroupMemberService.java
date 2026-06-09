package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SpaceGroupMember;
import com.tranyu.mapper.SpaceGroupMemberMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpaceGroupMemberService {

    private final SpaceGroupMemberMapper spaceGroupMemberMapper;

    public List<SpaceGroupMember> listByGroup(String tenantId, Long groupId) {
        return spaceGroupMemberMapper.selectList(new LambdaQueryWrapper<SpaceGroupMember>()
                .eq(SpaceGroupMember::getTenantId, tenantId)
                .eq(SpaceGroupMember::getGroupId, groupId));
    }

    public void save(SpaceGroupMember member) {
        if (member.getId() == null) {
            spaceGroupMemberMapper.insert(member);
        } else {
            spaceGroupMemberMapper.updateById(member);
        }
    }
}

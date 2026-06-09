package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SpaceGroup;
import com.tranyu.mapper.SpaceGroupMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpaceGroupService {

    private final SpaceGroupMapper spaceGroupMapper;

    public List<SpaceGroup> listBySpace(String tenantId, String spaceId) {
        return spaceGroupMapper.selectList(new LambdaQueryWrapper<SpaceGroup>()
                .eq(SpaceGroup::getTenantId, tenantId)
                .eq(SpaceGroup::getSpaceId, spaceId));
    }

    public void save(SpaceGroup group) {
        if (group.getId() == null) {
            spaceGroupMapper.insert(group);
        } else {
            spaceGroupMapper.updateById(group);
        }
    }
}

package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.SysDept;
import com.tranyu.mapper.SysDeptMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 部门服务：树形查询、增删改查、启用/禁用
 */
@Service
@RequiredArgsConstructor
public class SysDeptService {

    private final SysDeptMapper deptMapper;

    public List<SysDept> listAll() {
        return deptMapper.selectList(
                new LambdaQueryWrapper<SysDept>()
                        .orderByAsc(SysDept::getSort)
                        .orderByAsc(SysDept::getId)
        );
    }

    public List<SysDept> tree() {
        List<SysDept> all = listAll();
        Map<Long, SysDept> idMap = all.stream().collect(Collectors.toMap(SysDept::getId, d -> d));
        List<SysDept> roots = new ArrayList<>();
        for (SysDept d : all) {
            if (d.getParentId() == null || d.getParentId() == 0) {
                roots.add(d);
            } else {
                SysDept parent = idMap.get(d.getParentId());
                if (parent != null) {
                    if (parent.getChildren() == null) parent.setChildren(new ArrayList<>());
                    parent.getChildren().add(d);
                } else {
                    roots.add(d);
                }
            }
        }
        return roots;
    }

    public SysDept getById(Long id) {
        return deptMapper.selectById(id);
    }

    public void save(SysDept dept) {
        if (dept.getId() == null) {
            if (dept.getStatus() == null) dept.setStatus(1);
            if (dept.getDeleted() == null) dept.setDeleted(0);
            deptMapper.insert(dept);
        } else {
            deptMapper.updateById(dept);
        }
    }

    public void changeStatus(Long id, Integer status) {
        SysDept d = new SysDept();
        d.setId(id);
        d.setStatus(status);
        deptMapper.updateById(d);
    }

    public void logicDelete(Long id) {
        SysDept d = new SysDept();
        d.setId(id);
        d.setDeleted(1);
        deptMapper.updateById(d);
    }
}


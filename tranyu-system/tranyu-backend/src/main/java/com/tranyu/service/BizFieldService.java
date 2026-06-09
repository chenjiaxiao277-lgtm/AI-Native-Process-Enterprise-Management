package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.BizField;
import com.tranyu.mapper.BizFieldMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 字段配置服务：按模块查询、批量更新
 */
@Service
@RequiredArgsConstructor
public class BizFieldService {

    private final BizFieldMapper fieldMapper;

    public List<BizField> listByModule(Long moduleId) {
        return fieldMapper.selectList(new LambdaQueryWrapper<BizField>()
                .eq(BizField::getModuleId, moduleId)
                .orderByAsc(BizField::getFormSort));
    }

    @Transactional(rollbackFor = Exception.class)
    public void batchUpdate(Long moduleId, List<BizField> fields) {
        if (fields == null) return;
        for (BizField f : fields) {
            f.setModuleId(moduleId);
            if (f.getId() == null) {
                fieldMapper.insert(f);
            } else {
                fieldMapper.updateById(f);
            }
        }
    }
}


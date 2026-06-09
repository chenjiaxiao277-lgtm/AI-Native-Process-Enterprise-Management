package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tranyu.entity.WorkItemField;
import com.tranyu.mapper.WorkItemFieldMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WorkItemFieldService {

    private final WorkItemFieldMapper mapper;
    private final ObjectMapper objectMapper;

    public List<WorkItemField> listByWorkItem(Long workItemId) {
        return mapper.selectList(new LambdaQueryWrapper<WorkItemField>()
                .eq(WorkItemField::getWorkItemId, workItemId)
                .orderByAsc(WorkItemField::getSort)
                .orderByAsc(WorkItemField::getId));
    }

    @Transactional(rollbackFor = Exception.class)
    public void saveField(WorkItemField field) {
        if (field.getWorkItemId() == null) {
            throw new IllegalArgumentException("工作项ID不能为空");
        }
        if (field.getFieldName() == null || field.getFieldName().isBlank()) {
            throw new IllegalArgumentException("字段名称不能为空");
        }
        if (field.getFieldKey() == null || field.getFieldKey().isBlank()) {
            throw new IllegalArgumentException("字段标识不能为空");
        }
        if (field.getFieldType() == null || field.getFieldType().isBlank()) {
            throw new IllegalArgumentException("字段类型不能为空");
        }
        field.setFieldKey(field.getFieldKey().trim());
        field.setFieldName(field.getFieldName().trim());
        ensureFieldKeyUnique(field.getWorkItemId(), field.getFieldKey(), field.getId());
        validateOptionsByType(field.getFieldType().trim(), field.getOptionsJson());
        if (field.getSort() == null) {
            field.setSort(nextSort(field.getWorkItemId()));
        }
        if (field.getIsEnabled() == null) {
            field.setIsEnabled(1);
        }
        if (field.getIsRequired() == null) {
            field.setIsRequired(0);
        }
        if (field.getId() == null) {
            mapper.insert(field);
        } else {
            WorkItemField existing = mapper.selectById(field.getId());
            if (existing == null || !field.getWorkItemId().equals(existing.getWorkItemId())) {
                throw new IllegalArgumentException("字段不存在或不属于当前工作项");
            }
            mapper.updateById(field);
        }
    }

    public void deleteField(Long workItemId, Long id) {
        WorkItemField existing = mapper.selectById(id);
        if (existing == null || !workItemId.equals(existing.getWorkItemId())) {
            throw new IllegalArgumentException("字段不存在或不属于当前工作项");
        }
        mapper.deleteById(id);
    }

    private void validateOptionsByType(String fieldType, String optionsJson) {
        if (optionsJson == null || optionsJson.isBlank()) {
            // 枚举类必须至少有一个选项
            if ("single_select".equals(fieldType) || "multi_select".equals(fieldType)) {
                throw new IllegalArgumentException("枚举字段必须至少配置一个选项");
            }
            return;
        }
        Map<String, Object> opt;
        try {
            opt = objectMapper.readValue(optionsJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("字段配置(optionsJson)格式非法");
        }
        if (opt == null) return;

        if ("single_select".equals(fieldType) || "multi_select".equals(fieldType)) {
            Object v = opt.get("options");
            if (!(v instanceof List<?> list) || list.isEmpty()) {
                throw new IllegalArgumentException("枚举字段必须至少配置一个选项");
            }
        }

        // 文本最大长度
        if ("text".equals(fieldType) || "textarea".equals(fieldType) || "rich_text".equals(fieldType)) {
            Object ml = opt.get("maxLength");
            if (ml != null) {
                int maxLength;
                try {
                    maxLength = Integer.parseInt(String.valueOf(ml));
                } catch (Exception e) {
                    throw new IllegalArgumentException("文本最大长度(maxLength)必须为整数");
                }
                if (maxLength < 0) {
                    throw new IllegalArgumentException("文本最大长度(maxLength)不能为负数");
                }
            }
        }

        // 数值范围
        if ("number".equals(fieldType)) {
            BigDecimal min = toDecimal(opt.get("min"));
            BigDecimal max = toDecimal(opt.get("max"));
            if (min != null && max != null && min.compareTo(max) > 0) {
                throw new IllegalArgumentException("数值字段最小值不能大于最大值");
            }
            Object precision = opt.get("precision");
            if (precision != null) {
                int p;
                try {
                    p = Integer.parseInt(String.valueOf(precision));
                } catch (Exception e) {
                    throw new IllegalArgumentException("数值精度(precision)必须为整数");
                }
                if (p < 0) {
                    throw new IllegalArgumentException("数值精度(precision)不能为负数");
                }
            }
        }
    }

    private BigDecimal toDecimal(Object v) {
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) return null;
        try {
            return new BigDecimal(s);
        } catch (Exception e) {
            throw new IllegalArgumentException("数值字段范围(min/max)必须为数字");
        }
    }

    private void ensureFieldKeyUnique(Long workItemId, String fieldKey, Long excludeId) {
        LambdaQueryWrapper<WorkItemField> q = new LambdaQueryWrapper<WorkItemField>()
                .eq(WorkItemField::getWorkItemId, workItemId)
                .eq(WorkItemField::getFieldKey, fieldKey.trim());
        if (excludeId != null) {
            q.ne(WorkItemField::getId, excludeId);
        }
        Long cnt = mapper.selectCount(q);
        if (cnt != null && cnt > 0) {
            throw new IllegalArgumentException("字段标识已存在");
        }
    }

    private Integer nextSort(Long workItemId) {
        WorkItemField last = mapper.selectOne(new LambdaQueryWrapper<WorkItemField>()
                .eq(WorkItemField::getWorkItemId, workItemId)
                .orderByDesc(WorkItemField::getSort)
                .last("LIMIT 1"));
        if (last == null || last.getSort() == null) return 100;
        return last.getSort() + 10;
    }
}

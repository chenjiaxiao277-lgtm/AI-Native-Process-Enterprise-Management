package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tranyu.entity.BizField;
import com.tranyu.entity.BizModule;
import com.tranyu.entity.BizTemplate;
import com.tranyu.mapper.BizFieldMapper;
import com.tranyu.mapper.BizModuleMapper;
import com.tranyu.mapper.BizTemplateMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 字段模板服务：保存/应用字段配置快照
 */
@Service
@RequiredArgsConstructor
public class BizTemplateService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final BizTemplateMapper templateMapper;
    private final BizModuleMapper moduleMapper;
    private final BizFieldMapper fieldMapper;

    @Transactional(rollbackFor = Exception.class)
    public void saveTemplate(Long moduleId, String templateCode, String templateName) {
        BizModule m = moduleMapper.selectById(moduleId);
        if (m == null) {
            throw new IllegalArgumentException("模块不存在");
        }
        List<BizField> fields = fieldMapper.selectList(
                new LambdaQueryWrapper<BizField>().eq(BizField::getModuleId, moduleId));
        Map<String, Object> payload = new HashMap<>();
        payload.put("category", m.getCategory());
        payload.put("fields", fields);
        String json;
        try {
            json = JSON.writeValueAsString(payload);
        } catch (Exception e) {
            throw new IllegalStateException("序列化模板失败", e);
        }
        BizTemplate t = new BizTemplate();
        t.setTemplateCode(templateCode);
        t.setTemplateName(templateName);
        t.setCategory(m.getCategory());
        t.setConfigJson(json);
        templateMapper.insert(t);
    }

    @Transactional(rollbackFor = Exception.class)
    public void applyTemplate(Long targetModuleId, Long templateId) {
        BizTemplate t = templateMapper.selectById(templateId);
        if (t == null) {
            throw new IllegalArgumentException("模板不存在");
        }
        Map<String, Object> payload;
        try {
            payload = JSON.readValue(t.getConfigJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("解析模板失败", e);
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> fieldMaps = (List<Map<String, Object>>) payload.get("fields");
        if (fieldMaps == null) return;
        // 清空原有字段
        fieldMapper.delete(new LambdaQueryWrapper<BizField>().eq(BizField::getModuleId, targetModuleId));
        for (Map<String, Object> fm : fieldMaps) {
            BizField f = JSON.convertValue(fm, BizField.class);
            f.setId(null);
            f.setModuleId(targetModuleId);
            fieldMapper.insert(f);
        }
    }
}


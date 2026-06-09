package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tranyu.entity.WorkItemField;
import com.tranyu.entity.WorkItemType;
import com.tranyu.mapper.WorkItemTypeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WorkItemTypeService {

    private final WorkItemTypeMapper mapper;
    private final WorkItemFieldService fieldService;
    private final SpaceRelationAuthService spaceRelationAuthService;
    private final PermissionFacade permissionFacade;
    private final ObjectMapper objectMapper;

    public Page<WorkItemType> page(int current, int size, String keyword, Integer status, String sourceType, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemView(tenantId, spaceId);
        Page<WorkItemType> page = new Page<>(current, size);
        LambdaQueryWrapper<WorkItemType> q = new LambdaQueryWrapper<>();
        q.eq(WorkItemType::getTenantId, tenantId);
        q.eq(WorkItemType::getSpaceId, spaceId);
        q.eq(WorkItemType::getDeleted, 0);
        if (keyword != null && !keyword.isBlank()) {
            q.and(w -> w.like(WorkItemType::getTypeName, keyword)
                    .or()
                    .like(WorkItemType::getTypeCode, keyword));
        }
        if (status != null) {
            q.eq(WorkItemType::getStatus, status);
        }
        if (sourceType != null && !sourceType.isBlank()) {
            q.eq(WorkItemType::getSourceType, sourceType);
        }
        q.orderByAsc(WorkItemType::getSort).orderByAsc(WorkItemType::getId);
        return mapper.selectPage(page, q);
    }

    public List<WorkItemType> listAll(String tenantId, String spaceId) {
        return mapper.selectList(new LambdaQueryWrapper<WorkItemType>()
                .eq(WorkItemType::getTenantId, tenantId)
                .eq(WorkItemType::getSpaceId, spaceId)
                .eq(WorkItemType::getDeleted, 0)
                .orderByAsc(WorkItemType::getSort)
                .orderByAsc(WorkItemType::getId));
    }

    public WorkItemType getById(Long id, String tenantId, String spaceId) {
        WorkItemType item = mapper.selectById(id);
        if (item == null) return null;
        if (Integer.valueOf(1).equals(item.getDeleted())) return null;
        return spaceId.equals(item.getSpaceId()) && tenantId.equals(item.getTenantId()) ? item : null;
    }

    public WorkItemType getByIdInTenant(Long id, String tenantId) {
        WorkItemType item = mapper.selectById(id);
        if (item == null) return null;
        if (Integer.valueOf(1).equals(item.getDeleted())) return null;
        return tenantId.equals(item.getTenantId()) ? item : null;
    }

    public WorkItemType getByIdForRead(Long id, String requesterSpaceId, String tenantId) {
        permissionFacade.assertWorkItemView(tenantId, requesterSpaceId);
        WorkItemType item = mapper.selectById(id);
        if (item == null || Integer.valueOf(1).equals(item.getDeleted()) || !tenantId.equals(item.getTenantId())) {
            return null;
        }
        if (requesterSpaceId.equals(item.getSpaceId())) {
            return item;
        }
        boolean allowCrossSpace = spaceRelationAuthService.hasReadableAuth(
                tenantId,
                requesterSpaceId,
                item.getSpaceId(),
                "work_item_type",
                String.valueOf(item.getId()));
        return allowCrossSpace ? item : null;
    }

    @Transactional(rollbackFor = Exception.class)
    public void save(WorkItemType item, String tenantId, String spaceId) {
        normalizeSourceType(item);
        if (item.getId() == null) {
            permissionFacade.assertWorkItemCreate(tenantId, spaceId);
            item.setTenantId(tenantId);
            item.setSpaceId(spaceId);
            if ("reuse".equals(item.getSourceType())) {
                prepareReuseItem(item, tenantId, spaceId);
            } else {
                validateCustomRequired(item);
                if (item.getReuseBound() == null) item.setReuseBound(0);
            }
            if (item.getFlowMode() == null || item.getFlowMode().isBlank()) item.setFlowMode("state");
            if (item.getBaselineEnabled() == null) item.setBaselineEnabled(0);
            if (item.getNavEntryEnabled() == null) item.setNavEntryEnabled(1);
            ensureTypeCodeUnique(item.getTypeCode(), null, tenantId, spaceId);
            if (item.getStatus() == null) item.setStatus(1);
            if (item.getDeleted() == null) item.setDeleted(0);
            if (item.getSort() == null) item.setSort(nextSort(tenantId, spaceId));
            mapper.insert(item);
            ensureDefaultSystemFields(item);
        } else {
            permissionFacade.assertWorkItemEdit(tenantId, spaceId);
            WorkItemType existing = mapper.selectById(item.getId());
            if (existing == null || !spaceId.equals(existing.getSpaceId()) || !tenantId.equals(existing.getTenantId())) {
                throw new IllegalArgumentException("工作项类型不存在");
            }
            if ("reuse".equals(existing.getSourceType()) && Integer.valueOf(1).equals(existing.getReuseBound())) {
                throw new IllegalArgumentException("复用工作项已同步配置，解除同步后才可编辑");
            }
            if (item.getSourceType() == null) {
                item.setSourceType(existing.getSourceType());
            }
            if ("custom".equals(item.getSourceType())) {
                validateCustomRequired(item);
                item.setReuseSourceId(null);
                item.setSourceSpace(null);
                item.setSourceWorkItem(null);
                item.setReuseBound(0);
            }
            if (item.getFlowMode() == null || item.getFlowMode().isBlank()) item.setFlowMode(existing.getFlowMode());
            if (item.getBaselineEnabled() == null) item.setBaselineEnabled(existing.getBaselineEnabled());
            if (item.getNavEntryEnabled() == null) item.setNavEntryEnabled(existing.getNavEntryEnabled());
            ensureTypeCodeUnique(item.getTypeCode(), item.getId(), tenantId, spaceId);
            item.setTenantId(existing.getTenantId());
            item.setSpaceId(existing.getSpaceId());
            mapper.updateById(item);
        }
    }

    public void changeStatus(Long id, Integer status, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemEdit(tenantId, spaceId);
        WorkItemType current = getById(id, tenantId, spaceId);
        if (current == null) {
            throw new IllegalArgumentException("工作项类型不存在");
        }
        current.setStatus(status);
        mapper.updateById(current);
    }

    public void logicDelete(Long id, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemDelete(tenantId, spaceId);
        WorkItemType current = getById(id, tenantId, spaceId);
        if (current == null) {
            throw new IllegalArgumentException("工作项类型不存在");
        }
        current.setDeleted(1);
        mapper.updateById(current);
    }

    public void unbindReuse(Long id, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemEdit(tenantId, spaceId);
        WorkItemType current = getById(id, tenantId, spaceId);
        if (current == null) {
            throw new IllegalArgumentException("工作项类型不存在");
        }
        if (!"reuse".equals(current.getSourceType()) || !Integer.valueOf(1).equals(current.getReuseBound())) {
            throw new IllegalArgumentException("当前工作项未处于复用同步状态");
        }
        WorkItemType item = new WorkItemType();
        item.setId(id);
        item.setSourceType("custom");
        item.setReuseBound(0);
        item.setReuseSourceId(null);
        item.setSourceSpace(null);
        item.setSourceWorkItem(null);
        mapper.updateById(item);
    }

    private Integer nextSort(String tenantId, String spaceId) {
        WorkItemType last = mapper.selectOne(new LambdaQueryWrapper<WorkItemType>()
                .eq(WorkItemType::getTenantId, tenantId)
                .eq(WorkItemType::getSpaceId, spaceId)
                .orderByDesc(WorkItemType::getSort)
                .last("LIMIT 1"));
        if (last == null || last.getSort() == null) return 100;
        return last.getSort() + 10;
    }

    private void ensureTypeCodeUnique(String typeCode, Long excludeId, String tenantId, String spaceId) {
        if (typeCode == null || typeCode.isBlank()) {
            throw new IllegalArgumentException("类型编码不能为空");
        }
        // DB 唯一约束为 (type_code, deleted)，不含 tenant/space，需做全局唯一校验
        LambdaQueryWrapper<WorkItemType> q = new LambdaQueryWrapper<WorkItemType>()
                .eq(WorkItemType::getTypeCode, typeCode.trim())
                .eq(WorkItemType::getDeleted, 0);
        if (excludeId != null) {
            q.ne(WorkItemType::getId, excludeId);
        }
        Long count = mapper.selectCount(q);
        if (count != null && count > 0) {
            throw new IllegalArgumentException("类型编码已存在，请使用其他编码");
        }
    }

    private void normalizeSourceType(WorkItemType item) {
        if (item.getSourceType() == null || item.getSourceType().isBlank()) {
            item.setSourceType("custom");
        }
    }

    private void validateCustomRequired(WorkItemType item) {
        if (item.getTypeName() == null || item.getTypeName().isBlank()) {
            throw new IllegalArgumentException("名称不能为空");
        }
        if (item.getTypeCode() == null || item.getTypeCode().isBlank()) {
            throw new IllegalArgumentException("类型编码不能为空");
        }
    }

    private void prepareReuseItem(WorkItemType item, String tenantId, String spaceId) {
        if (item.getReuseSourceId() == null) {
            throw new IllegalArgumentException("请选择要复用的源工作项");
        }
        WorkItemType source = mapper.selectById(item.getReuseSourceId());
        if (source == null
                || Integer.valueOf(1).equals(source.getDeleted())
                || !spaceId.equals(source.getSpaceId())
                || !tenantId.equals(source.getTenantId())) {
            throw new IllegalArgumentException("源工作项不存在");
        }
        item.setTypeName(source.getTypeName() + "（复用）");
        item.setTypeCode(generateReuseCode(source.getTypeCode(), tenantId, spaceId));
        item.setItemCategory(source.getItemCategory());
        item.setOwnerRole(source.getOwnerRole());
        item.setWorkflowName(source.getWorkflowName());
        item.setRequiredPolicy(source.getRequiredPolicy());
        item.setSlaHours(source.getSlaHours());
        item.setFlowMode(source.getFlowMode());
        item.setSystemIdentifier(source.getSystemIdentifier());
        item.setDescription(source.getDescription());
        item.setSourceSpace(spaceId);
        item.setSourceWorkItem(source.getTypeName());
        item.setReuseBound(1);
        item.setIconColor(source.getIconColor());
        item.setIconKey(source.getIconKey());
        item.setCopyFieldsJson(source.getCopyFieldsJson());
        item.setCopyRolesJson(source.getCopyRolesJson());
        item.setBaselineEnabled(source.getBaselineEnabled());
        item.setNavEntryEnabled(source.getNavEntryEnabled());
        item.setDetailLayoutJson(source.getDetailLayoutJson());
        item.setFlowRuleJson(source.getFlowRuleJson());
        item.setFlowRoleJson(source.getFlowRoleJson());
        item.setViewLayoutJson(source.getViewLayoutJson());
    }

    private String generateReuseCode(String sourceCode, String tenantId, String spaceId) {
        String base = (sourceCode == null || sourceCode.isBlank() ? "WORK_ITEM" : sourceCode.trim()) + "_R";
        String candidate = base;
        int seq = 1;
        while (existsTypeCode(candidate, null, tenantId, spaceId)) {
            candidate = base + seq;
            seq++;
            if (seq > 9999) {
                throw new IllegalArgumentException("无法生成可用的复用编码，请手动创建");
            }
        }
        return candidate;
    }

    private boolean existsTypeCode(String typeCode, Long excludeId, String tenantId, String spaceId) {
        LambdaQueryWrapper<WorkItemType> q = new LambdaQueryWrapper<WorkItemType>()
                .eq(WorkItemType::getTypeCode, typeCode)
                .eq(WorkItemType::getTenantId, tenantId)
                .eq(WorkItemType::getSpaceId, spaceId)
                .eq(WorkItemType::getDeleted, 0);
        if (excludeId != null) {
            q.ne(WorkItemType::getId, excludeId);
        }
        Long count = mapper.selectCount(q);
        return count != null && count > 0;
    }

    private void ensureDefaultSystemFields(WorkItemType item) {
        if (item.getId() == null) return;
        List<DefaultFieldDef> defs = defaultFieldDefs(item);
        int idx = 0;
        for (DefaultFieldDef def : defs) {
            WorkItemField field = new WorkItemField();
            field.setWorkItemId(item.getId());
            field.setFieldName(def.fieldName);
            field.setFieldKey(def.fieldKey);
            field.setFieldType(def.fieldType);
            field.setAuthorizedRoles(def.authorizedRoles);
            field.setIsEnabled(1);
            field.setIsRequired(def.isRequired);
            field.setDefaultValueMode(def.defaultValueMode);
            field.setDefaultValue(def.defaultValue);
            field.setOptionsJson(def.optionsJson);
            field.setHelpText(def.helpText);
            field.setSort(100 + idx * 10);
            try {
                fieldService.saveField(field);
            } catch (IllegalArgumentException e) {
                // ignore duplicated default field key
            }
            idx++;
        }
    }

    private List<DefaultFieldDef> defaultFieldDefs(WorkItemType item) {
        String category = item.getItemCategory() == null ? "custom" : item.getItemCategory();
        String typeCode = item.getTypeCode() == null ? "" : item.getTypeCode().toUpperCase();
        List<DefaultFieldDef> defs = new ArrayList<>();

        defs.add(def("名称", "name", "text", 1, "none", null, null, "记录和命名工作项名称"));
        defs.add(def("描述", "description", "rich_text", 0, "none", null, null, "对工作项详细描述说明"));
        defs.add(def("所属空间", "owned_project", "text", 0, "none", null, null, "默认记录当前工作项所在空间"));
        defs.add(def("状态", "work_item_status", "single_select", 1,
                "none",
                null,
                optionsByCategory(category),
                "当前工作项状态"));
        defs.add(def("工作项", "work_item_type_key", "single_select", 0, "none", item.getTypeCode(), null, "工作项类别编码"));
        defs.add(defWithOptions("优先级", "priority", "single_select", 1,
                List.of("P0", "P1", "P2", "P3"),
                "默认包含 P0/P1/P2/P3"));
        defs.add(def("提出时间", "start_time", "date", 0, "none", null, null, "自动记录工作项创建时间"));
        defs.add(def("更新时间", "updated_at", "date", 0, "none", null, null, "最近一次更新时间"));
        defs.add(def("创建者", "owner", "member", 0, "none", null, null, "自动记录工作项创建人"));
        defs.add(def("当前负责人", "current_status_operator", "member", 0, "none", null, null, "当前状态节点负责人"));
        defs.add(defWithOptions("当前状态授权角色", "current_status_operator_role", "multi_select", 0,
                List.of("管理员", "创建人", "PM", "QA"),
                "负责当前状态流转的角色"));
        defs.add(def("更新人", "updated_by", "member", 0, "none", null, null, "最近一次更新人员"));
        defs.add(def("关注人", "watchers", "members", 0, "none", null, null, "关注工作项进度人员"));
        defs.add(def("是否完成", "finish_status", "switch", 0, "none", null, null, "自动记录节点是否完成"));
        defs.add(def("是否归档", "archiving_status", "switch", 0, "none", null, null, "自动记录是否达到归档状态"));
        defs.add(def("需求文档", "wiki", "url", 0, "none", null, null, "关联文档链接"));
        defs.add(def("工作项ID", "work_item_id", "number", 0, "none", null, null, "工作项唯一标识"));
        defs.add(def("自增数字", "auto_number", "number", 0, "none", null, null, "流水号"));
        defs.add(def("工作项类型", "template", "single_select", 0, "none", item.getTypeName(), null, "工作项流程类型"));
        defs.add(def("归档时间", "archiving_date", "date", 0, "none", null, null, "归档状态达到时的时间"));

        if ("node".equals(item.getFlowMode())) {
            defs.add(defWithOptions("终止原因", "abort_reason", "single_select", 0,
                    List.of("需求变更", "不再需要", "方案调整", "其他"),
                    "终止实例时可选择原因"));
            defs.add(def("补充终止原因", "abort_detail", "text", 0, "none", null, null, "终止工作项时填写补充原因"));
            defs.add(def("完成日期", "finish_time", "date", 0, "none", null, null, "实例完成时间"));
        }

        if ("bug".equals(category)) {
            defs.add(defWithOptions("严重程度", "severity", "single_select", 0,
                    List.of("严重", "重要", "一般", "次要", "建议"),
                    "缺陷严重程度"));
            defs.add(defWithOptions("发现阶段", "issue_stage", "single_select", 0,
                    List.of("UI测试", "UE测试", "开发自测", "冒烟测试", "第一轮测试", "第二轮测试", "回归测试", "灰度阶段", "线上阶段"),
                    "缺陷发现阶段"));
            defs.add(def("解决版本", "resolve_version", "work_item_relation", 0, "none", null, null, "关联修复版本"));
            defs.add(def("多个附件", "multi_attachment", "multi_attachment", 0, "none", null, null, "可上传多个附件"));
        }

        if ("requirement".equals(category)) {
            defs.add(def("排期", "schedule", "date_range", 0, "none", null, null, "记录需求排期区间"));
        }

        if ("task".equals(category)) {
            defs.add(def("备注", "note", "textarea", 0, "none", null, null, "任务补充说明"));
            defs.add(def("排期", "sub_task_schedule", "date_range", 0, "none", null, null, "记录任务排期区间"));
            defs.add(def("实际工时", "actual_work_time", "number", 0, "none", null, null, "记录任务实际投入工时"));
            defs.add(def("完成日期", "finish_time", "date", 0, "none", null, null, "任务完成日期"));
        }

        if (typeCode.contains("VERSION") || typeCode.startsWith("VER")) {
            defs.add(def("版本类型", "version_template", "single_select", 0, "none", null, null, "版本工作项流程类型"));
            defs.add(def("版本封版日期", "envelope_date", "date", 0, "none", null, null, "版本封版时间"));
        }

        if (typeCode.contains("ITER") || typeCode.contains("SPRINT")) {
            defs.add(def("完成日期", "finish_time", "date", 0, "none", null, null, "迭代节点完成时间"));
        }

        return defs;
    }

    private String optionsByCategory(String category) {
        if ("requirement".equals(category)) {
            return writeJson(List.of("开始", "评审中", "已完成", "已终止"));
        }
        if ("bug".equals(category)) {
            return writeJson(List.of("OPEN", "IN_PROGRESS", "RESOLVED", "REOPENED", "CLOSED"));
        }
        if ("task".equals(category)) {
            return writeJson(List.of("未完成", "已完成"));
        }
        return writeJson(List.of("未开始", "进行中", "已完成", "已终止"));
    }

    private DefaultFieldDef def(String fieldName, String fieldKey, String fieldType, Integer required,
                                String defaultValueMode, String defaultValue, String optionsJson, String helpText) {
        return new DefaultFieldDef(fieldName, fieldKey, fieldType, required, defaultValueMode, defaultValue, optionsJson, helpText, "管理员,创建人,PM,QA");
    }

    private DefaultFieldDef defWithOptions(String fieldName, String fieldKey, String fieldType, Integer required,
                                           List<String> options, String helpText) {
        return new DefaultFieldDef(fieldName, fieldKey, fieldType, required, "none", null, writeJson(options), helpText, "管理员,创建人,PM,QA");
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return null;
        }
    }

    private record DefaultFieldDef(
            String fieldName,
            String fieldKey,
            String fieldType,
            Integer isRequired,
            String defaultValueMode,
            String defaultValue,
            String optionsJson,
            String helpText,
            String authorizedRoles
    ) {}
}

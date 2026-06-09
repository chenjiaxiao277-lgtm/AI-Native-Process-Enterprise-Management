package com.tranyu.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.context.SpaceContext;
import com.tranyu.context.TenantContext;
import com.tranyu.entity.WorkItemField;
import com.tranyu.entity.WorkItemRecord;
import com.tranyu.entity.WorkItemType;
import com.tranyu.service.WorkItemFieldService;
import com.tranyu.service.WorkItemRecordService;
import com.tranyu.service.WorkItemTypeService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * 空间配置 - 工作项管理
 */
@RestController
@RequestMapping("/api/system/work-items")
@RequiredArgsConstructor
public class WorkItemTypeController {

    private final WorkItemTypeService service;
    private final WorkItemFieldService fieldService;
    private final WorkItemRecordService recordService;
    private final ObjectMapper objectMapper;

    @GetMapping("/page")
    public Result<Map<String, Object>> page(@RequestParam int current,
                                            @RequestParam int pageSize,
                                            @RequestParam(required = false) String keyword,
                                            @RequestParam(required = false) Integer status,
                                            @RequestParam(required = false) String sourceType,
                                            @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                            @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            String spaceId = requireSpaceId(spaceIdHeader);
            String tenantId = currentTenantId(tenantIdHeader);
            Page<WorkItemType> page = service.page(current, pageSize, keyword, status, sourceType, tenantId, spaceId);
            Map<String, Object> data = new HashMap<>();
            data.put("records", page.getRecords());
            data.put("total", page.getTotal());
            data.put("size", page.getSize());
            data.put("current", page.getCurrent());
            data.put("pages", page.getPages());
            return Result.ok(data);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/all")
    public Result<List<WorkItemType>> all(@RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                          @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            return Result.ok(service.listAll(currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader)));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public Result<WorkItemType> detail(@PathVariable Long id,
                                       @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                       @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemType item = service.getByIdForRead(id, requireSpaceId(spaceIdHeader), currentTenantId(tenantIdHeader));
            return item == null ? Result.fail("工作项类型不存在") : Result.ok(item);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping
    public Result<Void> create(@RequestBody WorkItemBody body,
                               @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            String spaceId = requireSpaceId(spaceIdHeader);
            String tenantId = currentTenantId(tenantIdHeader);
            WorkItemType item = fromBody(body, null);
            service.save(item, tenantId, spaceId);
            return Result.ok(null);
        } catch (IllegalArgumentException | IllegalStateException | DuplicateKeyException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id,
                               @RequestBody WorkItemBody body,
                               @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            String spaceId = requireSpaceId(spaceIdHeader);
            String tenantId = currentTenantId(tenantIdHeader);
            WorkItemType current = service.getById(id, tenantId, spaceId);
            if (current == null) return Result.fail("工作项类型不存在");
            WorkItemType item = fromBody(body, id);
            service.save(item, tenantId, spaceId);
            return Result.ok(null);
        } catch (IllegalArgumentException | IllegalStateException | DuplicateKeyException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id,
                                     @RequestBody StatusBody body,
                                     @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                     @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            service.changeStatus(id, body.getStatus() != null ? body.getStatus() : 0, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id,
                               @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            service.logicDelete(id, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/{id}/settings")
    public Result<WorkItemType> settings(@PathVariable Long id,
                                         @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                         @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemType item = service.getByIdForRead(id, requireSpaceId(spaceIdHeader), currentTenantId(tenantIdHeader));
            return item == null ? Result.fail("工作项类型不存在") : Result.ok(item);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/{id}/settings")
    public Result<Void> updateSettings(@PathVariable Long id,
                                       @RequestBody WorkItemBody body,
                                       @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                       @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            String spaceId = requireSpaceId(spaceIdHeader);
            String tenantId = currentTenantId(tenantIdHeader);
            WorkItemType current = service.getById(id, tenantId, spaceId);
            if (current == null) return Result.fail("工作项类型不存在");
            WorkItemType item = fromBody(body, id);
            service.save(item, tenantId, spaceId);
            return Result.ok(null);
        } catch (IllegalArgumentException | IllegalStateException | DuplicateKeyException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/{id}/fields")
    public Result<List<WorkItemField>> fields(@PathVariable Long id,
                                              @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                              @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemType current = service.getByIdForRead(id, requireSpaceId(spaceIdHeader), currentTenantId(tenantIdHeader));
            if (current == null) return Result.fail("工作项类型不存在");
            return Result.ok(fieldService.listByWorkItem(id));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/{id}/fields")
    public Result<Void> createField(@PathVariable Long id,
                                    @RequestBody FieldBody body,
                                    @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                    @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemType current = service.getById(id, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            if (current == null) return Result.fail("工作项类型不存在");
            WorkItemField field = toField(body, id, null);
            fieldService.saveField(field);
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/{id}/fields/{fieldId}")
    public Result<Void> updateField(@PathVariable Long id,
                                    @PathVariable Long fieldId,
                                    @RequestBody FieldBody body,
                                    @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                    @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemType current = service.getById(id, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            if (current == null) return Result.fail("工作项类型不存在");
            WorkItemField field = toField(body, id, fieldId);
            fieldService.saveField(field);
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @DeleteMapping("/{id}/fields/{fieldId}")
    public Result<Void> deleteField(@PathVariable Long id,
                                    @PathVariable Long fieldId,
                                    @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                    @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemType current = service.getById(id, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            if (current == null) return Result.fail("工作项类型不存在");
            fieldService.deleteField(id, fieldId);
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/{id}/records/page")
    public Result<Map<String, Object>> pageRecords(@PathVariable Long id,
                                                   @RequestParam int current,
                                                   @RequestParam int pageSize,
                                                   @RequestParam(required = false) String keyword,
                                                   @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                                   @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            String spaceId = requireSpaceId(spaceIdHeader);
            String tenantId = currentTenantId(tenantIdHeader);
            Page<WorkItemRecord> page = recordService.page(id, current, pageSize, keyword, tenantId, spaceId);
            List<WorkItemRecord> visibleRecords = page.getRecords().stream()
                    .filter(r -> !Integer.valueOf(1).equals(r.getDeleted()))
                    .toList();
            Map<String, Object> data = new HashMap<>();
            data.put("records", visibleRecords.stream().map(this::toRecordRow).toList());
            data.put("total", page.getTotal() > 0 ? page.getTotal() : visibleRecords.size());
            data.put("size", page.getSize());
            data.put("current", page.getCurrent());
            data.put("pages", page.getPages());
            return Result.ok(data);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/{id}/records/{recordId}")
    public Result<Map<String, Object>> recordDetail(@PathVariable Long id,
                                                    @PathVariable Long recordId,
                                                    @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                                    @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemRecord record = recordService.getById(id, recordId, requireSpaceId(spaceIdHeader), currentTenantId(tenantIdHeader));
            return record == null ? Result.fail("工作项记录不存在") : Result.ok(toRecordRow(record));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/{id}/records")
    public Result<Long> createRecord(@PathVariable Long id,
                                     @RequestBody RecordBody body,
                                     @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                     @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemRecord record = fromRecordBody(body);
            Long newId = recordService.create(id, record, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            return Result.ok(newId);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/{id}/records/{recordId}")
    public Result<Void> updateRecord(@PathVariable Long id,
                                     @PathVariable Long recordId,
                                     @RequestBody RecordBody body,
                                     @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                     @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            WorkItemRecord record = fromRecordBody(body);
            recordService.update(id, recordId, record, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @DeleteMapping("/{id}/records/{recordId}")
    public Result<Void> deleteRecord(@PathVariable Long id,
                                     @PathVariable Long recordId,
                                     @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                                     @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            recordService.delete(id, recordId, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/{id}/unbind")
    public Result<Void> unbind(@PathVariable Long id,
                               @RequestHeader(value = "X-Space-Id", required = false) String spaceIdHeader,
                               @RequestHeader(value = "X-Tenant-Id", required = false) String tenantIdHeader) {
        try {
            service.unbindReuse(id, currentTenantId(tenantIdHeader), requireSpaceId(spaceIdHeader));
            return Result.ok(null);
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    private String requireSpaceId(String spaceIdHeader) {
        String fromRequest = (spaceIdHeader == null || spaceIdHeader.isBlank()) ? null : spaceIdHeader.trim();
        String spaceId = fromRequest != null ? fromRequest : SpaceContext.getCurrentSpaceId();
        if (spaceId == null || spaceId.isBlank()) {
            throw new IllegalArgumentException("缺少空间标识，请刷新页面后重试");
        }
        return spaceId.trim();
    }

    private String currentTenantId(String tenantIdHeader) {
        if (tenantIdHeader != null && !tenantIdHeader.isBlank()) {
            return tenantIdHeader.trim();
        }
        return TenantContext.getCurrentTenantIdOrDefault();
    }

    private WorkItemType fromBody(WorkItemBody body, Long id) {
        WorkItemType item = new WorkItemType();
        item.setId(id);
        item.setTypeName(body.getTypeName());
        item.setTypeCode(body.getTypeCode());
        item.setItemCategory(body.getItemCategory());
        item.setSourceType(body.getSourceType());
        item.setSourceSpace(body.getSourceSpace());
        item.setSourceWorkItem(body.getSourceWorkItem());
        item.setReuseSourceId(body.getReuseSourceId());
        item.setReuseBound(body.getReuseBound());
        item.setFlowMode(body.getFlowMode());
        item.setSystemIdentifier(body.getSystemIdentifier());
        item.setIconColor(body.getIconColor());
        item.setIconKey(body.getIconKey());
        item.setCopyFieldsJson(body.getCopyFieldsJson());
        item.setCopyRolesJson(body.getCopyRolesJson());
        item.setBaselineEnabled(body.getBaselineEnabled());
        item.setNavEntryEnabled(body.getNavEntryEnabled());
        item.setDetailLayoutJson(body.getDetailLayoutJson());
        item.setFlowRuleJson(body.getFlowRuleJson());
        item.setFlowRoleJson(body.getFlowRoleJson());
        item.setViewLayoutJson(body.getViewLayoutJson());
        item.setOwnerRole(body.getOwnerRole());
        item.setWorkflowName(body.getWorkflowName());
        item.setRequiredPolicy(body.getRequiredPolicy());
        item.setSlaHours(body.getSlaHours());
        item.setSort(body.getSort());
        item.setStatus(body.getStatus());
        item.setDescription(body.getDescription());
        return item;
    }

    private WorkItemField toField(FieldBody body, Long workItemId, Long id) {
        WorkItemField f = new WorkItemField();
        f.setId(id);
        f.setWorkItemId(workItemId);
        f.setFieldName(body.getFieldName());
        f.setFieldKey(body.getFieldKey());
        f.setFieldType(body.getFieldType());
        f.setAuthorizedRoles(body.getAuthorizedRoles());
        f.setIsEnabled(body.getIsEnabled());
        f.setIsRequired(body.getIsRequired());
        f.setDefaultValueMode(body.getDefaultValueMode());
        f.setDefaultValue(body.getDefaultValue());
        f.setOptionsJson(body.getOptionsJson());
        f.setHelpText(body.getHelpText());
        f.setSort(body.getSort());
        return f;
    }

    private WorkItemRecord fromRecordBody(RecordBody body) {
        WorkItemRecord record = new WorkItemRecord();
        Map<String, Object> map = body.getData() == null ? new HashMap<>() : new HashMap<>(body.getData());
        String title = Objects.toString(body.getTitle(), null);
        if (title == null || title.isBlank()) {
            Object v = map.get("name");
            if (v == null) v = map.get("title");
            if (v == null) v = map.get("名称");
            title = v == null ? null : String.valueOf(v);
        }
        record.setTitle(title);
        record.setStatus(body.getStatus());
        try {
            record.setDataJson(objectMapper.writeValueAsString(map));
        } catch (Exception e) {
            throw new IllegalArgumentException("记录内容格式非法");
        }
        return record;
    }

    private Map<String, Object> toRecordRow(WorkItemRecord record) {
        Map<String, Object> row;
        try {
            row = record.getDataJson() == null || record.getDataJson().isBlank()
                    ? new HashMap<>()
                    : objectMapper.readValue(record.getDataJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            row = new HashMap<>();
        }
        row.put("id", record.getId());
        row.put("title", record.getTitle());
        row.put("status", record.getStatus());
        row.put("workItemTypeId", record.getWorkItemTypeId());
        row.put("createTime", record.getCreateTime());
        row.put("updateTime", record.getUpdateTime());
        return row;
    }

    @Data
    public static class StatusBody {
        private Integer status;
    }

    @Data
    public static class WorkItemBody {
        private String typeName;
        private String typeCode;
        private String itemCategory;
        private String sourceType;
        private String sourceSpace;
        private String sourceWorkItem;
        private Long reuseSourceId;
        private Integer reuseBound;
        private String flowMode;
        private String systemIdentifier;
        private String iconColor;
        private String iconKey;
        private String copyFieldsJson;
        private String copyRolesJson;
        private Integer baselineEnabled;
        private Integer navEntryEnabled;
        private String detailLayoutJson;
        private String flowRuleJson;
        private String flowRoleJson;
        private String viewLayoutJson;
        private String ownerRole;
        private String workflowName;
        private String requiredPolicy;
        private Integer slaHours;
        private Integer sort;
        private Integer status;
        private String description;
    }

    @Data
    public static class FieldBody {
        private String fieldName;
        private String fieldKey;
        private String fieldType;
        private String authorizedRoles;
        private Integer isEnabled;
        private Integer isRequired;
        private String defaultValueMode;
        private String defaultValue;
        private String optionsJson;
        private String helpText;
        private Integer sort;
    }

    @Data
    public static class RecordBody {
        private String title;
        private Integer status;
        private Map<String, Object> data;
    }
}

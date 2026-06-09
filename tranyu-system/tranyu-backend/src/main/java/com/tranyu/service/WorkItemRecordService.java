package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.entity.WorkItemRecord;
import com.tranyu.entity.WorkItemType;
import com.tranyu.mapper.WorkItemRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkItemRecordService {

    private final WorkItemRecordMapper recordMapper;
    private final WorkItemTypeService typeService;
    private final SpaceRelationAuthService spaceRelationAuthService;
    private final PermissionFacade permissionFacade;

    public Page<WorkItemRecord> page(Long workItemTypeId,
                                     int current,
                                     int pageSize,
                                     String keyword,
                                     String tenantId,
                                     String requesterSpaceId) {
        permissionFacade.assertWorkItemView(tenantId, requesterSpaceId);
        WorkItemType type = ensureWorkItemTypeReadable(workItemTypeId, requesterSpaceId, tenantId);
        String targetSpaceId = type.getSpaceId();
        boolean sameSpace = requesterSpaceId.equals(targetSpaceId);
        boolean allowByType = sameSpace || hasWorkItemTypeReadableAuth(workItemTypeId, requesterSpaceId, targetSpaceId, tenantId);
        boolean allowByRecordAll = sameSpace || hasWorkItemRecordReadableAuth(null, requesterSpaceId, targetSpaceId, tenantId);
        List<Long> allowedRecordIds = List.of();
        if (!sameSpace && !allowByType && !allowByRecordAll) {
            allowedRecordIds = listReadableRecordIds(requesterSpaceId, targetSpaceId, tenantId);
            if (allowedRecordIds.isEmpty()) {
                throw new IllegalArgumentException("工作项类型不存在或无权访问");
            }
        }
        LambdaQueryWrapper<WorkItemRecord> q = new LambdaQueryWrapper<WorkItemRecord>()
                .eq(WorkItemRecord::getWorkItemTypeId, workItemTypeId)
                .eq(WorkItemRecord::getTenantId, tenantId)
                .eq(WorkItemRecord::getSpaceId, targetSpaceId)
                .eq(WorkItemRecord::getDeleted, 0);
        if (!sameSpace && !allowByType && !allowByRecordAll) {
            q.in(WorkItemRecord::getId, allowedRecordIds);
        }
        if (keyword != null && !keyword.isBlank()) {
            q.like(WorkItemRecord::getTitle, keyword.trim());
        }
        q.orderByDesc(WorkItemRecord::getId);
        return recordMapper.selectPage(new Page<>(current, pageSize), q);
    }

    public WorkItemRecord getById(Long workItemTypeId, Long id, String requesterSpaceId, String tenantId) {
        permissionFacade.assertWorkItemView(tenantId, requesterSpaceId);
        WorkItemType type = ensureWorkItemTypeReadable(workItemTypeId, requesterSpaceId, tenantId);
        WorkItemRecord record = recordMapper.selectById(id);
        String targetSpaceId = type.getSpaceId();
        boolean sameSpace = requesterSpaceId.equals(targetSpaceId);
        if (!sameSpace
                && !hasWorkItemTypeReadableAuth(workItemTypeId, requesterSpaceId, targetSpaceId, tenantId)
                && !hasWorkItemRecordReadableAuth(String.valueOf(id), requesterSpaceId, targetSpaceId, tenantId)) {
            return null;
        }
        if (record == null
                || !workItemTypeId.equals(record.getWorkItemTypeId())
                || !tenantId.equals(record.getTenantId())
                || !targetSpaceId.equals(record.getSpaceId())
                || Integer.valueOf(1).equals(record.getDeleted())) {
            return null;
        }
        return record;
    }

    @Transactional(rollbackFor = Exception.class)
    public Long create(Long workItemTypeId, WorkItemRecord record, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemCreate(tenantId, spaceId);
        ensureWorkItemTypeWritable(workItemTypeId, tenantId, spaceId);
        record.setId(null);
        record.setWorkItemTypeId(workItemTypeId);
        record.setTenantId(tenantId);
        record.setSpaceId(spaceId);
        if (record.getStatus() == null) {
            record.setStatus(1);
        }
        if (record.getDeleted() == null) {
            record.setDeleted(0);
        }
        if (record.getTitle() == null || record.getTitle().isBlank()) {
            throw new IllegalArgumentException("标题不能为空");
        }
        recordMapper.insert(record);
        return record.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void update(Long workItemTypeId, Long id, WorkItemRecord update, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemEdit(tenantId, spaceId);
        ensureWorkItemTypeWritable(workItemTypeId, tenantId, spaceId);
        WorkItemRecord current = getById(workItemTypeId, id, spaceId, tenantId);
        if (current == null) {
            throw new IllegalArgumentException("工作项记录不存在");
        }
        WorkItemRecord record = new WorkItemRecord();
        record.setId(id);
        record.setWorkItemTypeId(workItemTypeId);
        record.setTenantId(tenantId);
        record.setSpaceId(spaceId);
        record.setTitle((update.getTitle() == null || update.getTitle().isBlank()) ? current.getTitle() : update.getTitle());
        record.setStatus(update.getStatus() == null ? current.getStatus() : update.getStatus());
        record.setDataJson(update.getDataJson() == null ? current.getDataJson() : update.getDataJson());
        recordMapper.updateById(record);
    }

    public void delete(Long workItemTypeId, Long id, String tenantId, String spaceId) {
        permissionFacade.assertWorkItemDelete(tenantId, spaceId);
        ensureWorkItemTypeWritable(workItemTypeId, tenantId, spaceId);
        WorkItemRecord current = getById(workItemTypeId, id, spaceId, tenantId);
        if (current == null) {
            throw new IllegalArgumentException("工作项记录不存在");
        }
        recordMapper.deleteById(id);
    }

    private WorkItemType ensureWorkItemTypeWritable(Long workItemTypeId, String tenantId, String spaceId) {
        WorkItemType workItemType = typeService.getById(workItemTypeId, tenantId, spaceId);
        if (workItemType == null || Integer.valueOf(1).equals(workItemType.getDeleted())) {
            throw new IllegalArgumentException("工作项类型不存在");
        }
        return workItemType;
    }

    private WorkItemType ensureWorkItemTypeReadable(Long workItemTypeId, String requesterSpaceId, String tenantId) {
        WorkItemType workItemType = typeService.getByIdInTenant(workItemTypeId, tenantId);
        if (workItemType == null || Integer.valueOf(1).equals(workItemType.getDeleted())) {
            throw new IllegalArgumentException("工作项类型不存在或无权访问");
        }
        if (requesterSpaceId.equals(workItemType.getSpaceId())) {
            return workItemType;
        }
        boolean allowByType = hasWorkItemTypeReadableAuth(
                workItemTypeId,
                requesterSpaceId,
                workItemType.getSpaceId(),
                tenantId);
        boolean allowByRecord = hasWorkItemRecordReadableAuth(
                null,
                requesterSpaceId,
                workItemType.getSpaceId(),
                tenantId) || !listReadableRecordIds(requesterSpaceId, workItemType.getSpaceId(), tenantId).isEmpty();
        if (!allowByType && !allowByRecord) {
            throw new IllegalArgumentException("工作项类型不存在或无权访问");
        }
        return workItemType;
    }

    private boolean hasWorkItemTypeReadableAuth(Long workItemTypeId,
                                                String requesterSpaceId,
                                                String targetSpaceId,
                                                String tenantId) {
        return spaceRelationAuthService.hasReadableAuth(
                tenantId,
                requesterSpaceId,
                targetSpaceId,
                "work_item_type",
                String.valueOf(workItemTypeId));
    }

    private boolean hasWorkItemRecordReadableAuth(String recordId,
                                                  String requesterSpaceId,
                                                  String targetSpaceId,
                                                  String tenantId) {
        return spaceRelationAuthService.hasReadableAuth(
                tenantId,
                requesterSpaceId,
                targetSpaceId,
                "work_item_record",
                recordId);
    }

    private List<Long> listReadableRecordIds(String requesterSpaceId, String targetSpaceId, String tenantId) {
        return spaceRelationAuthService.listReadableResourceKeys(
                        tenantId,
                        requesterSpaceId,
                        targetSpaceId,
                        "work_item_record")
                .stream()
                .map(this::toLongSafely)
                .filter(v -> v != null)
                .toList();
    }

    private Long toLongSafely(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ignore) {
            return null;
        }
    }
}

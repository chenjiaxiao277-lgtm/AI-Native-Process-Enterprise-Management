package com.tranyu.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.entity.WorkItemRecord;
import com.tranyu.entity.WorkItemType;
import com.tranyu.mapper.WorkItemRecordMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkItemRecordServicePermissionTest {

    @Mock
    private WorkItemRecordMapper recordMapper;
    @Mock
    private WorkItemTypeService typeService;
    @Mock
    private SpaceRelationAuthService spaceRelationAuthService;
    @Mock
    private PermissionFacade permissionFacade;

    @InjectMocks
    private WorkItemRecordService service;

    @Test
    void page_shouldAssertViewPermission() {
        WorkItemType type = workItemType(1L, "default", "9");
        when(typeService.getByIdInTenant(1L, "default")).thenReturn(type);
        when(recordMapper.selectPage(any(), any())).thenReturn(new Page<>());

        service.page(1L, 1, 10, null, "default", "9");

        verify(permissionFacade).assertWorkItemView("default", "9");
        verify(recordMapper).selectPage(any(), any());
    }

    @Test
    void create_shouldAssertCreatePermission() {
        when(typeService.getById(1L, "default", "9")).thenReturn(workItemType(1L, "default", "9"));
        WorkItemRecord record = new WorkItemRecord();
        record.setTitle("测试记录");

        service.create(1L, record, "default", "9");

        verify(permissionFacade).assertWorkItemCreate("default", "9");
        verify(recordMapper).insert(any(WorkItemRecord.class));
    }

    @Test
    void update_shouldAssertEditPermission() {
        when(typeService.getById(1L, "default", "9")).thenReturn(workItemType(1L, "default", "9"));
        WorkItemRecord current = new WorkItemRecord();
        current.setId(2L);
        current.setWorkItemTypeId(1L);
        current.setTenantId("default");
        current.setSpaceId("9");
        current.setDeleted(0);
        current.setTitle("旧标题");
        current.setStatus(1);
        when(typeService.getByIdInTenant(1L, "default")).thenReturn(workItemType(1L, "default", "9"));
        when(recordMapper.selectById(2L)).thenReturn(current);

        WorkItemRecord update = new WorkItemRecord();
        update.setTitle("新标题");

        service.update(1L, 2L, update, "default", "9");

        verify(permissionFacade).assertWorkItemEdit("default", "9");
        verify(recordMapper).updateById(any(WorkItemRecord.class));
    }

    @Test
    void delete_shouldAssertDeletePermission() {
        when(typeService.getById(1L, "default", "9")).thenReturn(workItemType(1L, "default", "9"));
        when(typeService.getByIdInTenant(1L, "default")).thenReturn(workItemType(1L, "default", "9"));
        WorkItemRecord current = new WorkItemRecord();
        current.setId(2L);
        current.setWorkItemTypeId(1L);
        current.setTenantId("default");
        current.setSpaceId("9");
        current.setDeleted(0);
        when(recordMapper.selectById(2L)).thenReturn(current);

        service.delete(1L, 2L, "default", "9");

        verify(permissionFacade).assertWorkItemDelete("default", "9");
        verify(recordMapper).deleteById(2L);
    }

    private WorkItemType workItemType(Long id, String tenantId, String spaceId) {
        WorkItemType type = new WorkItemType();
        type.setId(id);
        type.setTenantId(tenantId);
        type.setSpaceId(spaceId);
        type.setDeleted(0);
        return type;
    }
}

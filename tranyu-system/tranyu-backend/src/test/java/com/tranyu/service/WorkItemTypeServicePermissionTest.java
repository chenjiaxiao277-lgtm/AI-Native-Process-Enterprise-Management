package com.tranyu.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tranyu.entity.WorkItemType;
import com.tranyu.mapper.WorkItemTypeMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkItemTypeServicePermissionTest {

    @Mock
    private WorkItemTypeMapper mapper;
    @Mock
    private WorkItemFieldService fieldService;
    @Mock
    private SpaceRelationAuthService spaceRelationAuthService;
    @Mock
    private PermissionFacade permissionFacade;
    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private WorkItemTypeService service;

    @Test
    void page_shouldAssertViewPermission() {
        when(mapper.selectPage(any(), any())).thenReturn(new Page<>());

        service.page(1, 10, null, null, null, "default", "9");

        verify(permissionFacade).assertWorkItemView("default", "9");
        verify(mapper).selectPage(any(), any());
    }

    @Test
    void save_shouldAssertCreatePermissionForNewType() {
        WorkItemType item = new WorkItemType();
        item.setTypeName("需求");
        item.setTypeCode("REQ");
        item.setSourceType("custom");
        when(mapper.selectCount(any())).thenReturn(0L);
        when(mapper.selectOne(any())).thenReturn(null);

        service.save(item, "default", "9");

        verify(permissionFacade).assertWorkItemCreate("default", "9");
        verify(mapper).insert(any(WorkItemType.class));
    }

    @Test
    void changeStatus_shouldAssertEditPermission() {
        WorkItemType current = new WorkItemType();
        current.setId(1L);
        current.setTenantId("default");
        current.setSpaceId("9");
        current.setDeleted(0);
        when(mapper.selectById(1L)).thenReturn(current);

        service.changeStatus(1L, 1, "default", "9");

        verify(permissionFacade).assertWorkItemEdit("default", "9");
        verify(mapper).updateById(any(WorkItemType.class));
    }

    @Test
    void logicDelete_shouldAssertDeletePermission() {
        WorkItemType current = new WorkItemType();
        current.setId(1L);
        current.setTenantId("default");
        current.setSpaceId("9");
        current.setDeleted(0);
        when(mapper.selectById(1L)).thenReturn(current);

        service.logicDelete(1L, "default", "9");

        verify(permissionFacade).assertWorkItemDelete("default", "9");
        verify(mapper).updateById(any(WorkItemType.class));
    }
}

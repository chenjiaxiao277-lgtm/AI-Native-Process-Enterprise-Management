package com.tranyu.service;

import com.tranyu.entity.SpaceRelationAuth;
import com.tranyu.mapper.SpaceRelationAuthMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpaceRelationAuthServicePermissionTest {

    @Mock
    private SpaceRelationAuthMapper mapper;
    @Mock
    private PermissionFacade permissionFacade;

    @InjectMocks
    private SpaceRelationAuthService service;

    @Test
    void listBySourceSpace_shouldCheckReadablePermissionBeforeQuery() {
        when(mapper.selectList(any())).thenReturn(List.of());

        service.listBySourceSpace("default", "9", "work_item_type");

        verify(permissionFacade).assertSpaceConfigReadable("default", "9");
        verify(mapper).selectList(any());
    }

    @Test
    void save_shouldStopWhenWritablePermissionDenied() {
        SpaceRelationAuth item = new SpaceRelationAuth();
        item.setTargetSpaceId("8");
        item.setResourceType("work_item_type");

        org.mockito.Mockito.doThrow(new IllegalArgumentException("无权维护空间授权配置"))
                .when(permissionFacade).assertSpaceConfigWritable("default", "9");

        assertThatThrownBy(() -> service.save("default", "9", item))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("无权维护空间授权配置");

        verify(mapper, never()).insert(any(SpaceRelationAuth.class));
        verify(mapper, never()).updateById(any(SpaceRelationAuth.class));
    }

    @Test
    void delete_shouldCheckWritablePermissionBeforeDelete() {
        SpaceRelationAuth existing = new SpaceRelationAuth();
        existing.setId(1L);
        existing.setTenantId("default");
        existing.setSourceSpaceId("9");
        when(mapper.selectById(1L)).thenReturn(existing);

        service.delete("default", "9", 1L);

        verify(permissionFacade).assertSpaceConfigWritable("default", "9");
        verify(mapper).deleteById(1L);
    }
}

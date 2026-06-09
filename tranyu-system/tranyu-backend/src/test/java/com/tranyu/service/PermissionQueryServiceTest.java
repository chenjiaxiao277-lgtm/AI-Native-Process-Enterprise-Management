package com.tranyu.service;

import com.tranyu.entity.PermissionMenu;
import com.tranyu.entity.PermissionPage;
import com.tranyu.entity.PermissionRoleResource;
import com.tranyu.entity.PermissionRouter;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUserRole;
import com.tranyu.mapper.PermissionMenuMapper;
import com.tranyu.mapper.PermissionPageMapper;
import com.tranyu.mapper.PermissionRoleResourceMapper;
import com.tranyu.mapper.PermissionRouterMapper;
import com.tranyu.mapper.SysRoleMapper;
import com.tranyu.mapper.SysUserRoleMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionQueryServiceTest {

    @Mock
    private SysUserRoleMapper userRoleMapper;
    @Mock
    private SysRoleMapper roleMapper;
    @Mock
    private PermissionRoleResourceMapper permissionRoleResourceMapper;
    @Mock
    private PermissionMenuMapper permissionMenuMapper;
    @Mock
    private PermissionRouterMapper permissionRouterMapper;
    @Mock
    private PermissionPageMapper permissionPageMapper;

    @InjectMocks
    private PermissionQueryService permissionQueryService;

    @Test
    void queryUserSummary_shouldResolveUserRoleResourceChainWithDenyPriority() {
        SysUserRole relation = new SysUserRole();
        relation.setUserId(101L);
        relation.setRoleId(201L);
        when(userRoleMapper.selectList(any())).thenReturn(List.of(relation));

        SysRole role = new SysRole();
        role.setId(201L);
        role.setRoleCode("space_admin");
        role.setRoleName("空间管理员");
        role.setStatus(1);
        role.setDeleted(0);
        role.setSort(1);
        when(roleMapper.selectBatchIds(any())).thenReturn(List.of(role));

        when(permissionRoleResourceMapper.selectList(any())).thenReturn(List.of(
                resourceBinding(201L, "menu", "space_management", "allow", 0L),
                resourceBinding(201L, "menu", "space_config_menu", "allow", 9L),
                resourceBinding(201L, "menu", "space_management", "deny", 9L),
                resourceBinding(201L, "router", "space_config", "allow", 9L),
                resourceBinding(201L, "page", "space_config_page", "allow", 9L)
        ));

        when(permissionMenuMapper.selectList(any())).thenReturn(List.of(
                menu("space_config_menu", "空间配置菜单", 0L, 100, 1L),
                menu("space_config_menu", "空间配置菜单(空间)", 9L, 1, 2L)
        ));
        when(permissionRouterMapper.selectList(any())).thenReturn(List.of(
                router("space_config", "空间配置", 0L, 100, 10L),
                router("space_config", "空间配置(空间)", 9L, 1, 11L)
        ));
        when(permissionPageMapper.selectList(any())).thenReturn(List.of(
                page("space_config_page", "空间配置页", 9L, 20L)
        ));

        PermissionQueryService.PermissionResourceSummary summary =
                permissionQueryService.queryUserSummary(101L, "default", 9L);

        assertThat(summary.getRoles()).hasSize(1);
        assertThat(summary.getRoles().get(0).getCode()).isEqualTo("space_admin");
        assertThat(summary.getMenus().getCount()).isEqualTo(1);
        assertThat(summary.getMenus().getCodes()).containsExactly("space_config_menu");
        assertThat(summary.getMenus().getCodes()).doesNotContain("space_management");
        assertThat(summary.getRouters().getCodes()).containsExactly("space_config");
        assertThat(summary.getPages().getCodes()).containsExactly("space_config_page");
    }

    @Test
    void queryUserSummary_shouldReturnEmptySummaryWhenUserHasNoRole() {
        when(userRoleMapper.selectList(any())).thenReturn(List.of());

        PermissionQueryService.PermissionResourceSummary summary =
                permissionQueryService.queryUserSummary(101L, "default", 0L);

        assertThat(summary.getRoles()).isEmpty();
        assertThat(summary.getMenus().getCount()).isZero();
        assertThat(summary.getRouters().getCount()).isZero();
        assertThat(summary.getPages().getCount()).isZero();
    }

    private PermissionRoleResource resourceBinding(Long roleId,
                                                   String resourceType,
                                                   String resourceCode,
                                                   String effectType,
                                                   Long spaceId) {
        PermissionRoleResource binding = new PermissionRoleResource();
        binding.setTenantId("default");
        binding.setSpaceId(spaceId);
        binding.setRoleId(roleId);
        binding.setResourceType(resourceType);
        binding.setResourceCode(resourceCode);
        binding.setEffectType(effectType);
        binding.setStatus(1);
        binding.setDeleted(0);
        return binding;
    }

    private PermissionMenu menu(String code, String name, Long spaceId, Integer sort, Long id) {
        PermissionMenu menu = new PermissionMenu();
        menu.setId(id);
        menu.setTenantId("default");
        menu.setSpaceId(spaceId);
        menu.setMenuCode(code);
        menu.setMenuName(name);
        menu.setSort(sort);
        menu.setStatus(1);
        menu.setDeleted(0);
        return menu;
    }

    private PermissionRouter router(String code, String name, Long spaceId, Integer sort, Long id) {
        PermissionRouter router = new PermissionRouter();
        router.setId(id);
        router.setTenantId("default");
        router.setSpaceId(spaceId);
        router.setRouterCode(code);
        router.setRouterName(name);
        router.setSort(sort);
        router.setStatus(1);
        router.setDeleted(0);
        return router;
    }

    private PermissionPage page(String code, String name, Long spaceId, Long id) {
        PermissionPage page = new PermissionPage();
        page.setId(id);
        page.setTenantId("default");
        page.setSpaceId(spaceId);
        page.setPageCode(code);
        page.setPageName(name);
        page.setStatus(1);
        page.setDeleted(0);
        return page;
    }
}

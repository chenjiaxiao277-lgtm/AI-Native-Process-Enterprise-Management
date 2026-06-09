package com.tranyu.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.common.Result;
import com.tranyu.entity.SysRole;
import com.tranyu.entity.SysUser;
import com.tranyu.service.SysRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system/roles")
@RequiredArgsConstructor
public class SysRoleController {

    private final SysRoleService roleService;

    @GetMapping("/page")
    public Result<Map<String, Object>> page(@RequestParam int current,
                                            @RequestParam int pageSize,
                                            @RequestParam(required = false) String roleName,
                                            @RequestParam(required = false) String roleCode,
                                            @RequestParam(required = false) Integer status) {
        Page<SysRole> page = roleService.page(current, pageSize, roleName, roleCode, status);
        Map<String, Object> data = new HashMap<>();
        data.put("records", page.getRecords());
        data.put("total", page.getTotal());
        data.put("size", page.getSize());
        data.put("current", page.getCurrent());
        data.put("pages", page.getPages());
        return Result.ok(data);
    }

    @GetMapping("/all")
    public Result<List<SysRole>> allEnabled() {
        return Result.ok(roleService.listAllEnabled());
    }

    @GetMapping("/{id}")
    public Result<SysRole> detail(@PathVariable Long id) {
        SysRole r = roleService.getById(id);
        return r == null ? Result.fail("角色不存在") : Result.ok(r);
    }

    @PostMapping
    public Result<Void> create(@RequestBody SysRole role) {
        role.setId(null);
        roleService.save(role);
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody SysRole role) {
        role.setId(id);
        roleService.save(role);
        return Result.ok(null);
    }

    @PostMapping("/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Integer status = body.get("status");
        roleService.changeStatus(id, status != null ? status : 0);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        roleService.logicDelete(id);
        return Result.ok(null);
    }

    @GetMapping("/{id}/users")
    public Result<List<SysUser>> users(@PathVariable Long id) {
        return Result.ok(roleService.listUsersByRole(id));
    }
}


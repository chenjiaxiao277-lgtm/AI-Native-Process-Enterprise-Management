package com.tranyu.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.entity.SysUser;
import com.tranyu.service.SysUserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system/users")
@RequiredArgsConstructor
public class SysUserController {

    private final SysUserService userService;

    @GetMapping("/page")
    public Result<Map<String, Object>> page(@RequestParam int current,
                                            @RequestParam int pageSize,
                                            @RequestParam(required = false) String username,
                                            @RequestParam(required = false) String realName,
                                            @RequestParam(required = false) Long deptId,
                                            @RequestParam(required = false) Integer status) {
        Page<SysUser> page = userService.page(current, pageSize, username, realName, deptId, status);
        Map<String, Object> data = new HashMap<>();
        data.put("records", page.getRecords());
        data.put("total", page.getTotal());
        data.put("size", page.getSize());
        data.put("current", page.getCurrent());
        data.put("pages", page.getPages());
        return Result.ok(data);
    }

    @GetMapping("/{id}")
    public Result<SysUser> detail(@PathVariable Long id) {
        SysUser u = userService.getById(id);
        return u == null ? Result.fail("用户不存在") : Result.ok(u);
    }

    @PostMapping
    public Result<Void> create(@RequestBody SysUserSaveRequest req) {
        SysUser u = req.toEntity();
        userService.createUser(u, req.getRoleIds());
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody SysUserSaveRequest req) {
        SysUser u = req.toEntity();
        u.setId(id);
        userService.updateUser(u, req.getRoleIds());
        return Result.ok(null);
    }

    @PostMapping("/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Integer status = body.get("status");
        userService.changeStatus(id, status != null ? status : 0);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        userService.logicDelete(id);
        return Result.ok(null);
    }

    /**
     * 保存用户时的请求体：基础信息 + 角色ID集合
     */
    @Data
    public static class SysUserSaveRequest {
        private Long id;
        private String username;
        private String realName;
        private Long deptId;
        private Integer status;
        private String phone;
        private String email;
        private Integer gender;
        private List<Long> roleIds;

        public SysUser toEntity() {
            SysUser u = new SysUser();
            u.setId(id);
            u.setUsername(username);
            u.setRealName(realName);
            u.setDeptId(deptId);
            u.setStatus(status);
            u.setPhone(phone);
            u.setEmail(email);
            u.setGender(gender);
            return u;
        }
    }
}

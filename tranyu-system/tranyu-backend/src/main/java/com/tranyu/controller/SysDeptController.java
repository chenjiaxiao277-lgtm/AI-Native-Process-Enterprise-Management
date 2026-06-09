package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.entity.SysDept;
import com.tranyu.service.SysDeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system/depts")
@RequiredArgsConstructor
public class SysDeptController {

    private final SysDeptService deptService;

    @GetMapping("/tree")
    public Result<List<SysDept>> tree() {
        return Result.ok(deptService.tree());
    }

    @GetMapping
    public Result<List<SysDept>> list() {
        return Result.ok(deptService.listAll());
    }

    @GetMapping("/{id}")
    public Result<SysDept> detail(@PathVariable Long id) {
        SysDept d = deptService.getById(id);
        return d == null ? Result.fail("部门不存在") : Result.ok(d);
    }

    @PostMapping
    public Result<Void> create(@RequestBody SysDept dept) {
        dept.setId(null);
        deptService.save(dept);
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody SysDept dept) {
        dept.setId(id);
        deptService.save(dept);
        return Result.ok(null);
    }

    @PostMapping("/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Integer status = body.get("status");
        deptService.changeStatus(id, status != null ? status : 0);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        deptService.logicDelete(id);
        return Result.ok(null);
    }
}

package com.tranyu.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.entity.BizField;
import com.tranyu.entity.BizModule;
import com.tranyu.service.BizFieldService;
import com.tranyu.service.BizModuleService;
import com.tranyu.service.BizTemplateService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 系统管理 - 业务模块配置接口
 */
@RestController
@RequestMapping("/api/system/biz-modules")
@RequiredArgsConstructor
public class BizModuleController {

    private final BizModuleService moduleService;
    private final BizFieldService fieldService;
    private final BizTemplateService templateService;

    // ---------- 模块管理 ----------
    @GetMapping("/page")
    public Result<Page<BizModule>> page(@RequestParam int current,
                                        @RequestParam int pageSize,
                                        @RequestParam(required = false) String keyword,
                                        @RequestParam(required = false) Integer status) {
        return Result.ok(moduleService.page(current, pageSize, keyword, status));
    }

    @PostMapping
    public Result<Void> create(@RequestBody BizModuleCreateRequest req) {
        BizModule m = new BizModule();
        m.setModuleCode(req.getModuleCode());
        m.setModuleName(req.getModuleName());
        m.setCategory(req.getCategory());
        m.setTableName(req.getTableName());
        m.setBindType(req.getBindType());
        m.setStatus(req.getStatus() != null ? req.getStatus() : 1);
        m.setRemark(req.getRemark());
        moduleService.create(m);
        return Result.ok(null);
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody BizModuleCreateRequest req) {
        BizModule m = moduleService.getById(id);
        if (m == null) return Result.fail("模块不存在");
        m.setModuleName(req.getModuleName());
        m.setCategory(req.getCategory());
        m.setRemark(req.getRemark());
        moduleService.update(m);
        return Result.ok(null);
    }

    @PostMapping("/{id}/status")
    public Result<Void> changeStatus(@PathVariable Long id, @RequestBody StatusBody body) {
        moduleService.changeStatus(id, body.getStatus() != null ? body.getStatus() : 0);
        return Result.ok(null);
    }

    /**
     * 根据 moduleCode 返回字段配置，用于前端动态渲染列表/表单
     */
    @GetMapping("/config/{moduleCode}")
    public Result<ModuleConfigVO> moduleConfig(@PathVariable String moduleCode) {
        BizModule m = moduleService.getByCode(moduleCode);
        if (m == null) {
            return Result.fail("模块不存在");
        }
        List<BizField> fields = fieldService.listByModule(m.getId());
        ModuleConfigVO vo = new ModuleConfigVO();
        vo.setModuleCode(m.getModuleCode());
        vo.setModuleName(m.getModuleName());
        vo.setFields(fields);
        return Result.ok(vo);
    }

    // ---------- 字段配置 ----------
    @GetMapping("/{id}/fields")
    public Result<List<BizField>> listFields(@PathVariable Long id) {
        return Result.ok(fieldService.listByModule(id));
    }

    @PostMapping("/{id}/fields/batch-update")
    public Result<Void> batchUpdate(@PathVariable Long id, @RequestBody List<BizField> fields) {
        fieldService.batchUpdate(id, fields);
        return Result.ok(null);
    }

    // ---------- 模板 ----------
    @PostMapping("/{id}/template/save")
    public Result<Void> saveTemplate(@PathVariable Long id, @RequestBody TemplateSaveBody body) {
        templateService.saveTemplate(id, body.getTemplateCode(), body.getTemplateName());
        return Result.ok(null);
    }

    @PostMapping("/template/apply")
    public Result<Void> applyTemplate(@RequestBody TemplateApplyBody body) {
        templateService.applyTemplate(body.getTargetModuleId(), body.getTemplateId());
        return Result.ok(null);
    }

    // ----- DTO -----
    @Data
    public static class BizModuleCreateRequest {
        private String moduleCode;
        private String moduleName;
        private String category;
        private String tableName;
        private String bindType;
        private Integer status;
        private String remark;
    }

    @Data
    public static class StatusBody {
        private Integer status;
    }

    @Data
    public static class TemplateSaveBody {
        private String templateCode;
        private String templateName;
    }

    @Data
    public static class TemplateApplyBody {
        private Long targetModuleId;
        private Long templateId;
    }

    @Data
    public static class ModuleConfigVO {
        private String moduleCode;
        private String moduleName;
        private List<BizField> fields;
    }
}

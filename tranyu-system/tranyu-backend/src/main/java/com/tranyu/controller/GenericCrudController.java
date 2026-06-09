package com.tranyu.controller;

import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.service.GenericCrudService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/crud")
public class GenericCrudController {

    private final GenericCrudService service;

    public GenericCrudController(GenericCrudService service) {
        this.service = service;
    }

    @GetMapping("/{group}/{resource}/page")
    public Result<GenericCrudService.PageData> page(
            @PathVariable String group,
            @PathVariable String resource,
            @RequestParam Map<String, String> params
    ) {
        return Result.ok(service.page(group + "/" + resource, params));
    }

    @GetMapping("/{group}/{resource}/{id}")
    public Result<Map<String, Object>> get(@PathVariable String group, @PathVariable String resource, @PathVariable long id) {
        return Result.ok(service.getById(group + "/" + resource, id));
    }

    @PostMapping("/{group}/{resource}")
    public Result<Long> create(
            @PathVariable String group,
            @PathVariable String resource,
            @RequestBody Map<String, Object> body
    ) {
        return Result.ok(service.create(group + "/" + resource, body));
    }

    @PutMapping("/{group}/{resource}/{id}")
    public Result<Boolean> update(
            @PathVariable String group,
            @PathVariable String resource,
            @PathVariable long id,
            @RequestBody Map<String, Object> body
    ) {
        return Result.ok(service.update(group + "/" + resource, id, body));
    }

    @DeleteMapping("/{group}/{resource}/{id}")
    public Result<Boolean> delete(@PathVariable String group, @PathVariable String resource, @PathVariable long id) {
        return Result.ok(service.delete(group + "/" + resource, id));
    }

    @PostMapping(path = "/{group}/{resource}/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<Integer> importCsv(
            @PathVariable String group,
            @PathVariable String resource,
            @RequestPart("file") MultipartFile file
    ) throws Exception {
        return Result.ok(service.importCsv(group + "/" + resource, file.getInputStream()));
    }

    @GetMapping("/{group}/{resource}/export")
    public void exportCsv(
            @PathVariable String group,
            @PathVariable String resource,
            @RequestParam Map<String, String> params,
            HttpServletResponse response
    ) throws Exception {
        String csv = service.exportCsv(group + "/" + resource, params);
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        response.setContentType("text/csv; charset=utf-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"export.csv\"");
        response.getOutputStream().write(bytes);
        response.flushBuffer();
    }
}

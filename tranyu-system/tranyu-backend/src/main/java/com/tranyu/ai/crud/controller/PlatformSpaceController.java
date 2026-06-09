package com.tranyu.ai.crud.controller;

import com.tranyu.ai.crud.common.page.PageQuery;
import com.tranyu.ai.crud.common.page.PageResult;
import com.tranyu.ai.crud.common.result.Result;
import com.tranyu.ai.crud.model.request.SpaceCreateRequest;
import com.tranyu.ai.crud.model.request.SpaceUpdateRequest;
import com.tranyu.ai.crud.model.vo.SpaceVO;
import com.tranyu.ai.crud.service.PlatformSpaceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 平台空间管理接口。
 */
@RestController
@RequestMapping("/api/platform/spaces")
public class PlatformSpaceController {

    private final PlatformSpaceService platformSpaceService;

    public PlatformSpaceController(PlatformSpaceService platformSpaceService) {
        this.platformSpaceService = platformSpaceService;
    }

    @GetMapping
    public Result<PageResult<SpaceVO>> pageSpaces(@ModelAttribute PageQuery query,
                                                  @RequestParam(required = false) String keyword) {
        return Result.success(platformSpaceService.pageSpaces(query, keyword));
    }

    @GetMapping("/all")
    public Result<List<SpaceVO>> listCurrentTenantSpaces() {
        return Result.success(platformSpaceService.listCurrentTenantSpaces());
    }

    @GetMapping("/current")
    public Result<SpaceVO> getCurrentSpace() {
        return Result.success(platformSpaceService.getCurrentSpace());
    }

    @GetMapping("/{id}")
    public Result<SpaceVO> getSpace(@PathVariable Long id) {
        return Result.success(platformSpaceService.getSpaceById(id));
    }

    @PostMapping
    public Result<SpaceVO> createSpace(@RequestBody SpaceCreateRequest request) {
        return Result.success(platformSpaceService.createSpace(request));
    }

    @PutMapping("/{id}")
    public Result<SpaceVO> updateSpace(@PathVariable Long id, @RequestBody SpaceUpdateRequest request) {
        return Result.success(platformSpaceService.updateSpace(id, request));
    }

    @PutMapping("/{id}/enable")
    public Result<Boolean> enableSpace(@PathVariable Long id) {
        return Result.success(platformSpaceService.enableSpace(id));
    }

    @PutMapping("/{id}/disable")
    public Result<Boolean> disableSpace(@PathVariable Long id) {
        return Result.success(platformSpaceService.disableSpace(id));
    }
}

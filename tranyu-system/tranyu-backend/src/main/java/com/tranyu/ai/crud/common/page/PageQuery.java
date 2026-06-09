package com.tranyu.ai.crud.common.page;

import lombok.Data;

/**
 * 平台统一分页入参。
 */
@Data
public class PageQuery {
    private long pageNo = 1L;
    private long pageSize = 20L;
}

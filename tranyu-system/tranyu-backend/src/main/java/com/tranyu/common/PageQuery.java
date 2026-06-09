package com.tranyu.common;

import lombok.Data;

@Data
public class PageQuery {
    private long pageNo = 1L;
    private long pageSize = 20L;
}

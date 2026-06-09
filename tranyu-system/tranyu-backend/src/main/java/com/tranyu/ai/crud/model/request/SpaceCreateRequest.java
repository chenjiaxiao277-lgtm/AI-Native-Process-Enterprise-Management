package com.tranyu.ai.crud.model.request;

import lombok.Data;

/**
 * 平台空间创建入参。
 */
@Data
public class SpaceCreateRequest {
    private String spaceCode;
    private String spaceName;
    private String spaceType;
    private String status;
    private String remark;
}

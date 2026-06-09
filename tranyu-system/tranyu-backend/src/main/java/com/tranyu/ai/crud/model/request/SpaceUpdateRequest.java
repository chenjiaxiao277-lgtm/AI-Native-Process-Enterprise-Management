package com.tranyu.ai.crud.model.request;

import lombok.Data;

/**
 * 平台空间更新入参。
 */
@Data
public class SpaceUpdateRequest {
    private String spaceCode;
    private String spaceName;
    private String spaceType;
    private String status;
    private String remark;
}

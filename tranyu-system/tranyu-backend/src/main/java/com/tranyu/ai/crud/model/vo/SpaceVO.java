package com.tranyu.ai.crud.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 平台空间返回对象。
 */
@Data
public class SpaceVO {
    private Long id;
    private Long tenantId;
    private String spaceCode;
    private String spaceName;
    private String spaceType;
    private String status;
    private String remark;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}

package com.tranyu.ai.crud.model.entity;

import com.tranyu.ai.crud.common.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 平台空间实体。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class PlatformSpaceEntity extends BaseEntity {
    private String spaceCode;
    private String spaceName;
    private String spaceType;
    private String status;
    private Integer sortNo;
    private String remark;
}

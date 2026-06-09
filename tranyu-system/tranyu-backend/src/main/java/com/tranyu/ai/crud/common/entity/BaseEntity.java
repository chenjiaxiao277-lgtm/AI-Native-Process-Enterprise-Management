package com.tranyu.ai.crud.common.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 平台通用实体基类。
 */
@Data
public class BaseEntity implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private Long tenantId;

    @TableField("space_id")
    private Long spaceId;

    @TableField("created_by")
    private Long createdBy;

    @TableField(value = "created_time", fill = FieldFill.INSERT)
    private LocalDateTime createdTime;

    @TableField("updated_by")
    private Long updatedBy;

    @TableField(value = "updated_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedTime;

    @TableField("deleted_flag")
    private Integer deletedFlag;

    @Version
    private Integer version;
}

package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ltc_space_relation_auth")
public class SpaceRelationAuth {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("source_space_id")
    private String sourceSpaceId;

    @TableField("target_space_id")
    private String targetSpaceId;

    @TableField("resource_type")
    private String resourceType;

    @TableField("resource_key")
    private String resourceKey;

    private Integer status;

    @TableField("expire_time")
    private LocalDateTime expireTime;

    @TableField("granted_by")
    private String grantedBy;

    private String remark;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

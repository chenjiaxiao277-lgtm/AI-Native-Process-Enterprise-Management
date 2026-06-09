package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ltc_work_item_record")
public class WorkItemRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("work_item_type_id")
    private Long workItemTypeId;

    /**
     * 租户ID（企业级数据隔离）
     */
    @TableField("tenant_id")
    private String tenantId;

    /**
     * 空间ID（用于空间级数据隔离）
     */
    @TableField("space_id")
    private String spaceId;

    private String title;

    /**
     * 状态：0关闭，1打开
     */
    private Integer status;

    @TableField("data_json")
    private String dataJson;

    @TableLogic
    private Integer deleted;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

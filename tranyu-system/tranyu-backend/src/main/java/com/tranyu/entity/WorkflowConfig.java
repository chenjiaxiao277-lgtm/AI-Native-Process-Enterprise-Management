package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 工作流配置（模板）实体
 * 关联业务模块：销售项目/交付项目
 */
@Data
@TableName("ltc_workflow_config")
public class WorkflowConfig {

    @TableId(type = IdType.AUTO)
    private Long id;
    /** 工作流名称 */
    private String name;
    /** 关联业务模块：sales_project / delivery_project */
    @TableField("biz_module")
    private String bizModule;
    /** 是否启用：0否 1是 */
    private Integer enabled;
    private String remark;
    @TableField("create_time")
    private LocalDateTime createTime;
    @TableField("update_time")
    private LocalDateTime updateTime;

    /** 节点列表（非表字段，查询时填充） */
    @TableField(exist = false)
    private List<WorkflowNode> nodes;
}

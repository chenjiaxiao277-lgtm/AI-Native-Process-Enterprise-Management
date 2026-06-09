package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 流程实例实体
 * 一次发起的审批流程
 */
@Data
@TableName("ltc_workflow_instance")
public class WorkflowInstance {

    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("workflow_id")
    private Long workflowId;
    @TableField("biz_type")
    private String bizType;
    @TableField("biz_id")
    private Long bizId;
    @TableField("biz_title")
    private String bizTitle;
    /** 状态：running / completed / rejected */
    private String status;
    @TableField("current_node_id")
    private Long currentNodeId;
    @TableField("initiator_id")
    private String initiatorId;
    @TableField("initiator_name")
    private String initiatorName;
    @TableField("created_at")
    private LocalDateTime createdAt;
    @TableField("updated_at")
    private LocalDateTime updatedAt;

    /** 审批记录轨迹（非表字段） */
    @TableField(exist = false)
    private List<WorkflowRecord> records;
}

package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 审批记录实体
 * 每个节点每条审批操作一条记录
 */
@Data
@TableName("ltc_workflow_record")
public class WorkflowRecord {

    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("instance_id")
    private Long instanceId;
    @TableField("node_id")
    private Long nodeId;
    @TableField("node_name")
    private String nodeName;
    @TableField("approver_id")
    private String approverId;
    @TableField("approver_name")
    private String approverName;
    /** 操作：approve / reject */
    private String action;
    private String comment;
    @TableField("created_at")
    private LocalDateTime createdAt;
}

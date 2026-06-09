package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 工作流节点配置实体
 * 节点审批人类型 / 审批规则 / 驳回策略等
 */
@Data
@TableName("ltc_workflow_node")
public class WorkflowNode {

    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("workflow_id")
    private Long workflowId;
    @TableField("node_name")
    private String nodeName;
    @TableField("node_order")
    private Integer nodeOrder;

    /**
     * 审批人类型：PERSON / ROLE / CUSTOM
     */
    @TableField("approver_type")
    private String approverType;

    /**
     * 审批人ID列表（人员ID或角色ID，逗号分隔）
     */
    @TableField("approver_ids")
    private String approverIds;

    /**
     * 审批方式：OR（或签）/ SIGN_ALL（会签）
     */
    @TableField("approval_mode")
    private String approvalMode;

    /**
     * 是否允许加签：0 否，1 是
     */
    @TableField("allow_add_sign")
    private Integer allowAddSign;

    /**
     * 是否允许减签：0 否，1 是
     */
    @TableField("allow_remove_sign")
    private Integer allowRemoveSign;

    /**
     * 驳回策略：END / BACK_TO_SUBMITTER / BACK_TO_NODE
     */
    @TableField("reject_strategy")
    private String rejectStrategy;

    /**
     * 驳回目标节点ID，仅 BACK_TO_NODE 时生效
     */
    @TableField("reject_node_id")
    private Long rejectNodeId;

    /**
     * 自定义节点表单 schema JSON
     */
    @TableField("form_schema")
    private String formSchema;

    @TableField("create_time")
    private LocalDateTime createTime;

    @TableField("update_time")
    private LocalDateTime updateTime;
}

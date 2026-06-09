package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 工作项类型配置（参考飞书项目工作项管理）
 */
@Data
@TableName("ltc_work_item_type")
public class WorkItemType {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("type_name")
    private String typeName;

    @TableField("type_code")
    private String typeCode;

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

    /**
     * 类型分类：requirement / bug / task / custom
     */
    @TableField("item_category")
    private String itemCategory;

    /**
     * 创建方式：custom(新建) / reuse(复用)
     */
    @TableField("source_type")
    private String sourceType;

    @TableField("source_space")
    private String sourceSpace;

    @TableField("source_work_item")
    private String sourceWorkItem;

    @TableField("reuse_source_id")
    private Long reuseSourceId;

    /**
     * 复用同步状态：0 未同步/已解绑，1 同步中
     */
    @TableField("reuse_bound")
    private Integer reuseBound;

    /**
     * 流程模式：state(状态模式) / node(节点模式-流程图)
     */
    @TableField("flow_mode")
    private String flowMode;

    /**
     * 系统标识（用于外部系统映射）
     */
    @TableField("system_identifier")
    private String systemIdentifier;

    @TableField("icon_color")
    private String iconColor;

    @TableField("icon_key")
    private String iconKey;

    @TableField("copy_fields_json")
    private String copyFieldsJson;

    @TableField("copy_roles_json")
    private String copyRolesJson;

    @TableField("baseline_enabled")
    private Integer baselineEnabled;

    @TableField("nav_entry_enabled")
    private Integer navEntryEnabled;

    @TableField("detail_layout_json")
    private String detailLayoutJson;

    @TableField("flow_rule_json")
    private String flowRuleJson;

    @TableField("flow_role_json")
    private String flowRoleJson;

    @TableField("view_layout_json")
    private String viewLayoutJson;

    @TableField("owner_role")
    private String ownerRole;

    @TableField("workflow_name")
    private String workflowName;

    @TableField("required_policy")
    private String requiredPolicy;

    @TableField("sla_hours")
    private Integer slaHours;

    private Integer sort;

    /**
     * 状态：0禁用，1启用
     */
    private Integer status;

    private String description;

    @TableLogic
    private Integer deleted;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

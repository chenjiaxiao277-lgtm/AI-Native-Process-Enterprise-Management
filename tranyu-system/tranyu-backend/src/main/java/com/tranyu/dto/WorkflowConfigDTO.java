package com.tranyu.dto;

import com.tranyu.entity.WorkflowNode;
import lombok.Data;

import java.util.List;

/** 工作流配置保存 DTO：配置 + 节点列表 */
@Data
public class WorkflowConfigDTO {
    private Long id;
    private String name;
    private String bizModule;
    private Integer enabled;
    private String remark;
    private List<WorkflowNode> nodes;
}

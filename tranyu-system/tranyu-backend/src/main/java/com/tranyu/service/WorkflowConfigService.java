package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.WorkflowConfig;
import com.tranyu.entity.WorkflowNode;
import com.tranyu.mapper.WorkflowConfigMapper;
import com.tranyu.mapper.WorkflowNodeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 工作流配置服务：模板与节点的增删改查、启用/禁用
 */
@Service
@RequiredArgsConstructor
public class WorkflowConfigService {

    private final WorkflowConfigMapper configMapper;
    private final WorkflowNodeMapper nodeMapper;

    public List<WorkflowConfig> list(String bizModule) {
        LambdaQueryWrapper<WorkflowConfig> q = new LambdaQueryWrapper<>();
        if (bizModule != null && !bizModule.isBlank()) {
            q.eq(WorkflowConfig::getBizModule, bizModule);
        }
        q.orderByDesc(WorkflowConfig::getUpdateTime);
        return configMapper.selectList(q);
    }

    public WorkflowConfig getById(Long id) {
        return configMapper.selectById(id);
    }

    /** 获取工作流及其节点（按 node_order 排序） */
    public WorkflowConfig getWithNodes(Long id) {
        WorkflowConfig config = configMapper.selectById(id);
        if (config == null) return null;
        List<WorkflowNode> nodes = nodeMapper.selectList(
            new LambdaQueryWrapper<WorkflowNode>()
                .eq(WorkflowNode::getWorkflowId, id)
                .orderByAsc(WorkflowNode::getNodeOrder)
        );
        config.setNodes(nodes);
        return config;
    }

    @Transactional(rollbackFor = Exception.class)
    public WorkflowConfig save(WorkflowConfig config, List<WorkflowNode> nodes) {
        if (config.getId() == null) {
            config.setEnabled(config.getEnabled() != null ? config.getEnabled() : 1);
            configMapper.insert(config);
        } else {
            configMapper.updateById(config);
            nodeMapper.delete(new LambdaQueryWrapper<WorkflowNode>().eq(WorkflowNode::getWorkflowId, config.getId()));
        }
        if (nodes != null) {
            for (int i = 0; i < nodes.size(); i++) {
                WorkflowNode n = nodes.get(i);
                n.setWorkflowId(config.getId());
                n.setNodeOrder(n.getNodeOrder() != null ? n.getNodeOrder() : i + 1);
                // 默认审批人类型：PERSON
                n.setApproverType(n.getApproverType() != null ? n.getApproverType() : "PERSON");
                // 默认审批方式：OR（或签）
                String mode = n.getApprovalMode();
                n.setApprovalMode((mode != null && !mode.isBlank()) ? mode : "OR");
                // 默认加签/减签：不允许
                if (n.getAllowAddSign() == null) {
                    n.setAllowAddSign(0);
                }
                if (n.getAllowRemoveSign() == null) {
                    n.setAllowRemoveSign(0);
                }
                // 默认驳回策略：END
                String strategy = n.getRejectStrategy();
                n.setRejectStrategy((strategy != null && !strategy.isBlank()) ? strategy : "END");

                nodeMapper.insert(n);
            }
        }
        return getWithNodes(config.getId());
    }

    /** 启用/禁用 */
    public void setEnabled(Long id, int enabled) {
        WorkflowConfig c = new WorkflowConfig();
        c.setId(id);
        c.setEnabled(enabled);
        configMapper.updateById(c);
    }

    public void deleteById(Long id) {
        nodeMapper.delete(new LambdaQueryWrapper<WorkflowNode>().eq(WorkflowNode::getWorkflowId, id));
        configMapper.deleteById(id);
    }
}

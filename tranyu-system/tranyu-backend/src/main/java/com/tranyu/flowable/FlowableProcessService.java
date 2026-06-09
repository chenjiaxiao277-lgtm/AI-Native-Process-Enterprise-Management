package com.tranyu.flowable;

import org.flowable.engine.RepositoryService;
import org.flowable.engine.repository.Deployment;
import org.flowable.engine.repository.ProcessDefinition;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.zip.ZipInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Flowable 流程管理：部署、列表、删除
 */
@Service
public class FlowableProcessService {

    private final RepositoryService repositoryService;

    public FlowableProcessService(RepositoryService repositoryService) {
        this.repositoryService = repositoryService;
    }

    /**
     * 部署 BPMN 文件（或 ZIP 包含多个）
     */
    public Deployment deploy(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename();
        if (name == null) name = "process";
        if (name.endsWith(".zip") || name.endsWith(".bar")) {
            ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(file.getBytes()));
            return repositoryService.createDeployment()
                    .name(name)
                    .addZipInputStream(zis)
                    .deploy();
        }
        return repositoryService.createDeployment()
                .name(name)
                .addBytes(name, file.getBytes())
                .deploy();
    }

    /**
     * 查询已部署的流程定义列表（按部署时间倒序）
     */
    public List<Map<String, Object>> listProcessDefinitions() {
        List<ProcessDefinition> list = repositoryService.createProcessDefinitionQuery()
                .latestVersion()
                .orderByProcessDefinitionKey()
                .asc()
                .list();
        List<Map<String, Object>> result = new ArrayList<>();
        for (ProcessDefinition pd : list) {
            Map<String, Object> m = new HashMap<>();
            m.put("id", pd.getId());
            m.put("name", pd.getName());
            m.put("key", pd.getKey());
            m.put("version", pd.getVersion());
            m.put("deploymentId", pd.getDeploymentId());
            m.put("suspended", pd.isSuspended());
            result.add(m);
        }
        return result;
    }

    /**
     * 删除部署（级联删除流程定义与实例）
     */
    public void deleteDeployment(String deploymentId) {
        repositoryService.deleteDeployment(deploymentId, true);
    }

    /**
     * 挂起/激活流程定义
     */
    public void setSuspended(String processDefinitionId, boolean suspended) {
        if (suspended) {
            repositoryService.suspendProcessDefinitionById(processDefinitionId);
        } else {
            repositoryService.activateProcessDefinitionById(processDefinitionId);
        }
    }
}

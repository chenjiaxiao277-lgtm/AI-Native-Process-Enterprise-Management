package com.tranyu.config;

import org.flowable.spring.SpringProcessEngineConfiguration;
import org.flowable.spring.boot.EngineConfigurationConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Flowable 流程引擎配置：历史级别等
 * 自定义 Identity（TranyuIdmIdentityService）对接 sys_user/sys_role 需在 Idm 引擎配置中注入；
 * Flowable 7.0.1 的 Idm 由 flowable-spring-boot-starter-process 内嵌，若需替换为 TranyuIdmIdentityService，
 * 可依赖 flowable-idm-engine 并注册 EngineConfigurationConfigurer&lt;SpringIdmEngineConfiguration&gt; 设置 setIdmIdentityService。
 * 当前 BPMN 中 candidateUsers/candidateGroups 使用与 sys_user.id、sys_role.id 一致的字符串即可。
 */
@Configuration
public class FlowableConfig {

    @Bean
    public EngineConfigurationConfigurer<SpringProcessEngineConfiguration> processEngineConfigurer() {
        return configuration -> {
            // 历史级别已在 application.yml flowable.history-level 配置
        };
    }
}

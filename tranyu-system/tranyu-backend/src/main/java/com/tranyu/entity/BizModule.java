package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 业务模块配置实体，对应表：ltc_biz_module
 */
@Data
@TableName("ltc_biz_module")
public class BizModule {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("module_code")
    private String moduleCode;

    @TableField("module_name")
    private String moduleName;

    private String category;

    @TableField("table_name")
    private String tableName;

    /**
     * 绑定类型：BIND_EXIST=绑定已有表, CREATE_NEW=新建表
     */
    @TableField("bind_type")
    private String bindType;

    /**
     * 状态：1 启用，0 禁用
     */
    private Integer status;

    private String remark;

    @TableField("create_time")
    private LocalDateTime createTime;

    @TableField("update_time")
    private LocalDateTime updateTime;
}


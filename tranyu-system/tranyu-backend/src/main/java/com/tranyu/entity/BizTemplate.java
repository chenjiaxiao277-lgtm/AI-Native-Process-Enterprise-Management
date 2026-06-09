package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 业务字段模板，对应表：ltc_biz_template
 */
@Data
@TableName("ltc_biz_template")
public class BizTemplate {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("template_code")
    private String templateCode;

    @TableField("template_name")
    private String templateName;

    private String category;

    @TableField("config_json")
    private String configJson;

    @TableField("create_time")
    private LocalDateTime createTime;
}


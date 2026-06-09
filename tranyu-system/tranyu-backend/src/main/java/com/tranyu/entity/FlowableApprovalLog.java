package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Flowable 业务审批日志。
 */
@Data
@TableName("ltc_flowable_approval_log")
public class FlowableApprovalLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("process_instance_id")
    private String processInstanceId;

    @TableField("task_id")
    private String taskId;

    @TableField("user_id")
    private Long userId;

    private String action;

    private String comment;

    private String creator;

    private String updater;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(value = "update_time", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
}

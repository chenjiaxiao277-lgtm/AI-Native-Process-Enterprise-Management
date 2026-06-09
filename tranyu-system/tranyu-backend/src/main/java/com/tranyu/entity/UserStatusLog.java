package com.tranyu.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ltc_user_status_log")
public class UserStatusLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("tenant_id")
    private String tenantId;

    @TableField("user_id")
    private Long userId;

    @TableField("from_status")
    private Integer fromStatus;

    @TableField("to_status")
    private Integer toStatus;

    private String reason;

    @TableField("operator_id")
    private Long operatorId;

    @TableField(value = "create_time", fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}

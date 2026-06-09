package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.UserStatusLog;
import com.tranyu.mapper.UserStatusLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserStatusLogService {

    private final UserStatusLogMapper userStatusLogMapper;

    public List<UserStatusLog> listByUser(String tenantId, Long userId) {
        return userStatusLogMapper.selectList(new LambdaQueryWrapper<UserStatusLog>()
                .eq(UserStatusLog::getTenantId, tenantId)
                .eq(UserStatusLog::getUserId, userId));
    }

    public void save(UserStatusLog log) {
        if (log.getId() == null) {
            userStatusLogMapper.insert(log);
        } else {
            userStatusLogMapper.updateById(log);
        }
    }
}

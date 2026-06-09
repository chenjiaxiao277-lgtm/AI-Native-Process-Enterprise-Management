package com.tranyu.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.tranyu.entity.UserAuthAccount;
import com.tranyu.mapper.UserAuthAccountMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAuthAccountService {

    private final UserAuthAccountMapper userAuthAccountMapper;

    public List<UserAuthAccount> listByUser(String tenantId, Long userId) {
        return userAuthAccountMapper.selectList(new LambdaQueryWrapper<UserAuthAccount>()
                .eq(UserAuthAccount::getTenantId, tenantId)
                .eq(UserAuthAccount::getUserId, userId));
    }

    public void save(UserAuthAccount account) {
        if (account.getId() == null) {
            userAuthAccountMapper.insert(account);
        } else {
            userAuthAccountMapper.updateById(account);
        }
    }
}

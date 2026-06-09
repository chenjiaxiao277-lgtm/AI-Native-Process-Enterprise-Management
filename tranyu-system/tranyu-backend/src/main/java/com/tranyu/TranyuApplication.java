package com.tranyu;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.tranyu.mapper")
public class TranyuApplication {

    public static void main(String[] args) {
        SpringApplication.run(TranyuApplication.class, args);
    }
}


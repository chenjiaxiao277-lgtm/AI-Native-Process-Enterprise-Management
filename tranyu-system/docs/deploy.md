# 部署/本地启动（基础版）

## 前端

```bash
cd tranyu-system/tranyu-frontend
npm install
npm start
```

- 登录页：`http://localhost:8000/login`（端口以终端输出为准）

## 后端

### 1) 安装 JDK 17

确保 `java -version` 是 17（Spring Boot 3 需要 Java 17+）。

### 2) 配置数据库

后端会自动加载 `tranyu-system/tranyu-backend/.env`（作为 properties 文件导入），例如：

```properties
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/ltc_db?useSSL=false&serverTimezone=UTC&characterEncoding=utf8
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=change-me
```

### 3) 启动

```bash
cd tranyu-system/tranyu-backend
./gradlew bootRun
```

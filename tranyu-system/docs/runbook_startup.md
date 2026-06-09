# 本地启动命令清单（前端 / 后端 / MySQL）

本文件仅整理启动命令，不涉及业务逻辑变更。

## 1. MySQL（本地）

如果使用系统服务启动：

```bash
mysql.server start
```

如果使用 Homebrew 启动：

```bash
brew services start mysql
```

如果使用 Docker（示例）：

```bash
docker start <your-mysql-container>
```

连接测试：

```bash
MYSQL_PWD='change-me' mysql -h127.0.0.1 -P3306 -uroot -D ltc_db -e "SELECT 1;"
```

---

## 2. 后端（Spring Boot）

进入后端目录并启动：

```bash
cd /Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-backend
./gradlew bootRun
```

启动后接口测试：

```bash
curl -sS http://localhost:8080/api/current-user
```

---

## 3. 前端（Umi / React）

进入前端目录并启动：

```bash
cd /Users/jocelyn/Documents/LTCplatform/tranyu-system/tranyu-frontend
npm start
```

启动后页面测试：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8002/login
```

---

## 4. 入口链接与测试账号

入口链接（本地）：

- 平台入口：`http://localhost:8002/platform/tenants`
- 企业入口：`http://localhost:8002/enterprise/spaces`
- 空间入口：`http://localhost:8002/workspace/home`

登录页：

- `http://localhost:8002/login`
- 平台登录：`http://localhost:8002/platform/login?entry=platform`
- 企业登录：`http://localhost:8002/enterprise/login?entry=enterprise`
- 空间登录：`http://localhost:8002/workspace/login?entry=workspace`

测试账号（默认密码：`123456`）：

- 平台管理员：``platform_admin
- 租户管理员：`tenant_admin`
- 字段联调高权限账号：`field_test_admin`（覆盖平台/租户/空间入口与字段联调路径）

租户创建后的默认超级空间管理员：

- 账号格式：`{tenantId}_space_admin`
- 初始密码：与租户管理员密码一致（或默认 `123456`）

创建租户时 `adminUserId`：

- 可用 `tenant_admin` 的 id（示例：`4`）

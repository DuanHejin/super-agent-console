# MySQL 开发与 K3S 部署说明

本文档记录当前项目的 MySQL 使用策略。

当前推荐：

```txt
本地开发：本机 MySQL 8.0
线上运行：K3S 自建 MySQL 8.0
临时排查：必要时再通过双层转发连接 K3S MySQL
```

这样可以避免本地开发长期依赖香港服务器、VPN、SSH 隧道和 `kubectl port-forward`。表结构变更通过 Prisma migration 文件同步，不直接同步本地数据库数据。

## 目标结构

```txt
Local Mac
├── MySQL 8.0
│   └── super_agent_console_dev
└── Nuxt dev server
    └── DATABASE_URL=mysql://sac_app:***@127.0.0.1:3306/super_agent_console_dev

K3S
├── my-web-app
│   └── DATABASE_URL=mysql://sac_app:***@mysql:3306/super_agent_console_prod
├── mysql Service
├── mysql Deployment
└── mysql-data PVC
```

K3S MySQL 不配置 Ingress。MySQL 是数据库 TCP 服务，不对公网暴露；线上应用通过 `ClusterIP Service` 访问。双层转发只用于临时排查线上库，不作为日常本地开发链路。

## 本地开发 MySQL

本地开发建议使用 Docker 运行 MySQL 8.0：

```bash
docker run --name super-agent-console-mysql \
  -e MYSQL_ROOT_PASSWORD=<MYSQL_ROOT_PASSWORD> \
  -e MYSQL_DATABASE=super_agent_console_dev \
  -e MYSQL_USER=sac_app \
  -e MYSQL_PASSWORD=<MYSQL_APP_PASSWORD> \
  -p 3306:3306 \
  -v super-agent-console-mysql-data:/var/lib/mysql \
  -d mysql:8.0
```

查看容器状态：

```bash
docker ps --filter name=super-agent-console-mysql
docker logs super-agent-console-mysql
```

停止 / 启动：

```bash
docker stop super-agent-console-mysql
docker start super-agent-console-mysql
```

本地 `.env.local`：

```env
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_dev
```

本地可视化客户端连接参数：

```txt
Host: 127.0.0.1
Port: 3306
User: sac_app
Password: <MYSQL_APP_PASSWORD>
Database: super_agent_console_dev
```

本地检查：

```bash
nc -vz 127.0.0.1 3306
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_dev npx prisma migrate status
```

## Prisma Migration 策略

本地开发时修改 `prisma/schema.prisma` 后，执行：

```bash
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_dev npx prisma migrate dev --name <migration_name>
```

这一步会更新本机 MySQL 表结构，并生成 `prisma/migrations/` 文件。需要提交的是：

```txt
prisma/schema.prisma
prisma/migrations/*
```

不要把本地数据库数据同步到线上。线上只应用 migration：

```bash
npx prisma migrate deploy
```

线上执行方式后续可以接入 GitHub Actions 或在 K3S 内部执行，避免本地长期连接线上数据库。

## K3S MySQL 部署

## 文件 1：mysql-secret.yaml

这三个值需要在创建 MySQL 前提前想好：

- `MYSQL_ROOT_PASSWORD`：root 管理员密码，只用于初始化和管理数据库。
- `MYSQL_USER`：应用账号，项目平时连接数据库使用。
- `MYSQL_PASSWORD`：应用账号密码。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
  namespace: default
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: "<MYSQL_ROOT_PASSWORD>"
  MYSQL_DATABASE: "super_agent_console_dev"
  MYSQL_USER: "sac_app"
  MYSQL_PASSWORD: "<MYSQL_APP_PASSWORD>"
```

说明：MySQL 官方镜像第一次启动时，会自动创建 `MYSQL_DATABASE`、`MYSQL_USER`，并给该用户授权访问这个数据库。

## 文件 2：mysql-pvc.yaml

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

如果 K3S 使用默认 `local-path` 存储类，这个 PVC 会落到当前节点本地磁盘。可以先执行：

```bash
kubectl get storageclass
```

## 文件 3：mysql-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
          env:
            - name: MYSQL_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_ROOT_PASSWORD
            - name: MYSQL_DATABASE
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_DATABASE
            - name: MYSQL_USER
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_USER
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_PASSWORD
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          readinessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - 127.0.0.1
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 5
          livenessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - 127.0.0.1
            initialDelaySeconds: 60
            periodSeconds: 20
            timeoutSeconds: 5
      volumes:
        - name: mysql-data
          persistentVolumeClaim:
            claimName: mysql-data
```

## 文件 4：mysql-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: default
spec:
  selector:
    app: mysql
  ports:
    - name: mysql
      port: 3306
      targetPort: 3306
  type: ClusterIP
```

创建后，集群内访问地址为：

```txt
mysql:3306
mysql.default.svc.cluster.local:3306
```

## 可选文件 5：mysql-prod-init-job.yaml

官方 MySQL 镜像只会自动创建一个 `MYSQL_DATABASE`。如果本项目要同时准备 `dev` 和 `prod` 两个库，可以在 MySQL Pod 启动后执行这个一次性 Job 创建生产库。

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mysql-prod-init
  namespace: default
spec:
  backoffLimit: 3
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: mysql-prod-init
          image: mysql:8.0
          env:
            - name: MYSQL_PWD
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_ROOT_PASSWORD
            - name: MYSQL_APP_USER
              valueFrom:
                secretKeyRef:
                  name: mysql-secret
                  key: MYSQL_USER
          command:
            - /bin/sh
            - -c
          args:
            - |
              until mysqladmin ping -h mysql -uroot --silent; do
                echo "waiting for mysql"
                sleep 2
              done

              mysql -h mysql -uroot <<SQL
              CREATE DATABASE IF NOT EXISTS super_agent_console_prod
                DEFAULT CHARACTER SET utf8mb4
                DEFAULT COLLATE utf8mb4_unicode_ci;

              GRANT ALL PRIVILEGES ON super_agent_console_prod.* TO '${MYSQL_APP_USER}'@'%';
              FLUSH PRIVILEGES;
              SQL
```

## 部署顺序

在服务器上可以用 `nano` 分别创建这些 YAML 文件，然后按顺序执行：

```bash
kubectl apply -f mysql-secret.yaml
kubectl apply -f mysql-pvc.yaml
kubectl apply -f mysql-deployment.yaml
kubectl apply -f mysql-service.yaml
```

如果需要创建生产库：

```bash
kubectl apply -f mysql-prod-init-job.yaml
```

检查资源：

```bash
kubectl get secret mysql-secret -n default
kubectl get pvc mysql-data -n default
kubectl get deploy mysql -n default
kubectl get pod -l app=mysql -n default
kubectl get svc mysql -n default
kubectl logs deploy/mysql -n default
```

注意：Deployment 名称是 `mysql`，Service 名称也是 `mysql`。Pod 名称通常不是固定的 `mysql`，而是类似：

```txt
mysql-6f8b7c9d8d-xxxxx
```

## 应用连接配置

线上 K3S 应用使用生产库：

```env
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@mysql:3306/super_agent_console_prod
```

可以通过现有项目 Secret 注入：

```bash
kubectl create secret generic super-agent-console-secret \
  -n default \
  --from-literal=DATABASE_URL='mysql://sac_app:<MYSQL_APP_PASSWORD>@mysql:3306/super_agent_console_prod' \
  --from-literal=ARK_API_KEY='<ARK_API_KEY>' \
  --from-literal=DEMO_SERVER_TOKEN='<DEMO_SERVER_TOKEN>' \
  --dry-run=client -o yaml | kubectl apply -f -
```

注意：文档中只保留占位符，不记录真实密码、API key 或 token。真实值只放在 K3S Secret、本地 `.env.local` 或个人密码管理工具中。

更新 Secret 后重启应用：

```bash
kubectl rollout restart deployment/my-web-app -n default
kubectl rollout status deployment/my-web-app -n default
```

## 临时排查 K3S MySQL

日常本地开发不推荐连接 K3S MySQL。只有需要临时排查线上 / 类生产库时，再使用两段转发。注意第一段命令在服务器 OrcaTerm 执行，第二段命令在本地终端执行：

```txt
本地电脑 127.0.0.1:3306
→ SSH 隧道
→ 服务器 127.0.0.1:3306
→ kubectl port-forward
→ K3S Service mysql:3306
→ MySQL Pod
```

第一步，在服务器 OrcaTerm 窗口执行 K3S 转发，并保持窗口运行：

```bash
kubectl -n default port-forward svc/mysql 3306:3306
```

正常输出类似：

```txt
Forwarding from 127.0.0.1:3306 -> 3306
Forwarding from [::1]:3306 -> 3306
```

第二步，在本地终端执行 SSH 隧道，并保持终端运行：

```bash
ssh -i ~/.ssh/super_agent_console_k3s_ed25519 \
  -N -L 3306:127.0.0.1:3306 \
  root@<SERVER_IP>
```

这条命令正常情况下没有输出，也不会进入远程 shell。它会一直挂着，负责把本地 `127.0.0.1:3306` 转发到服务器 `127.0.0.1:3306`。

第三步，另开一个本地终端验证链路：

```bash
nc -vz 127.0.0.1 3306
```

成功输出类似：

```txt
Connection to 127.0.0.1 port 3306 [tcp/mysql] succeeded!
```

如果需要临时让本地代码连接 K3S dev 库，可以临时覆盖 `DATABASE_URL`：

```env
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_dev
```

如果需要临时对 K3S dev 库检查 migration 状态：

```bash
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_dev npx prisma migrate dev
```

如果要把同一套表结构同步到 K3S 生产库，需要同时保持服务器 OrcaTerm 的 `kubectl port-forward` 和本地 `ssh -L` 两个长连接，再执行：

```bash
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_prod npx prisma migrate deploy
```

如果本地 `3306` 已经被占用，可以把本地端口换成 `13306`：

```bash
ssh -i ~/.ssh/super_agent_console_k3s_ed25519 \
  -N -L 13306:127.0.0.1:3306 \
  root@<SERVER_IP>
```

对应本地连接地址改为：

```env
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:13306/super_agent_console_dev
```

## K3S 临时连接检查

检查服务器上的 MySQL 资源：

```bash
kubectl get pod -l app=mysql -n default
kubectl get svc mysql -n default
kubectl get pvc mysql-data -n default
```

预期结果：

- Pod 是 `Running`，并且 `READY` 为 `1/1`。
- Service 类型是 `ClusterIP`。
- PVC 状态是 `Bound`。

检查服务器 OrcaTerm 的 K3S 转发是否还在运行：

```txt
Forwarding from 127.0.0.1:3306 -> 3306
Forwarding from [::1]:3306 -> 3306
```

检查本地 SSH 隧道是否监听成功：

```bash
lsof -iTCP:3306 -sTCP:LISTEN
```

如果使用了 `13306`，则执行：

```bash
lsof -iTCP:13306 -sTCP:LISTEN
```

检查本地端口连通性：

```bash
nc -vz 127.0.0.1 3306
```

如果使用了 `13306`，则执行：

```bash
nc -vz 127.0.0.1 13306
```

检查 Prisma 是否能连到数据库：

```bash
DATABASE_URL=mysql://sac_app:<MYSQL_APP_PASSWORD>@127.0.0.1:3306/super_agent_console_dev npx prisma migrate status
```

常见问题：

- `Connection refused`：本地 `ssh -L` 没有运行，或者本地监听端口写错。
- `bind: address already in use`：本地端口已被占用，改用 `13306`。
- `Access denied for user`：应用账号或密码错误。
- `Unknown database`：目标数据库还没有创建，检查 `SHOW DATABASES;` 或执行生产库初始化 Job。
- `kubectl port-forward` 回到命令行提示符：服务器端转发已断开，需要重新执行。

## K3S 可视化临时连接

本地可视化查看 K3S 数据库时，客户端不需要知道 K3S 内部地址，只连接本地隧道即可。

推荐优先使用 Sequel Ace，轻量、免费，适合 macOS 查看 MySQL：

```bash
brew install --cask sequel-ace
```

也可以选择 DBeaver Community，功能更全但更重：

```bash
brew install --cask dbeaver-community
```

客户端连接参数：

```txt
Host: 127.0.0.1
Port: 3306
User: sac_app
Password: <MYSQL_APP_PASSWORD>
Database: super_agent_console_dev
```

如果要看生产库，把 `Database` 改成：

```txt
super_agent_console_prod
```

注意：可视化客户端能连通的前提是服务器 OrcaTerm 中的 `kubectl port-forward` 和本地 `ssh -L` 两个长连接都保持运行。日常开发优先连接本机 MySQL。

## 注意事项

- 不配置 Ingress，因为数据库不对公网暴露。
- `MYSQL_ROOT_PASSWORD` 只用于管理数据库，项目代码不要使用 root 账号。
- MySQL 初始化变量只在 `/var/lib/mysql` 第一次为空时生效；PVC 已有数据后，修改 Secret 不会自动重建用户和数据库。
- 当前是单节点 MySQL，适合 MVP 和学习练习，不适合作为长期生产高可用数据库。
- 需要定期备份 PVC 或通过 `mysqldump` 导出数据。

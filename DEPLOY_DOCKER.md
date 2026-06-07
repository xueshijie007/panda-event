# Docker Compose 一键部署说明

这个项目已经改成 Docker Compose 部署方式，包含两个容器：

- `frontend`：Nginx 运行打包后的前端页面，并把 `/api` 请求转发到后端。
- `backend`：FastAPI 后端服务。
- `backend_data`：Docker 数据卷，用来持久化 SQLite 数据库。

## 1. 服务器准备

推荐服务器系统：Ubuntu 22.04 或 Ubuntu 24.04。

安装 Docker：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker compose version
```

如果 `docker compose version` 能正常输出版本号，说明 Docker Compose 可用。

## 2. 上传项目

把整个项目目录上传到服务器，例如：

```bash
/var/www/panda-event
```

进入项目根目录：

```bash
cd /var/www/panda-event
```

根目录里应该能看到：

```text
docker-compose.yml
backend/
frontend/
```

## 3. 配置后台管理员账号

复制生产环境配置文件：

```bash
cp backend/.env.production.example backend/.env.production
```

编辑配置：

```bash
nano backend/.env.production
```

建议改成你自己的强密码：

```env
ADMIN_USERNAME=你的管理员账号
ADMIN_PASSWORD=你的管理员强密码
ADMIN_TOKEN=一串随机长密钥
CORS_ALLOW_ORIGINS=https://你的域名
MARKET_DATA_MODE=mock
MARKET_HTTP_TIMEOUT=1.0
```

生成随机密钥：

```bash
openssl rand -hex 32
```

如果你暂时没有域名，只用服务器 IP 访问，可以先写：

```env
CORS_ALLOW_ORIGINS=*
```

正式上线后建议改成你的真实域名，例如：

```env
CORS_ALLOW_ORIGINS=https://example.com
```

## 4. 一键启动

在项目根目录执行：

```bash
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

测试后端健康状态：

```bash
curl http://localhost/api/health
```

打开网站：

```text
http://你的服务器IP
```

## 5. 管理后台怎么进入

后台不直接显示在普通导航里。

操作流程：

1. 打开网站右上角的登录页面。
2. 使用 `backend/.env.production` 里面配置的管理员账号和密码登录。
3. 管理员登录成功后，右上角会出现 `管理后台`。
4. 进入后台后可以审核注册用户。

后台直达地址：

```text
http://你的服务器IP/admin
```

如果没有管理员登录，后台页面不会展示审核数据。

## 6. 绑定域名和 HTTPS

如果你有域名，建议在服务器上再装一层宿主机 Nginx，把域名转发到 Docker 前端。

先把 `docker-compose.yml` 里 frontend 的端口改成只监听本机：

```yaml
ports:
  - "127.0.0.1:8080:80"
```

安装 Nginx：

```bash
sudo apt update
sudo apt install -y nginx
```

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/panda-event
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/panda-event /etc/nginx/sites-enabled/panda-event
sudo nginx -t
sudo systemctl reload nginx
```

申请 HTTPS 证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

## 7. 更新网站

以后代码更新后，在项目根目录执行：

```bash
git pull
docker compose up -d --build
```

如果你不是用 Git 上传，而是直接覆盖文件，覆盖后执行：

```bash
docker compose up -d --build
```

## 8. 备份数据库

数据库保存在 Docker 数据卷里，不会因为容器重启丢失。

查看数据卷：

```bash
docker volume ls
```

创建备份目录：

```bash
mkdir -p backups
```

备份：

```bash
docker run --rm \
  -v crypto-event-contract-platform_backend_data:/data \
  -v "$PWD/backups:/backup" \
  alpine sh -c "cp /data/simulator.db /backup/simulator-$(date +%F-%H%M%S).db"
```

恢复：

```bash
docker compose down
docker run --rm \
  -v crypto-event-contract-platform_backend_data:/data \
  -v "$PWD/backups:/backup" \
  alpine sh -c "cp /backup/你的备份文件.db /data/simulator.db"
docker compose up -d
```

## 9. 常用命令

重启：

```bash
docker compose restart
```

停止：

```bash
docker compose down
```

重新构建前端：

```bash
docker compose up -d --build frontend
```

重新构建后端：

```bash
docker compose up -d --build backend
```

查看实时日志：

```bash
docker compose logs -f
```

## 10. 注意事项

- `backend/.env.production` 不要发给别人，里面有管理员密码和后台密钥。
- 如果服务器防火墙开启了，需要放行 `80` 和 `443` 端口。
- 如果页面能打开但接口报错，优先看 `docker compose logs -f backend`。
- 如果打开是空白页，优先看浏览器控制台和 `docker compose logs -f frontend`。


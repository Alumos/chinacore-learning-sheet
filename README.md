# 未来探索局 · 课堂学习单

一节课，一个入口：北斗拼装 → 复兴号 AI 探究 → 中国芯观点分享。面向学生的三站活动导航，北斗静态网页随镜像部署。无需账号或数据库。

- 顶部随时切换，活动 iframe 首次打开才加载，切换时只隐藏，不重建页面。
- 任务卡可收起，活动可全屏或独立打开。
- 北斗观察、复兴号探究表格、个人观点保存在当前浏览器，支持下载 Markdown 学习记录。
- 完成足迹由学生自行勾选，不代表系统已检查任务或教师已收到作业。
- 备案链接：**苏ICP备2021038338号-1**，跳转到 https://beian.miit.gov.cn/。
- 适配电脑、平板、手机；尊重系统“减少动态效果”设置。

## 三个站点

| 域名 | 用途 | VPS 服务 |
| --- | --- | --- |
| `learn.alumos.cn` | 学习单（包含北斗） | 本镜像，宿主机端口 **18082** |
| `chinacore.alumos.cn` | 中国芯 | 现有项目，端口 **18080** |
| `fxh.alumos.cn` | 高小铁 | 现有项目，端口 **18081** |

页面实际嵌入 `/beidou/`、`https://fxh.alumos.cn/` 和 `https://chinacore.alumos.cn/join`。DNS、证书与 CDN 由你部署；在另外两个域名的 HTTPS 入口配置完成前，相关活动可能无法加载。北斗不依赖它们。

## 在 1Panel 上用 Docker 部署

1. 打开「容器 → 编排」，新建 `chinacore-learning-sheet`。
2. 粘贴本仓库 [compose.1panel.yaml](compose.1panel.yaml)，点击创建。镜像为 `ghcr.io/alumos/chinacore-classroom:learning-sheet-latest`，Linux amd64。
3. 在 VPS 本机确认 `http://127.0.0.1:18082/` 能打开（如果远程直连端口测试，还需放行端口）。
4. 新建 `learn.alumos.cn` 网站，反向代理到学习单服务，配置 HTTPS；CDN 接入由你完成。
5. 将 `chinacore.alumos.cn` 反向代理到中国芯的 18080 端口，将 `fxh.alumos.cn` 反向代理到高小铁的 18081 端口，分别配置 HTTPS。
6. 中国芯必须升级到支持 iframe 的新版镜像，并在其 Compose 的 `environment` 中增加：

```yaml
      STUDENT_FRAME_ORIGINS: "https://learn.alumos.cn"
```

中国芯项目及更新说明：https://github.com/Alumos/chinacore-classroom 。中国芯的 `/join` 应返回 `Content-Security-Policy: frame-ancestors 'self' https://learn.alumos.cn`，且不含冲突的 `X-Frame-Options: DENY`。反向代理或 CDN 不应给 `/join` 额外添加禁止嵌入的响应头。

学习单网站的宿主机 Nginx 反向代理示例：

```nginx
location / {
    proxy_pass http://127.0.0.1:18082;
    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

若 1Panel 的 OpenResty 在容器中，请使用能访问宿主机的地址，或共享 Docker 网络中的 `learning-sheet:80`；此时 `127.0.0.1` 指的是 OpenResty 容器自身。

中国芯与高小铁的代理还需要支持 SSE：

```nginx
location / {
    # 中国芯用 18080；高小铁用 18081。
    proxy_pass http://127.0.0.1:18080;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
}
```

CDN 配置要点：两个互动服务的 `/api/` 路径不缓存、不缓冲，支持 SSE 长连接。学习单的 HTML、`config.js`、JS/CSS 避免长期缓存，更新时刷新 CDN 缓存；源站已发送 `Cache-Control: no-cache`。HTTPS 学习单必须嵌入 HTTPS 活动，不能继续使用 HTTP IP 地址作为 iframe 来源。

## 修改活动地址

在学习单 Compose 中修改 `CLASSROOM_URL`、`SEARCH_URL`，然后重建容器即可，无需重新构建镜像。使用完整 HTTP(S) 地址，不包含引号或换行。

```yaml
    environment:
      CLASSROOM_URL: "https://chinacore.alumos.cn/join"
      SEARCH_URL: "https://fxh.alumos.cn/"
```

直接部署静态文件时，使用整个 `site/` 文件夹，并编辑 `site/config.js`。

## 镜像发布与更新

推送本仓库 `main` 后 GitHub Actions 检查脚本、资源引用并实际运行容器，验证启动配置、备案号和北斗文件。公开镜像由中国芯仓库的 `Publish public learning sheet image` 工作流构建：从本仓库 `main` 检出源码，验证后发布 `ghcr.io/alumos/chinacore-classroom:learning-sheet-latest` 和对应 `learning-sheet-sha-` 标签。

学习单后续更新：先推送本仓库并确认测试通过，再在中国芯仓库的 Actions 页面手动运行上述工作流。两者源码独立，只共用已公开的镜像包；中国芯自身的 `latest` 标签不会被学习单工作流覆盖。

在 1Panel 拉取最新镜像并重建本学习单编排即可更新。学习记录保存在学生浏览器，不在容器中；刷新会重载活动 iframe，切换活动不会。清理浏览器数据或更换设备会失去本机记录，可先下载。

新学习单镜像使用已公开的 `chinacore-classroom` 镜像包，可匿名拉取。旧的 `chinacore-learning-sheet:latest` 镜像包不再作为部署入口。

## 本地预览与源码部署

```bash
python3 -m http.server 18082 --directory site
# 浏览器打开 http://localhost:18082/
```

本地 HTTP 来源若要嵌入中国芯，还需在中国芯允许列表临时添加 `http://localhost:18082`。生产使用 HTTPS。

从源码构建 Docker：

```bash
docker compose -f compose.build.yaml up -d --build
```

## 北斗来源

`site/beidou/` 是百优文件夹中“北斗拼装台 V2：原子钟现场实验”的运行文件快照，保持原模拟逻辑与资源。原子钟实验使用四颗卫星观测的平面教学模型，不代表真实系统的完整三维解算。网页内“教学与素材来源”保留教材、北斗官网和地球纹理来源。

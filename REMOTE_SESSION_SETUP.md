# 远程参与者实验操作指南（Cloudflare Tunnel）

> 适用场景：参与者不在你身边，需要在自己的电脑上远程完成实验。不需要注册任何云平台账号，
> 不需要改代码，每个评估者在自己电脑上照着做就行。数据仍然存在**你自己电脑**的
> `backend/data/sessions/` 里，跟本地跑没有区别。

## 一次性准备（每个评估者自己的电脑上做一次）

1. 按 `README.md` 的 Setup 部分把 `.env`、后端依赖、前端依赖装好。
2. 打开 `.env`，确认：
   ```
   STUDY_MODE=1
   ```
   （锁掉"上传自己代码"，保证每个参与者用一样的 3 个场景）
3. 装 `cloudflared`（免费、不用注册账号）：

   | 系统 | 安装方式 |
   |---|---|
   | macOS | `brew install cloudflared` |
   | Windows | `winget install --id Cloudflare.cloudflared` （或去 [GitHub Releases](https://github.com/cloudflare/cloudflared/releases) 下 `.msi`） |
   | Linux | 去 [GitHub Releases](https://github.com/cloudflare/cloudflared/releases) 下对应架构的二进制，`chmod +x` 后放进 PATH |

   装完用 `cloudflared --version` 确认能跑。

## 每次约参与者时的操作步骤

1. **启动服务**（项目根目录）：
   ```bash
   ./dev.sh
   ```
   确认能在自己电脑上打开 `http://localhost:5173` 且正常工作。

2. **开一个新终端，开隧道**（只需要穿透前端的 5173，`/api` 请求会被 Vite 自动转发给本地的后端，不用单独穿透 8000）：
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
   几秒后终端里会打印一行形如：
   ```
   https://random-words-1234.trycloudflare.com
   ```
   这就是这次 session 的临时公网链接。

3. **把链接发给这次约好的参与者**，让他在自己电脑的浏览器里打开。流程和本地跑完全一样：同意/资格筛选 → 背景问卷 → 3 个任务（含 Check your understanding）→ Final 问卷 → Thank you。

4. **session 进行期间**：你这边的终端要一直开着（`dev.sh` 和 `cloudflared` 两个都不能关），电脑不能休眠断网。如果协议要求你全程观察，可以同时开语音/视频通话让参与者共享屏幕。

5. **session 结束后，立刻关闭隧道**（在跑 `cloudflared` 的终端按 `Ctrl+C`）。不需要马上关 `dev.sh`，但隧道一定要关。

## ⚠️ 安全提醒（必须注意）

- **隧道开着的时候，整条 `/api` 都暴露在公网上，包括 `/api/admin/sessions` 和
  `/api/admin/export.csv` 这两个没有身份验证的管理接口**。也就是说，拿到这个链接的任何人
  理论上都能看到你机器上存的所有参与者数据，不只是当次这一个人的。
- 所以：
  - 链接**只发给当次约好的这一个参与者**，不要发到群里、不要发到任何公开的地方。
  - **session 一结束立刻关隧道**，不要让它一直挂着。
  - 每次重新开 `cloudflared tunnel`，链接都会变——这是好事，意味着上一次的链接自动失效了。

## session 结束后怎么拿数据

还是在你自己电脑上（不用通过隧道）：

- 看这个参与者走到哪了：`http://localhost:8000/api/admin/sessions/<participant-id>`
- 导出这台电脑上所有参与者的统一 CSV：
  ```bash
  curl http://localhost:8000/api/admin/export.csv -o my_data.csv
  ```
  这个 `my_data.csv` 就是要交给 Group 阶段合并统计、以及放进你 Individual 报告里的匿名原始数据。

## 常见问题

| 现象 | 可能原因 / 处理 |
|---|---|
| 参与者打开链接显示连不上 | 检查你的 `dev.sh` 和 `cloudflared` 是否都还在跑；检查自己网络有没有断 |
| 参与者反馈页面空白或报错 | 让他截个图/把浏览器 Console 报错发你看；一般是网络中途断了，重新发一次当前隧道链接即可（不用重开隧道） |
| 做到一半隧道挂了 | 重新跑一次 `cloudflared tunnel --url http://localhost:5173`，拿到新链接发给参与者继续做——因为数据存在你本地磁盘上，中断不会丢之前已经提交的那部分数据 |
| 想同时约好几个人用不同链接 | 每次约人前单独开一次隧道、用完关掉，不要图省事一次开着给多个人轮着用 |

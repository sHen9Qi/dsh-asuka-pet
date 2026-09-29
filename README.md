# asuka-pet · 明日香桌宠

独立的明日香 Q 版桌宠插件，可与任何 DeepSeek Harness 皮肤搭配使用。

> 「乗った! これ、私の出番でしょ!」—— 式波・明日香

## 效果

- **右下角悬浮 Q 版明日香**，点击说台词，拖拽改位置
- **AT Field 光圈**：用户提交输入后至智能体完全输出期间，自动出现旋转光圈
- **气泡展示**：空闲 / 非空闲两态，统一由 3 秒节拍器驱动（状态切换不额外弹气泡）。非空闲（用户输入至智能体完全输出）期间淡蓝/淡紫/淡黄三种气泡随机轮换，每个持续 4 秒，动画随颜色绑定；空闲显示奶橙气泡
- **位置持久化**：拖拽后位置存入 localStorage，重启后自动恢复
- 纯客户端插件，不发出任何网络请求

## 安装

本插件不在 npm 上，从本地目录安装。下文的 `<插件目录>` 指 clone 下来的**绝对路径**。

```sh
git clone https://github.com/sHen9Qi/dsh-asuka-pet.git
```

### Windows 桌面版（DeepSeek Harness Desktop）

桌面版跑的是保留 profile `desktop`，它由 Electron 独占：npm 上那个 `dsh`
会拒绝操作它，必须改用 App 自带的那份命令，并且**先把 App 完全退出**（含托盘）。

```powershell
# <APP> = DeepSeek Harness 的安装目录
# 1. 完全退出 App，2. 安装到 desktop profile
& "<APP>\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add <插件目录>
```

安装成功后 `%USERPROFILE%\.dsh\profiles\desktop\package.json` 里会自动出现该依赖，
并被追加进 `dsh.profile.bundles`（因为本包声明了 `dsh.bundle`）。重启 App 即生效。

### Web 版

```powershell
dsh plugin --profile web add <插件目录>
```

### 确认加载

启动后在页面控制台执行，返回当前构建号即说明 bundle 已加载：

```js
document.body.dataset.asukaPetBuild   // 例：'4mood-v9'
```

## 卸载

```powershell
# Web 版
dsh plugin --profile web remove @dsh-external/dsh-client-ui-asuka-pet

# Windows 桌面版（先完全退出 App）
& "<APP>\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove @dsh-external/dsh-client-ui-asuka-pet
```

## 兼容性

插件同时兼容 0.1.x 与 0.2.0 起的运行时。两者的客户端加载契约没有变化：
`dsh.client` 声明、`exports["./client"]`、`window.__ModuleLoader__.load({ id, factory })`
以及 `ctx.effect()` 都照旧。有变化的只有「一轮是否在跑」的 DOM 钩子，代码里两条判据都保留：

| 判据 | 0.1.x | 0.2.0 起 |
|---|---|---|
| 提交瞬间 | 输入框 `[data-phase="submitting"\|"adjudicating"]` | 同左 |
| 一轮进行中 | `[data-chat-flow] > [role="status"]` | `[data-chat-running]`（`role="status"` 现在嵌在其内，不再是直接子元素） |
| 思考 / 工具 / 流式输出 | `[data-variant][data-state="running"]`、`[data-streaming]` | 同左 |

### 为什么 AT Field 光圈改用 `clip-path`

光圈是个 `inset: 0` 的方形盒子：外圆靠 `border-radius: 50%`，中间的洞靠
`mask: radial-gradient(circle, …)`。但这条 mask 的 `circle` 默认尺寸是 `farthest-corner`，
渐变会把最后一个色标铺满整个盒子（含四角），**它没有能力把外缘切圆**。

因此在某些宿主上（`mask` + `transform` 动画使元素被提升为合成层，背景的
`border-radius` 裁切丢失），光圈会变成「外方内圆」。现在外圆由 `clip-path: circle(50%)`
独立保证，`border-radius` 保留作兜底，两种宿主都是正圆。

## 开发构建

```sh
cd asuka-pet

# 首次需要装构建依赖：lightningcss，仅用于编译 CSS module
npm install

# 由 assets 重新生成 pet-art.generated.ts，并重建 lib/
node scripts/build.cjs

# 刷新页面 Ctrl+F5
```

## 许可

CC BY-NC-SA 4.0 · 禁止商业使用

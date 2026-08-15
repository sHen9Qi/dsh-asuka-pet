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

```sh
# 独立安装桌宠插件
git clone https://github.com/sHen9Qi/asuka-pet.git
cd asuka-pet
dsh plugin --profile web add asuka-pet
```

## 卸载

```sh
dsh plugin --profile web remove @dsh-external/dsh-client-ui-asuka-pet
```

## 开发构建

```sh
cd asuka-pet

# 准备资源（替换桌宠图片）
# 把新图片放到 assets
# 运行 build 生成 pet-art.generated.ts

# 重新构建 lib/
node scripts/build.cjs

# 刷新页面 Ctrl+F5
```

## 许可

CC BY-NC-SA 4.0 · 禁止商业使用

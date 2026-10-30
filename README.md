# pure-project

前端交互 Demo 集合仓库，包含 three.js 3D 演示与 Canvas 小工具，通过 GitHub Actions 自动发布到 GitHub Pages。

**在线演示：** https://webjunjun.github.io/pure-project/

## Demo 列表

| Demo | 入口 | 说明 |
| --- | --- | --- |
| VR 看房 | [threeDemo/vr_view_house.html](threeDemo/vr_view_house.html) | 加载 GLB 房屋模型（Meshopt 几何压缩），支持地板悬停行走、物体悬停提示等交互 |
| Kenney 城市 | [threeDemo/kenney_city.html](threeDemo/kenney_city.html) | Kenney 风格城市场景加载与漫游 |
| 伪跳跃 | [threeDemo/fake_jump.html](threeDemo/fake_jump.html) | 正交相机伪 3D 跳跃小游戏（抛物线跳跃、阴影落地） |
| 手写签名 | [signDemo/signature.html](signDemo/signature.html) | Canvas 签名小工具，支持鼠标/触摸/手写笔、贝塞尔平滑笔画、撤销、透明背景导出 |

## 目录结构

```
pure-project/
├── assets/       # 模型、贴图等静态资源（GLB 房屋模型等）
├── common/       # 第三方库（three.js 及 jsm 扩展、gsap、ammo 等）与公共样式
├── threeDemo/    # three.js 演示页面及其组件、系统、样式
├── signDemo/     # 手写签名小工具
└── .github/workflows/deploy-pages.yml  # Pages 自动发布工作流
```

## 本地运行

纯静态项目，无需构建，任意本地静态服务器即可：

```bash
python -m http.server 8000
# 浏览器打开 http://localhost:8000/threeDemo/vr_view_house.html
```

## 发布

推送到 `master` 分支（或手动触发 workflow）后，[deploy-pages.yml](.github/workflows/deploy-pages.yml) 会自动：

1. 将 `assets`、`common`、`threeDemo`、`signDemo` 复制到 `dist`
2. 把 demo 源码中的 `/assets/`、`/common/` 绝对路径改写为 Pages 子路径前缀
3. 生成站点入口页并发布到 GitHub Pages

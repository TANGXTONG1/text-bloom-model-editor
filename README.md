# 字花模型编辑器 / Text Bloom

[![CI](https://github.com/TANGXTONG1/text-bloom-model-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/TANGXTONG1/text-bloom-model-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/code-MIT-22a699.svg)](LICENSE)
[![Model assets: CC BY 4.0](https://img.shields.io/badge/model%20assets-CC%20BY%204.0-f36f56.svg)](LICENSES/MODEL-ASSETS.md)

一个在浏览器里把中文、Logo 和装饰图案变成彩色、闭合、可打印 3MF 的开源编辑器。适合先给公司做点有意思的东西：工位名牌、同事称号、活动挂牌、部门梗牌和钥匙牌。

**在线体验：<http://118.145.70.247/text-model-editor/>**

![字花模型编辑器网页预览封面](public/og.png)

## 从编辑器到真实成品

这些不是概念渲染：下图分别是 Bambu Studio 排盘、真实批量打印和最终成品。网页预览与 3MF 导出使用同一套网格管线。

<table>
  <tr>
    <td width="33%"><img src="docs/images/bambu-studio-build-plate.jpg" alt="Bambu Studio 中排布的彩色文字花模型" /></td>
    <td width="33%"><img src="docs/images/real-print-batch.jpg" alt="打印板上的救火圣手彩色字牌" /></td>
    <td width="33%"><img src="docs/images/finished-text-signs.jpg" alt="我恨P人和救火圣手彩色成品" /></td>
  </tr>
  <tr>
    <td align="center">切片与四色排盘</td>
    <td align="center">一盘批量打印</td>
    <td align="center">实物效果</td>
  </tr>
</table>

更多大图见 [作品展示](docs/SHOWCASE.md)。

## 它能做什么

- 编辑中文文字、字号、字距和成品宽度
- 拖放、缩放、旋转星星、火苗、电脑、爱心、发散线和六种可爱图案
- 上传 2 MB 以内的 SVG 或透明 PNG，作为 Logo 或自定义装饰
- 配置四个色区和三层实体厚度
- 在可旋转的 3D 视窗中检查真实厚度与网格
- 导出带颜色分区的 3MF，交给 Bambu Studio 做 AMS/多材料映射
- 导出 SVG 排版预览

最重要的一点：**3D 视窗和 3MF 导出使用同一份轮廓、布尔运算和三角网格数据**。网页不是一套“看起来好看”的假预览，下载文件也不是另一套生成逻辑。

## 快速开始

需要 Node.js 22.13 或更高版本。

```bash
git clone https://github.com/TANGXTONG1/text-bloom-model-editor.git
cd text-bloom-model-editor
npm ci
npm run dev
```

然后打开终端提示的本地地址。

常用命令：

```bash
npm run check          # lint + TypeScript + 构建 + 全部测试
npm run build          # 生产构建
npm run export:self-hosted
```

## 导出并部署到自己的服务器

根路径部署：

```bash
PUBLIC_ORIGIN=https://example.com npm run export:self-hosted
```

子路径部署：

```bash
PUBLIC_ORIGIN=https://example.com \
BASE_PATH=/text-model-editor \
npm run export:self-hosted
```

静态文件会写入 `static-site/`。把整个目录交给 Nginx、Caddy、对象存储或任意静态服务器即可。`PUBLIC_ORIGIN` 和 `BASE_PATH` 只影响静态导出的资源链接与社交分享元数据。

## 从网页到打印

1. 在 2D 视图排版，尽量让图案和主体轮廓有可靠连接。
2. 切到 3D 视图，从正面、背面和侧面检查是否符合预期。
3. 下载彩色 3MF，在 Bambu Studio 中打开。
4. 核对四个对象/色区的耗材映射；不同机器与 AMS 槽位不会自动保持一致。
5. 首次打印建议先按较小尺寸打样，确认最细笔画、首层和挂孔强度。

更具体的切片建议见 [3D 打印指南](docs/PRINTING_GUIDE.md)。

## 几何管线

```text
文字 / SVG / PNG / 内置图案
          ↓ 浏览器高分辨率蒙版
轮廓追踪 → 平滑 → Clipper 布尔与描边
          ↓
带孔多边形三角化 → 封闭实体网格
          ├─ Three.js 3D 预览
          └─ 带颜色资源的 3MF
```

架构与关键取舍见 [ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 隐私与限制

- 上传的 SVG/PNG 只在当前浏览器内读取和建模，应用没有上传接口或数据库。
- 高分辨率轮廓会比普通 2D 预览更耗 CPU；复杂作品的首次 3D 重建可能需要几十秒。
- 特别密集的 SVG、极细线条或大量自交路径仍可能造成不理想的布尔结果，建议先简化图形。
- 3MF 本质上由三角网格组成；极端放大总能看到三角形。项目重点是让正常打印尺度下的圆弧足够平滑，并保证实体闭合。
- 打印前始终应在切片软件中检查颜色映射、首层、悬空和成品尺寸。

## 参与项目

- 问题与功能建议：使用 GitHub Issues。
- 修复或新图案：欢迎提交 Pull Request。
- 首次贡献前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 发现安全问题请按 [SECURITY.md](SECURITY.md) 私下报告，不要公开 Issue。

当前路线图包括：更多中文字体验、装饰素材包、参数预设保存、Web Worker 加速、模型发布包自动生成。

## 发布资料

- [拓竹社区 / MakerWorld 首发包](docs/MAKERWORLD_RELEASE.md)
- [小红书、朋友圈与公司群宣传文案](docs/LAUNCH_COPY.md)
- [网页、切片与实物效果图](docs/SHOWCASE.md)
- [版本发布检查清单](docs/RELEASING.md)

## 许可证

- 源代码： [MIT License](LICENSE)
- 仓库内原创示例模型与宣传视觉素材： [CC BY 4.0](LICENSES/MODEL-ASSETS.md)
- 用户自行上传的字体、Logo、SVG、PNG 和由其生成的模型，权利仍归各自权利人；使用者需要自行确认授权。

如果你要在拓竹社区上传带公司名称或 Logo 的版本，请先确认公司允许公开使用该标识。

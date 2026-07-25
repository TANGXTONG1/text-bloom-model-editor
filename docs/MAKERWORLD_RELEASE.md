# MakerWorld / 拓竹社区首发包

这份材料按“先发布一个真实可打印示例，再引导大家使用开源编辑器生成自己的版本”设计。

## 推荐首发定位

**模型标题**

> 彩色中文花字牌｜可自定义文字与装饰

不要在标题里使用“最好”“官方”“顶级”等夸张词，也不要为每个文字变体单独建一个几乎相同的模型条目。

**上传类型**

- Original / 原创
- AI-generated / AI 生成或 AI 辅助：勾选
- 建议许可证：CC BY 4.0
- 分类：选择当前上传页中最接近的 Office、Signs、Keychains 或 Decor

代码使用 MIT；MakerWorld 里的示例 3MF 使用 CC BY 4.0。这样别人可以修改和再分享，但需要署名。

## 上架前必须准备

- [ ] 从线上编辑器重新下载最终彩色 3MF
- [ ] 用当前版本 Bambu Studio 打开且无修复警告
- [ ] 四个色区都能正确分配耗材
- [ ] 完成至少一次实物打样
- [ ] 保存包含切片参数的打印配置
- [ ] 拍摄封面、正面、侧面和使用场景照片
- [ ] 公司名称、Logo 和字体已获得公开使用授权
- [ ] 文件名、盘名和对象名清楚，不含“final-final-2”之类临时命名

建议首个 3MF 文件名：

```text
Text-Bloom-Chinese-Sign-4Color-v0.1.0.3mf
```

如果提供多个文字版本，应放在同一个项目的不同盘中，并为每个盘命名；不要拆成大量重复模型。

## 可直接粘贴的模型简介

> 这是一个用开源浏览器编辑器生成的分层彩色中文花字牌。文字、Logo、星星、火苗、电脑和可爱装饰都可以重新排版；导出的 3MF 包含独立闭合色区，可在 Bambu Studio 中映射到 AMS 耗材。
>
> 这个示例采用平背朝下打印，通常不需要支撑。首次打印请先核对成品尺寸、最细连接处和四个耗材槽位。模型生成器、几何管线和测试代码均已开源，欢迎制作自己的同事称号、部门梗牌、活动挂牌和工位名牌。
>
> 如果你发布改版，请按 CC BY 4.0 标注来源，并确认你使用的公司 Logo、字体或第三方图案拥有相应授权。

## 打印配置说明模板

> - Printer: [填写机器，例如 Bambu Lab A1 mini]
> - Nozzle: 0.4 mm
> - Layer height: 0.20 mm
> - Walls: 3
> - Infill: 15% Gyroid
> - Supports: Off
> - Orientation: Flat back on build plate
> - Colors: 4
> - Filament: [填写实际 PLA 型号]
> - Notes: 导入后请按自己的 AMS 槽位重新核对四个色区。

这些参数必须按真实打样结果修改，不要在未打印时宣称已验证。

## 标签建议

```text
Chinese text, sign, office, nameplate, keychain, multicolor,
AMS, customizable, typography, cute, open source
```

只选择与模型实际内容相关的标签。

## 图片与视频清单

1. **封面**：实物占画面 70% 以上，背景干净，能直接读出文字。
2. **正面**：展示四个色区。
3. **侧面**：展示三层厚度，不用夸张广角。
4. **场景**：挂在工位、背包、会议室门牌或活动现场。
5. **切片图**：对象列表和耗材映射可见。
6. **编辑器动图**：改字、拖图案、旋转 3D、下载 3MF，控制在 8–12 秒。

封面和图片里不要放外部平台二维码。GitHub 链接只作为与模型直接相关的源码说明；如果当前审核不接受描述外链，就把项目名写为 `Text Bloom Model Editor`，并将链接放到 MakerWorld 个人资料允许的社交链接位置。

## 官方规则中与本项目最相关的注意项

- 上传必须包含完整模型、图片和必要说明，文件不能损坏。
- 相似文字、颜色或轻微 Logo 变化通常不应拆成多个重复条目。
- 必须遵守源素材许可证，并避免无授权商标、字体或角色形象。
- AI 生成或 AI 辅助内容需要明确标识。
- 不要用误导性功能描述、无关标签或诱导互动。
- CC0 模型需要实物打印图片；本项目建议 CC BY 4.0，但依然强烈建议上传真实打印图。

发布前再次查看：

- MakerWorld Community Guidelines: <https://makerworld.com/en/community-guidelines>
- MakerWorld print profile guide: <https://wiki.bambulab.com/en/makerworld/tutorials/print-profile-upload>

平台规则会更新，以实际上传页和最新官方说明为准。

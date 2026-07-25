# 版本发布清单

## 1. 发布前验证

```bash
npm ci
npm run check
PUBLIC_ORIGIN=https://example.com \
BASE_PATH=/text-model-editor \
npm run export:self-hosted
```

- [ ] 2D 拖动、缩放、旋转正常
- [ ] 3D 可旋转，正面和侧面无异常尖刺
- [ ] 默认作品成功下载 3MF
- [ ] Bambu Studio 打开时无网格修复警告
- [ ] 四个色区均可独立映射
- [ ] README 中 Demo、截图和许可证链接有效
- [ ] 源码中没有密钥、内部项目 ID 或私人路径

## 2. 更新版本信息

1. 更新 `package.json` 版本。
2. 把 `CHANGELOG.md` 的 Unreleased 内容移入新版本。
3. 如几何或 3MF 结构变化，重新生成并打印 MakerWorld 示例。

## 3. Git 标签与 GitHub Release

```bash
git tag -s v0.1.0 -m "Text Bloom v0.1.0"
git push origin main --follow-tags
gh release create v0.1.0 \
  --title "Text Bloom v0.1.0" \
  --notes-from-tag
```

如果没有 GPG 签名配置，可把 `git tag -s` 改为 `git tag -a`。

## 4. Release 附件

- 经 Bambu Studio 验证的示例 3MF
- 示例 SVG（可选）
- 实物正面和侧面图（可选）
- 不要上传带未授权 Logo 或字体的公开附件

## 5. 同步渠道

1. GitHub Release 发布。
2. 更新在线 Demo。
3. MakerWorld 更新模型文件和版本说明。
4. 小红书或公司群发布变更亮点。

版本说明应明确兼容性、几何变化和是否需要重新切片。

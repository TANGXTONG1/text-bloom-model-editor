# Text Bloom Model Editor

Text Bloom is an open-source browser editor that turns Chinese text, logos, and decorative shapes into colored, watertight 3MF models for 3D printing.

**Live demo: <http://118.145.70.247/text-model-editor/>**

![Text Bloom editor](public/og.png)

## Features

- Edit text, font size, letter spacing, and final model width.
- Move, scale, and rotate built-in decorations.
- Import an SVG or transparent PNG up to 2 MB.
- Configure four color regions and three solid layer heights.
- Inspect the actual mesh in an orbitable Three.js viewport.
- Export a colored 3MF for Bambu Studio and an SVG layout preview.
- Generate the 3D preview and exported 3MF from the same watertight mesh pipeline.

## Local development

Node.js 22.13 or later is required.

```bash
git clone https://github.com/TANGXTONG1/text-bloom-model-editor.git
cd text-bloom-model-editor
npm ci
npm run dev
```

Validation:

```bash
npm run check
```

Static export at the domain root:

```bash
PUBLIC_ORIGIN=https://example.com npm run export:self-hosted
```

Static export below a subpath:

```bash
PUBLIC_ORIGIN=https://example.com \
BASE_PATH=/text-model-editor \
npm run export:self-hosted
```

The generated site is written to `static-site/`.

## Printing notes

Open the exported 3MF in Bambu Studio and verify the filament assignment for every color object. Start with a small test print, especially when the design contains thin strokes, small holes, or a custom SVG.

See [docs/PRINTING_GUIDE.md](docs/PRINTING_GUIDE.md) for more details.

## Privacy

Imported SVG and PNG files are read and processed locally in the browser. The app does not include an upload endpoint or database.

## License

- Source code: [MIT](LICENSE)
- Original example models and visual assets: [CC BY 4.0](LICENSES/MODEL-ASSETS.md)
- Third-party fonts, logos, uploads, and generated models remain subject to their respective rights and licenses.

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

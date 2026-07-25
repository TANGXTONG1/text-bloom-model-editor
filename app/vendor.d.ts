/* Third-party packages without bundled typings expose dynamic JavaScript APIs. */

declare module "clipper-lib" {
  const ClipperLib: any;
  export default ClipperLib;
}

declare module "d3-contour" {
  export function contours(): any;
}

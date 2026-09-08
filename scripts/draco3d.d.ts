// The draco3d package ships no types; the build script uses a small, checked subset.
declare module "draco3d" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const draco3d: { createDecoderModule(config?: object): Promise<any> };
  export default draco3d;
}

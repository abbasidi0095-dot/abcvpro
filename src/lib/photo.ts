import sharp from "sharp";

/** Process an uploaded photo to JPEG, cropped 3:4, compact size (~15KB) for seamless browser base64 rendering.
 *  Resizing to 180x240 keeps the image crisp on A4 paper while keeping the base64 string extremely short
 *  to completely prevent WebKit/Safari "string didn't match expected pattern" DOM exceptions. */
export async function processPhoto(buffer: Buffer): Promise<string> {
  const out = sharp(buffer, { failOn: "none" }).rotate()
    .resize({ width: 180, height: 240, fit: "cover", position: sharp.gravity.center });

  let result: Buffer;
  for (const quality of [80, 70, 60, 50]) {
    const buf = await out.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (buf.length <= 30_000 || quality === 50) {
      result = buf;
      break;
    }
  }

  return `data:image/jpeg;base64,${result!.toString("base64")}`;
}
import { Readable } from "stream";

export function streamToString(stream: Readable): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let data = "";
    stream.on("data", (chunk) => (data += chunk.toString()));
    stream.on("end", () => resolve(data));
    stream.on("error", reject);
  });
}

export function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    let chunks: Array<Buffer> = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

import { uuid, hash } from "./deps.ts"
import * as path from "https://deno.land/std/path/mod.ts";

export interface fileData {
  path: string;
  size: number;
  checksum: hash.Sha256;
}

export class DataWriter {
  static getValues(p: Uint8Array): void {}

  static async init(path: string): Promise<fileData> {
    const fileInfo = await Deno.stat(path);
    if (!fileInfo.isFile) {
      return Promise.reject("The specified path is not a file.");
    }
    const size = fileInfo.size;
    const checksum = new hash.Sha256();
    return { path, size, checksum };
  }

  static async write(fileData: fileData, data?: any) {
    const dest = await Deno.open(fileData.path, { write: true });
    fileData.checksum = new hash.Sha256();
    const getValues = this.getValues;
    let size = fileData.size;

    const src: Deno.Reader = {
      read(p: Uint8Array): Promise<number | null> {
        return new Promise((resolve) => {
          const length = Math.min(p.byteLength, size);
          size -= length;
          if (length === 0) {
            resolve(null);
          } else {
            getValues(p);
            fileData.checksum.update(p.slice(0, length));
            resolve(length);
          }
        });
      },
    };
    await Deno.copy(src, dest);
    dest.close();
  }

  static async verify(fileData: fileData) {
    const src = await Deno.open(fileData.path, { read: true });
    const checksum = new hash.Sha256();
    for await (const chunk of Deno.iter(src)) {
      checksum.update(chunk);
    }
    src.close();
    if (fileData.checksum.hex() !== checksum.hex()) {
      return Promise.reject("Invalid checksum");
    }
  }
}

export class Random extends DataWriter {
  static getValues(p: Uint8Array): void {
    crypto.getRandomValues(p);
  }
}

export class RandomByte extends DataWriter {
  static getValues(p: Uint8Array): void {
    const byte = new Uint8Array(1);
    crypto.getRandomValues(byte);
    p.fill(byte[0]);
  }
}

export class Zero extends DataWriter {
  static getValues(p: Uint8Array): void {
    p.fill(0x000000);
  }
}

export class One extends DataWriter {
  static getValues(p: Uint8Array): void {
    p.fill(0xFFFFFF);
  }
}

export class Byte extends DataWriter {
  static async write(fileData: fileData, byte: number) {
    this.getValues = function (p: Uint8Array) {
      p.fill(byte);
    };
    super.write(fileData);
  }
}

export class ByteArray extends DataWriter {
  static async write(fileData: fileData, byteArray: number[]) {
    const length = byteArray.length;
    this.getValues = function (p: Uint8Array) {
      for (let i = 0; i < p.length; i++) {
        p[i] = byteArray[i % length];
      }
    };
    super.write(fileData);
  }
}

export class FileProperties {
  static async rename(fileData: fileData) {
    const newName = uuid.v4.generate();
    const newPath = path.join(path.dirname(fileData.path), newName);
    await Deno.rename(fileData.path, newPath);
    fileData.path = newPath;
  }

  static async truncate(fileData: fileData) {
    const newSize = Math.floor((0.25 + Math.random() * 0.5) * fileData.size);
    await Deno.truncate(fileData.path, newSize);
    fileData.size = newSize;
  }

/*   static async resetTimestamps(fileData: fileData) {
    await Deno.utime(fileData.path, new Date(0), new Date(0));
  }

  static async changeTimestamps(
    fileData: fileData,
    { date1 = new Date(0), date2 = new Date() }: {
      date1?: Date;
      date2?: Date;
    } = {},
  ) {
    const date = new Date(randomValueBetween(date2.getTime(), date1.getTime()));
    await Deno.utime(fileData.path, date, date);
  } */
}

/* function randomValueBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
} */

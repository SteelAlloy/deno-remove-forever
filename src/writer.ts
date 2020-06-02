import { uuid, hash } from "./deps.ts"
import * as path from "https://deno.land/std/path/mod.ts";

export interface fileData {
  path: string;
  size: number;
  checksum: hash.Sha256;
}

export class DataWriter {

  /** Changes the buffer that will be written to the file.
   * This method should be overwritten. */
  static getValues(p: Uint8Array): void {}

  /** Retrieves information about the file.
   * This function is mandatory. */
  static async init(path: string): Promise<fileData> {
    const fileInfo = await Deno.stat(path);
    if (!fileInfo.isFile) {
      return Promise.reject("The specified path is not a file.");
    }
    const size = fileInfo.size;
    const checksum = new hash.Sha256();
    return { path, size, checksum };
  }

  /** Writes the buffer to the file.
   * The data is copied from a custom Reader. */
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

  /** Checks that the file was correctly written.
   * Will read the file and compares the checksums. */
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

/** Writes cryptographically strong pseudo-random data. */
export class Random extends DataWriter {
  static getValues(p: Uint8Array): void {
    crypto.getRandomValues(p);
  }
}

/** Writes one cryptographically strong pseudo-random byte on the whole file. */
export class RandomByte extends DataWriter {
  static getValues(p: Uint8Array): void {
    const byte = new Uint8Array(1);
    crypto.getRandomValues(byte);
    p.fill(byte[0]);
  }
}

/** Writes zeros on the whole file. */
export class Zero extends DataWriter {
  static getValues(p: Uint8Array): void {
    p.fill(0x000000);
  }
}

/** Writes ones on the whole file. */
export class One extends DataWriter {
  static getValues(p: Uint8Array): void {
    p.fill(0xFFFFFF);
  }
}

/** Writes one byte on the whole file. */
export class Byte extends DataWriter {
  static async write(fileData: fileData, byte: number) {
    this.getValues = function (p: Uint8Array) {
      p.fill(byte);
    };
    super.write(fileData);
  }
}

/** Writes an array of bytes on the whole file. */
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

/** Changes different file properties. */
export class FileProperties {

  /** Renames the file to a random string (uuid v4). */
  static async rename(fileData: fileData) {
    const newName = uuid.v4.generate();
    const newPath = path.join(path.dirname(fileData.path), newName);
    await Deno.rename(fileData.path, newPath);
    fileData.path = newPath;
  }

  /** Truncates to between 25% and 75% of the file size. */
  static async truncate(fileData: fileData) {
    const newSize = Math.floor((0.25 + Math.random() * 0.5) * fileData.size);
    await Deno.truncate(fileData.path, newSize);
    fileData.size = newSize;
  }

  // ! Unstable
  /** Reset file timestamps to `1970-01-01T00:00:00.000Z`. */
  // static async resetTimestamps(fileData: fileData) {
  //   await Deno.utime(fileData.path, new Date(0), new Date(0));
  // }

  // ! Unstable
  /** Randomize file timestamps to a random value between `date1` and `date2`.
   * Setting the same value to `date1` and `date2` will take away the randomness. */
  // static async changeTimestamps(
  //   fileData: fileData,
  //   { date1 = new Date(0), date2 = new Date() }: {
  //     date1?: Date;
  //     date2?: Date;
  //   } = {},
  // ) {
  //   const date = new Date(randomValueBetween(date2.getTime(), date1.getTime()));
  //   await Deno.utime(fileData.path, date, date);
  // }
}

function randomValueBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

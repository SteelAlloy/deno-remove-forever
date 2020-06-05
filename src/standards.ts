import { logger } from "./logger.ts";
import {
  DataWriter,
  Random,
  RandomByte,
  Zero,
  One,
  Byte,
  ByteArray,
  FileProperties,
  fileData,
} from "./writer.ts";

/** Contains the index of all standards. */
export const index = {
  /** 
   * PASS | ACTION
   * ---- | ------
   * 0    | The file is deleted without any security. */
  "unsafe": async (file: string, _options: options) => {
    await Deno.remove(file)
  },

  /** 
   * PASS | ACTION
   * ---- | ------
   * 1    | Your data is overwritten with cryptographically strong pseudo-random data. (The data is indistinguishable from random noise.) */
  "random": standard(async (fileData: fileData) => {
    await Random.write(fileData);
  }),

  /** 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a random character. */
  "randomByte": standard(async (fileData: fileData) => {
    await RandomByte.write(fileData);
  }),

  /** 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero. */
  "zero": standard(async (fileData: fileData) => {
    await One.write(fileData);
  }),

  /** 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a one. */
  "one": standard(async (fileData: fileData) => {
    await One.write(fileData);
  }),

  /** ### REMOVE-FOREVER STANDARD
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with cryptographically strong pseudo-random data as well as verifying the writing of the data;
   * Then | Renaming the file with random data;
   * Then | Truncating between 25% and 75% of the file;
   * Then | Randomize file timestamps. */
  "forever": standard(async (fileData: fileData) => {
    await Random.write(fileData);
    await DataWriter.verify(fileData);
    await FileProperties.rename(fileData);
    await FileProperties.truncate(fileData);
    // await FileProperties.changeTimestamps(fileData); // ! Unstable
  }),

  /** ### NEW ZEALAND INFORMATION AND COMMUNICATIONS TECHNOLOGY STANDARD NZSIT 402
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "NZSIT-402": standard(async (fileData: fileData) => {
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  /** ### AUSTRALIAN INFORMATION SECURITY MANUAL STANDARD ISM 6.2.92
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a random character as well as verifying the writing of this character.
   * 
   * It is worth mentioning that the ISM 6.2.92 overwrites a drive with a size of less than 15 GB by a three-time overwriting with a random character. */
  "ISM-6.2.92": (file: string, options: options) => {
    return index["NZSIT-402"](file, options);
  },

  /** ### RUSSIAN STATE STANDARD GOST R 50739-95 (RUSSIAN: ГОСТ P 50739-95)
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero;
   * 2    | Overwriting the data with a random character. */
  "GOST-R50739-95": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await RandomByte.write(fileData);
  }),

  /** ### AIR FORCE SYSTEM SECURITY INSTRUCTIONS AFSSI-5020
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero;
   * 2    | Overwriting the data with a one;
   * 3    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "AFSSI-5020": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await One.write(fileData);
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  /** ### BRITISH HMG INFOSEC STANDARD 5
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero;
   * 2    | Overwriting the data with a one;
   * 3    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "HMG-IS5": (file: string, options: options) => {
    return index["AFSSI-5020"](file, options);
  },

  /** ### COMMUNICATION SECURITY ESTABLISHMENT CANADA STANDARD CSEC ITSG-06
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero or a one;
   * 2    | Overwriting the data with the opposite sign (if in the first pass a one, then zero is used, if in the first pass a zero, then one is used);
   * 3    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "CSEC-ITSG-06": standard(async (fileData: fileData) => {
    const bool = getRandomByte() < 128;
    if (bool) {
      await Zero.write(fileData);
      await One.write(fileData);
    } else {
      await One.write(fileData);
      await Zero.write(fileData);
    }
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  /** ### NAVY STAFF OFFICE PUBLICATION NAVSO P-5239-26
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a defined character (e.g., one);
   * 2    | Overwriting the data with the opposite of the defined character (e.g., zero);
   * 3    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "NAVOS-5239-26": (file: string, options: options) => {
    return index["CSEC-ITSG-06"](file, options);
  },

  /** ### STANDARD OF THE AMERICAN DEPARTMENT OF DEFENSE (DOD 5220.22 M)
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero as well as checking the writing of this character;
   * 2    | Overwriting the data with a one and checking the writing of this character;
   * 3    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "DOD-5220.22-M": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await DataWriter.verify(fileData);
    await One.write(fileData);
    await DataWriter.verify(fileData);
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  /** ### NATIONAL COMPUTER SECURITY CENTER NCSC-TG-025 STANDARD
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero as well as verifying the writing of this character;
   * 2    | Overwriting the data with a one and verifying the writing of this character;
   * 3    | Overwriting the data with a random character as well as verifying the writing of this character. */
  "NCSC-TG-025": (file: string, options: options) => {
    return index["DOD-5220.22-M"](file, options);
  },

  /** ### U.S. ARMY AR380-19
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a random character;
   * 2    | Overwriting the data with a defined character (e.g., zero);
   * 3    | Overwriting the data with the opposite of the random character (e.g., one), and verifying the writing of that character. */
  "AR380-19": standard(async (fileData: fileData) => {
    await RandomByte.write(fileData);
    const byte = getRandomByte();
    await Byte.write(fileData, byte);
    await Byte.write(fileData, ~byte);
    await DataWriter.verify(fileData);
  }),

  /** ### ROYAL CANADIAN MOUNTED POLICE TSSIT OPS-II
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero;
   * 2    | Overwriting the data with a one;
   * 3-6  | Same as 1-2;
   * 7    | Overwriting the data with a random character as well as review the writing of this character. */
  "RCMP-TSSIT-OPS-II": standard(async (fileData: fileData) => {
    for (let i = 0; i < 3; i++) {
      await Zero.write(fileData);
      await One.write(fileData);
    }
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  /** ### STANDARD OF THE FEDERAL OFFICE FOR INFORMATION SECURITY (BSI-VSITR)
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero;
   * 2    | Overwriting the data with a one;
   * 3-6  | Same as 1-2;
   * 7    | Overwriting the data with a random character. */
  "VSITR": standard(async (fileData: fileData) => {
    for (let i = 0; i < 3; i++) {
      await Zero.write(fileData);
      await One.write(fileData);
    }
    await RandomByte.write(fileData);
  }),

  /** ### BRUCE SCHNEIER ALGORITHM
   * 
   * PASS | ACTION
   * ---- | ------
   * 1    | Overwriting the data with a zero;
   * 2    | Overwriting the data with a one;
   * 3-7  | Overwriting the data with a random character. */
  "schneier": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await One.write(fileData);
    for (let i = 0; i < 5; i++) {
      await RandomByte.write(fileData);
    }
  }),

  /** ### PFITZNER METHOD
   * 
   * Pass 1 to Pass 33: Overwriting the data with a random character. */
  "pfitzner": standard(async (fileData: fileData) => {
    for (let i = 0; i < 33; i++) {
      await RandomByte.write(fileData);
    }
  }),

  /** ### PETER GUTMANN ALGORITHM
   * 
   * PASS | ACTION
   * ---- | ------
   * 1-4  | Overwriting with random data;
   * 5    | Overwriting with `0x55`;
   * 6    | Overwriting with `0xAA`;
   * 7-9  | Overwriting with `0x92 0x49 0x24`, then cycling through the bytes;
   * 10-25| Overwriting with `0x00`, incremented by `1` at each pass, until `0xFF`;
   * 26-28| Same as 7-9;
   * 29-31| Overwriting with `0x6D 0xB6 0xDB`, then cycling through the bytes;
   * 32-35| Overwriting with random data. */
  "gutmann": standard(async (fileData: fileData) => {
    for (let i = 0; i < 4; i++) {
      await Random.write(fileData);
    }
    await Byte.write(fileData, 0x55);
    await Byte.write(fileData, 0xAA);
    await ByteArray.write(fileData, [0x92, 0x49, 0x24]);
    await ByteArray.write(fileData, [0x49, 0x24, 0x92]);
    await ByteArray.write(fileData, [0x24, 0x92, 0x49]);
    for (let byte = 0; byte < 0xFF; byte += 0x11) {
      await Byte.write(fileData, byte);
    }
    await ByteArray.write(fileData, [0x92, 0x49, 0x24]);
    await ByteArray.write(fileData, [0x49, 0x24, 0x92]);
    await ByteArray.write(fileData, [0x24, 0x92, 0x49]);
    await ByteArray.write(fileData, [0x6D, 0xB6, 0xDB]);
    await ByteArray.write(fileData, [0xB6, 0xDB, 0x6D]);
    await ByteArray.write(fileData, [0xDB, 0x6D, 0xB6]);
    for (let i = 0; i < 4; i++) {
      await Random.write(fileData);
    }
  }),
};

/** Transforms a list of steps into a function that accepts path and options. */
function standard(steps: (fileData: fileData) => Promise<void>) {
  return async function (file: string, options: options) {
    let retries = options.retries;
    let retryNeeded = false;
    let error;
    do {
      try {
        const fileData = await DataWriter.init(file);
        await steps(fileData);
        await Deno.remove(fileData.path);
        retryNeeded = false;
      } catch (err) {
        retryNeeded = true;
        error = err;
        retries--;
        logger.warning();
      }
    } while (retryNeeded && (retries > 0));
    if (error && retryNeeded) {
      return Promise.reject(error);
    }
    if (error) {
      logger.warn(file, error);
    }
  };
}

function getRandomByte() {
  return crypto.getRandomValues(new Uint8Array(1))[0];
}

export interface options {
  retries: number;
}

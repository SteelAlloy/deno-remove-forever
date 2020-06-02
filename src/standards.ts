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

export interface options {
  retries?: number;
}

function standard(steps: (fileData: fileData) => Promise<void>) {
  return async function (file: string, options?: options) {
    let retries = options?.retries ?? 3;
    let error;
    do {
      try {
        const fileData = await DataWriter.init(file);
        await steps(fileData);
        // await Deno.remove(fileData.path);
        error = null;
      } catch (err) {
        error = err;
        retries--;
      }
    } while (error && (retries > 0));
    if (error) {
      return Promise.reject(error);
    }
  };
}

function getRandomByte() {
  return crypto.getRandomValues(new Uint8Array(1))[0];
}

export const index = {
  random: standard(async (fileData: fileData) => {
    await Random.write(fileData);
  }),

  randomByte: standard(async (fileData: fileData) => {
    await RandomByte.write(fileData);
  }),

  zero: standard(async (fileData: fileData) => {
    await One.write(fileData);
  }),

  one: standard(async (fileData: fileData) => {
    await One.write(fileData);
  }),

  forever: standard(async (fileData: fileData) => {
    await Random.write(fileData);
    await DataWriter.verify(fileData);
    await FileProperties.rename(fileData);
    await FileProperties.truncate(fileData);
    // await FileProperties.resetTimestamps(fileData);
  }),

  "NZSIT-402": standard(async (fileData: fileData) => {
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  "ISM-6.2.92": (file: string, options?: options) => {
    return index["NZSIT-402"](file, options);
  },

  "GOST_R50739-95": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await RandomByte.write(fileData);
  }),

  "AFSSI-5020": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await One.write(fileData);
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  "HMG-IS5": (file: string, options?: options) => {
    return index["AFSSI-5020"](file, options);
  },

  "CSEC_ITSG-06": standard(async (fileData: fileData) => {
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

  "NAVOS_5239-26": (file: string, options?: options) => {
    return index["CSEC_ITSG-06"](file, options);
  },

  "DOD_5220.22 M": standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await DataWriter.verify(fileData);
    await One.write(fileData);
    await DataWriter.verify(fileData);
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  "NCSC-TG-025": (file: string, options?: options) => {
    return index["DOD_5220.22 M"](file, options);
  },

  "AR380-19": standard(async (fileData: fileData) => {
    await RandomByte.write(fileData);
    const byte = getRandomByte();
    await Byte.write(fileData, byte);
    await Byte.write(fileData, ~byte);
    await DataWriter.verify(fileData);
  }),

  "RCMP_TSSIT_OPS-II": standard(async (fileData: fileData) => {
    for (let i = 0; i < 3; i++) {
      await Zero.write(fileData);
      await One.write(fileData);
    }
    await RandomByte.write(fileData);
    await DataWriter.verify(fileData);
  }),

  VSITR: standard(async (fileData: fileData) => {
    for (let i = 0; i < 3; i++) {
      await Zero.write(fileData);
      await One.write(fileData);
    }
    await RandomByte.write(fileData);
  }),

  schneier: standard(async (fileData: fileData) => {
    await Zero.write(fileData);
    await One.write(fileData);
    for (let i = 0; i < 5; i++) {
      await RandomByte.write(fileData);
    }
  }),

  pfitzner: standard(async (fileData: fileData) => {
    for (let i = 0; i < 33; i++) {
      await RandomByte.write(fileData);
    }
  }),

  gutmann: standard(async (fileData: fileData) => {
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

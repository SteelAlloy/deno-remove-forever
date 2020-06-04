import { fs } from "./deps.ts";
import * as standards from "./standards.ts";
import { logger } from "./logger.ts";

/** Removes the named file or directory forever without possible recovery.
 *
 * ```ts
 * await remove("/path/to/empty_dir/or/file");
 * await remove("/path/to/populated_dir/or/file", { standard: standards.schneier, ignoreErrors: true });
 * ```
 * Default standard is `forever`.
 *
 * Throws error if permission denied, path not found, or checksum is incorrect
 * and the `ignoreErrors` option isn't set to `true`.
 *
 * Requires `allow-write` and `allow-read` permission.*/
export async function remove(path: string, options?: RemoveOptions) {
  const fileInfo = await Deno.stat(path);

  const parsedOptions: ParsedOptions = {
    standard: standards.index.forever,
    ignoreErrors: false,
    retries: 3,
    ...options,
  };

  if (fileInfo.isFile) {
    return removeFile(path, parsedOptions);
  } else if (fileInfo.isDirectory) {
    return removeFolder(path, parsedOptions);
  } else {
    await Deno.remove(path);
    return NaN;
  }
}

async function removeFile(file: string, options: ParsedOptions) {
  try {
    await options.standard(file, options);
    logger.info(`Successfully deleted ${file}`);
  } catch (reason) {
    if (!options.ignoreErrors) {
      logger.error(`${reason}: ${file}`);
      return Promise.reject([{
        file: file,
        reason,
      }]);
    }
  }

  return 1;
}

async function removeFolder(root: string, options: ParsedOptions) {
  const rejected: rejected = [];
  let files = 0;

  for await (const entry of fs.walk(root, { includeDirs: false })) {
    const file: string = entry.path;
    files++;
    try {
      await options.standard(file, options);
      logger.removed(file);
    } catch (reason) {
      logger.error(file, reason);
      rejected.push({
        file: file,
        reason,
      });
    }
  }

  if (rejected.length > 0 && !options.ignoreErrors) {
    return Promise.reject(rejected);
  }

  logger.info("", "Final cleanup.");
  await Deno.remove(root, { recursive: true });

  return files - rejected.length;
}

interface ParsedOptions extends standards.options {
  standard: (file: string, options: standards.options) => Promise<undefined>;
  ignoreErrors: boolean;
}

export type RemoveOptions = Partial<ParsedOptions>;

type rejected = {
  file: string;
  reason: any;
}[];

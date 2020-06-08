import { fs } from "./deps.ts";
import { fileStandards, options, directoryStandards } from "./standards.ts";
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
    fileStandard: options?.fileStandard ?? fileStandards.forever.remove,
    directoryStandard: options?.directoryStandard ??
      directoryStandards.forever.remove,
    ignoreErrors: options?.ignoreErrors ?? false,
    retries: options?.retries ?? 3,
  };

  if (fileInfo.isFile) {
    return removeFile(path, parsedOptions);
  } else if (fileInfo.isDirectory) {
    return removeDirectory(path, parsedOptions);
  } else {
    await Deno.remove(path);
    return NaN;
  }
}

async function removeFile(file: string, options: ParsedOptions) {
  try {
    await options.fileStandard(file, options);
  } catch (reason) {
    if (options.ignoreErrors === false) {
      return Promise.reject([{
        path: file,
        reason,
      }]);
    }
  }

  return 1;
}

async function removeDirectory(dir: string, options: ParsedOptions) {
  const files: string[] = [];
  const directories: string[] = [];

  for await (const entry of fs.walk(dir, { includeDirs: false })) {
    files.push(entry.path);
  }
  for await (const entry of fs.walk(dir, { includeFiles: false })) {
    directories.push(entry.path);
  }

  const fileTasks = files.map((file) => options.fileStandard(file, options));
  const rejectedFiles: rejected = await getRejected(fileTasks, files);

  if (rejectedFiles.length > 0 && options.ignoreErrors === false) {
    throw rejectedFiles;
  }

  const rejectedDirectories: rejected = [];

  for (let i = directories.length - 1; i > -1; i--) {
    const directory = directories[i];
    try {
      await options.directoryStandard(directory, options);
    } catch (reason) {
      rejectedDirectories.push({
        path: directory,
        reason,
      });
    }
  }

  if (rejectedDirectories.length > 0 && options.ignoreErrors === false) {
    throw rejectedDirectories;
  }

  if (rejectedDirectories.length > 0 || rejectedFiles.length > 0) {
    logger.info("Final cleanup.");
    await Deno.remove(dir, { recursive: true });
  }

  return files.length + directories.length -
    rejectedFiles.length - rejectedDirectories.length;
}

async function getRejected(
  tasks: Promise<void | undefined>[],
  paths: string[],
) {
  const results = await Promise.allSettled(tasks);

  return results.map((result, index) => {
    if (result.status === "rejected") {
      return {
        path: paths[index],
        reason: result.reason,
      };
    } else {
      return {
        path: "",
        reason: null,
      };
    }
  }).filter((result) => result.reason !== null);
}

interface ParsedOptions extends options {
  fileStandard: (
    file: string,
    options: options,
  ) => Promise<void | undefined>;
  directoryStandard: (
    dir: string,
    options: options,
  ) => Promise<void | undefined>;
  ignoreErrors: boolean;
}

export type RemoveOptions = Partial<ParsedOptions>;

type rejected = {
  path: string;
  reason: any;
}[];

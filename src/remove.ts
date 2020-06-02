import { fs } from "./deps.ts";
import * as standards from "./standards.ts";

interface RemoveOptions extends standards.options {
  standard?: (file: string, options?: standards.options) => Promise<undefined>;
  ignoreErrors?: boolean;
}

export default async function remove(path: string, options?: RemoveOptions) {
  const fileInfo = await Deno.stat(path);
  if (fileInfo.isFile) {
    return removeFile(path, options);
  } else if (fileInfo.isDirectory) {
    return removeFolder(path, options);
  } else {
    await Deno.remove(path);
    return NaN;
  }
}

async function removeFile(file: string, options?: RemoveOptions) {
  const standard = options?.standard ?? standards.index.forever;
  try {
    await standard(file, { retries: options?.retries });
  } catch (reason) {
    if (!options?.ignoreErrors) {
      return Promise.reject([{
        file: file,
        reason,
      }]);
    }
  }

  return 1;
}

async function removeFolder(root: string, options?: RemoveOptions) {
  const files: string[] = [];
  const standard = options?.standard ?? standards.index.forever;

  for await (const entry of fs.walk(root, { includeDirs: false })) {
    files.push(entry.path);
  }

  const tasks = files.map((file) =>
    standard(file, { retries: options?.retries }).then(() => console.log(file))
  );

  const results = await Promise.allSettled(tasks);

  const rejected = results.map((result, index) => {
    if (result.status === "rejected") {
      return {
        file: files[index],
        reason: result.reason,
      };
    } else {
      return {
        file: "",
        reason: null,
      };
    }
  }).filter((result) => result.reason !== null);

  if (rejected.length > 0 && !options?.ignoreErrors) {
    return Promise.reject(rejected);
  }

  // await Deno.remove(root, { recursive: true });

  return files.length - rejected.length;
}

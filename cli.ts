import ProgressBar from "https://deno.land/x/progress/mod.ts";
import { fs } from "./src/deps.ts";
import { remove, RemoveOptions } from "./src/remove.ts";
import { logger } from "./src/logger.ts";
import {
  bgGreen,
  bgYellow,
  bgRed,
  red,
} from "https://deno.land/std@0.50.0/fmt/colors.ts";

export async function check(path: string, options?: RemoveOptions) {
  const fileInfo = await Deno.stat(path);
  if (fileInfo.isDirectory) {
    let total = 0;
    let completed = 0;

    for await (const entry of fs.walk(path, { includeDirs: false })) {
      total++;
    }
    console.log(`Found ${total} files.`);

    const progress = new ProgressBar({
      total,
      clear: true,
      display: ":percent :bar :time :completed/:total :title",
    });

    logger.start = (file) => {
      // progress.console(`Processed file: ${file}`)
      progress.render(completed, {
        title: file,
      });
    };

    logger.removed = (file) => {
      // progress.console(`Successfully deleted ${file}`)
      progress.render(++completed, {
        title: file,
        complete: bgGreen(" "),
      });
    };

    logger.warning = (file) => {
      progress.render(completed, {
        title: file,
        complete: bgYellow(" "),
      });
    };

    logger.error = (file, reason) => {
      progress.console(red(`${reason}: ${file}`));
      progress.render(++completed, {
        title: file,
        complete: bgRed(" "),
      });
    };
  }
  await remove(path, options);
}

check("rm")
  .catch(() => {});

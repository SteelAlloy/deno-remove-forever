#!/usr/bin/env -S deno run

import { Command } from "https://deno.land/x/cliffy@v0.9.0/packages/command/lib/command.ts";
import { Confirm } from "https://deno.land/x/cliffy@v0.9.0/packages/prompt/prompts/confirm.ts";
import { AnsiEscape } from "https://deno.land/x/cliffy@v0.9.0/packages/ansi-escape/lib/ansi-escape.ts";
import * as fmt from "https://deno.land/std@v0.56.0/fmt/colors.ts";
import ProgressBar from "https://deno.land/x/progress@v1.1.0/mod.ts";
import { fs } from "./lib/deps.ts";
import { remove } from "./lib/remove.ts";
import { fileStandards, directoryStandards } from "./lib/standards.ts";
import { logger } from "./lib/logger.ts";

const { options: commandOptions, args: commandArgs } = await new Command<
  Options,
  Arguments
>()
  .version("1.0.0")
  .description("Data erasure solution.\nDeletes files and folders forever...")
  .arguments("<path...:string>")
  .option(
    "-s, --standard [standard:string]",
    "Text ID of the standard, default is `forever`.",
    {
      value: (value: string) => {
        if (Object.keys(fileStandards).indexOf(value) === -1) {
          throw new Error(
            `Standard must be one of: ${
              Object.keys(fileStandards)
            } but got: ${value}`,
          );
        }
        return value;
      },
    },
  )
  .option(
    "-r, --retries [retries:number]",
    "Max number of retries if an error occur.",
  )
  .option(
    "-p, --prompt",
    "Use `--no-prompt` if you want to use it in a shell or bash file.",
  )
  .option("-e, --ignore-errors", "Files will be deleted even if errors occur.")
  .option("-i, --info", "Output extra info.")
  .option("-d, --debug", "Output extra debugging.")
  .parse(Deno.args);

const { fileMap, directoryMap, fileCount, directoryCount } = await getTotal();

if (fileCount + directoryCount === 0) {
  Deno.exit(0);
}

await confirm();

const fileStandard = commandOptions.standard
  ? fileStandards[commandOptions.standard]
  : fileStandards.forever;

const directoryStandard = commandOptions.standard
  ? directoryStandards[commandOptions.standard] ?? directoryStandards.unsafe
  : directoryStandards.forever;

let completed = 0;
let deleted = 0;
const progress = setProgressBar();
progress.render(completed);

setLogger();

try {
  await run();
} catch (err) {
  if (Array.isArray(err) === false) {
    progress.console(printError(err));
    AnsiEscape.from(Deno.stdout).eraseLine();
  }
  if (commandOptions.ignoreErrors === false) {
    Deno.exit(1);
  }
}

async function run() {
  const paths = commandArgs[0];

  const tasks = paths.map((path) =>
    remove(path, {
      fileStandard: fileStandard.remove,
      directoryStandard: directoryStandard.remove,
      retries: commandOptions.retries,
      ignoreErrors: commandOptions.ignoreErrors,
    })
  );

  const results = await Promise.allSettled(tasks);

  const rejected: PromiseRejectedResult[] = <unknown> results.filter((result) =>
    result.status === "rejected"
  ) as PromiseRejectedResult[];

  if (rejected[0] && Array.isArray(rejected[0].reason) === false) {
    throw `${rejected[0].reason}: ${paths[0]}`;
  }

  console.log(`Deleted ${deleted} objects.`);
}

async function getTotal() {
  let fileCount = 0;
  let directoryCount = 0;
  const fileMap: ObjectMap = {};
  const directoryMap: ObjectMap = {};

  for (let i = 0; i < commandArgs[0].length; i++) {
    const root = commandArgs[0][i];
    let fileInfo;

    try {
      fileInfo = await Deno.stat(root);
    } catch (err) {
      console.log(fmt.bold(fmt.bgRed(" ERROR ") + fmt.red(` ${err}: ${root}`)));
      Deno.exit(1);
    }

    if (fileInfo.isDirectory) {
      for await (const entry of fs.walk(root, { includeDirs: false })) {
        fileMap[entry.path] = 0;
        fileCount++;
      }
      for await (const entry of fs.walk(root, { includeFiles: false })) {
        directoryMap[entry.path] = 0;
        directoryCount++;
      }
    } else {
      fileMap[root] = 0;
      fileCount++;
    }
  }
  return { fileMap, directoryMap, fileCount, directoryCount };
}

async function confirm() {
  const yes = await Confirm.prompt(
    `${fileCount +
      directoryCount} files and folders will be removed from system. Do you want to continue?`,
  );

  if (yes === false) Deno.exit();
}

function setProgressBar() {
  const total = fileCount * (fileStandard.stepsCount + 2) +
    directoryCount * (directoryStandard.stepsCount + 2);
  return new ProgressBar({
    total,
    clear: true,
    display: ":percent :bar :time :title",
    preciseBar: [
      fmt.bgWhite(fmt.green("▏")),
      fmt.bgWhite(fmt.green("▎")),
      fmt.bgWhite(fmt.green("▍")),
      fmt.bgWhite(fmt.green("▌")),
      fmt.bgWhite(fmt.green("▋")),
      fmt.bgWhite(fmt.green("▊")),
      fmt.bgWhite(fmt.green("▉")),
    ],
  });
}

function setLogger() {
  logger.debug = (path, object: string, msg: string) => {
    if (commandOptions.debug) {
      progress.console(printDebug(`${msg}: ${path}`));
    }
    progress.render(++completed);
    getMap(object)[path]++;
  };

  logger.start = (path, object: string) => {
    if (commandOptions.info || commandOptions.debug) {
      progress.console(printInfo(`Processed: ${path}`));
    }
    progress.render(++completed);
    getMap(object)[path]++;
  };

  logger.info = (msg) => {
    if (commandOptions.info || commandOptions.debug) {
      progress.console(printInfo(msg));
    }
  };

  logger.removed = (path, object: string) => {
    if (commandOptions.info || commandOptions.debug) {
      progress.console(printInfo(`Successfully deleted ${path}`));
    }
    progress.render(++completed, {
      complete: fmt.bgGreen(" "),
      title: `${++deleted} objects deleted`,
    });
    getMap(object)[path]++;
  };

  logger.warn = (path, object: string, reason) => {
    progress.console(printWarn(`${reason}: ${path}`));
  };

  logger.warning = (path, object: string, reason) => {
    if (commandOptions.info || commandOptions.debug) {
      progress.console(printWarn(`${reason}: ${path}`));
    }
    completed -= getMap(object)[path];
    progress.render(completed, {
      complete: fmt.bgYellow(" "),
    });
    getMap(object)[path] = 0;
  };

  logger.error = (path, object: string, reason) => {
    progress.console(printError(`${reason}: ${path}`));
    progress.render(++completed, {
      complete: fmt.bgRed(" "),
    });
    if (object === "file") {
      completed += fileStandard.stepsCount - getMap(object)[path];
    } else if (object === "dir") {
      completed += directoryStandard.stepsCount - getMap(object)[path];
    }
  };
}

function printError(msg: string) {
  return fmt.bold(fmt.bgRed(" ERROR ") + fmt.red(` ${msg}`));
}

function printWarn(msg: string) {
  return fmt.bold(fmt.bgYellow(fmt.black(" WARN "))) + fmt.yellow(`  ${msg}`);
}

function printDebug(msg: string) {
  return fmt.bold(" DEBUG ") + ` ${msg}`;
}

function printInfo(msg: string) {
  return fmt.bold(fmt.bgCyan(" INFO ")) + `  ${msg}`;
}

function getMap(object: string) {
  switch (object) {
    case "file":
      return fileMap;

    case "dir":
      return directoryMap;

    default:
      throw "Unsupported OS object";
  }
}

type Arguments = [string[]];

type ObjectMap = {
  [key: string]: number;
};

interface Options {
  standard?: keyof typeof fileStandards;
  retries?: number;
  prompt?: boolean;
  ignoreErrors?: boolean;
  info?: boolean;
  debug?: boolean;
}

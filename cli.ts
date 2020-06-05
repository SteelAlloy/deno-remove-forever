#!/usr/bin/env -S deno run

import { Command } from "https://deno.land/x/cliffy/command.ts";
import { Confirm } from "https://deno.land/x/cliffy/prompt.ts";
import { AnsiEscape } from "https://deno.land/x/cliffy/ansi-escape.ts";
import ProgressBar from "https://deno.land/x/progress/mod.ts";
import { fs } from "./src/deps.ts";
import { remove } from "./src/remove.ts";
import { index } from "./src/standards.ts";
import { logger } from "./src/logger.ts";
import {
  bgGreen,
  bgYellow,
  bgRed,
  bgCyan,
  red,
  bold,
  yellow,
  black,
} from "https://deno.land/std@0.50.0/fmt/colors.ts";

const { options: commandOptions, args: commandArgs } = await new Command<
  Options,
  Arguments
>()
  .version("0.1.0")
  .description("Data erasure solution.\nDeletes files and folders forever...")
  .arguments("<path...:string>")
  .option(
    "-s, --standard [standard:string]",
    "Text ID of the standard, default is `forever`.",
    {
      value: (value: string) => {
        if (Object.keys(index).indexOf(value) === -1) {
          throw new Error(
            `Standard must be one of: ${Object.keys(index)} but got: ${value}`,
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

let total = await getTotal();
let completed = 0;

await confirm();

const standard = commandOptions.standard
  ? index[commandOptions.standard]
  : undefined;

const progress = setProgressBar();

setLogger();

try {
  await run();
} catch (err) {
  if (typeof err !== "object") {
    progress.console(printError(err));
    AnsiEscape.from(Deno.stdout).eraseLine();
  } else if (err.name) {
    progress.console(printError(err.name));
    AnsiEscape.from(Deno.stdout).eraseLine();
  }
  if (!commandOptions.ignoreErrors) {
    Deno.exit(1);
  }
}

async function run() {
  for (let i = 0; i < commandArgs[0].length; i++) {
    const root = commandArgs[0][i];

    const deleted = await remove(
      root,
      {
        standard,
        retries: commandOptions.retries,
        ignoreErrors: commandOptions.ignoreErrors,
      },
    );
    console.log(`Deleted ${deleted} files.`);
  }
}

async function getTotal() {
  let total = 0;
  for (let i = 0; i < commandArgs[0].length; i++) {
    const root = commandArgs[0][i];
    let fileInfo;

    try {
      fileInfo = await Deno.stat(root);
    } catch (err) {
      console.log(bold(bgRed(" ERROR ") + red(` ${err}`)));
      Deno.exit(1);
    }

    if (fileInfo.isDirectory) {
      for await (const entry of fs.walk(root, { includeDirs: false })) {
        total++;
      }
    } else {
      total++;
    }
  }
  return total;
}

async function confirm() {
  const yes = await Confirm.prompt(
    `${total} files will be removed from system. Do you want to continue?`,
  );

  if (!yes) Deno.exit();
}

function setProgressBar() {
  return new ProgressBar({
    total,
    clear: true,
    display: ":percent :bar :time :completed/:total :title",
  });
}

function setLogger() {
  progress.render(completed);

  if (commandOptions.debug) {
    logger.debug = (msg) => {
      progress.console(printDebug(msg));
    };
  }

  logger.start = (file) => {
    if (commandOptions.info) {
      progress.console(`Processed file: ${file}`);
    }
  };

  logger.info = (msg) => {
    if (commandOptions.info) {
      progress.console(printInfo(msg));
    }
  };

  logger.removed = (file) => {
    if (commandOptions.info) {
      progress.console(`Successfully deleted ${file}`);
    }
    progress.render(++completed, {
      complete: bgGreen(" "),
    });
  };

  logger.warn = (file, reason) => {
    progress.console(printWarn(`${reason}: ${file}`));
  };

  logger.warning = () => {
    progress.render(completed, {
      complete: bgYellow(" "),
    });
  };

  logger.error = (file, reason) => {
    progress.console(printError(`${reason}: ${file}`));
    progress.render(++completed, {
      complete: bgRed(" "),
    });
  };
}

function printError(msg: string) {
  return bold(bgRed(" ERROR ") + " " + red(msg));
}

function printWarn(msg: string) {
  return bold(bgYellow(black(" WARN "))) + "  " + yellow(msg);
}

function printDebug(msg: string) {
  return bold((" DEBUG ") + " " + msg);
}

function printInfo(msg: string) {
  return bold(bgCyan(" INFO ")) + "  " + msg;
}

type Arguments = [string];

interface Options {
  standard?: keyof typeof index;
  retries?: number;
  prompt?: boolean;
  ignoreErrors?: boolean;
  info?: boolean;
  debug?: boolean;
}

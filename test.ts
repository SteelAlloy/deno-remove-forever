// import { remove } from "https://deno.land/x/remove-forever/mod.ts";
import { remove, fileStandards, directoryStandards } from "./mod.ts";

remove("./trash", {
  fileStandard: fileStandards.gutmann.remove,
  directoryStandard: directoryStandards.unsafe.remove,
  ignoreErrors: true,
});

import remove from "./mod.ts";

remove("file.txt")
  .then((success) => console.log(success))
  .catch((err) => console.error(err));

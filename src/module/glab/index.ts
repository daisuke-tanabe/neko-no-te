import { Command } from "https://deno.land/x/cliffy@v0.25.4/command/mod.ts";
import repo from "./repo.ts";

const index = new Command()
  .description("Gitlab cli tool.")
  .command("repo", repo);

export default index;

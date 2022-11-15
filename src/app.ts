import { Command } from 'https://deno.land/x/cliffy@v0.25.4/command/mod.ts';

await new Command()
  .name('neko-no-te')
  .version("0.0.0")
  .description('猫の手も借りたい、そんなときに')
  .parse(Deno.args);

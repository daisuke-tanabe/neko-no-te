import { Command } from "https://deno.land/x/cliffy@v0.25.4/command/mod.ts";
import {
  Checkbox,
  Select,
} from "https://deno.land/x/cliffy@v0.25.4/prompt/mod.ts";
import { Cell, Table } from "https://deno.land/x/cliffy@v0.25.4/table/mod.ts";
import { difference } from "https://deno.land/std@0.164.0/datetime/mod.ts";
import { Artifact, Branch } from "./types.ts";
import assertIsDefined from "../lib/assertIsDefined.ts";
import nkFetch from "../lib/nkFetch.ts";
import config from "../../config.json" assert { type: "json" };

const gitlab = new Command()
  .action(async () => {
    const gitlabConfig = config.gitlab;
    // const today = format(new Date(), 'yyyy-MM-ddTHH:mm:ss.SSS+09:00');

    // https://cliffy.io/docs@v0.25.4/prompt/types/select
    const selectedGitlab = await Select.prompt({
      message: "Select any gitlab",
      options: gitlabConfig.map(({ name }) => name),
    });
    const foundGitlab = gitlabConfig.find(({ name }) =>
      name === selectedGitlab
    );

    // findの返り値を確認
    assertIsDefined(foundGitlab);

    // https://cliffy.io/docs@v0.25.4/prompt/types/checkbox
    const checkedProjectIds = await Checkbox.prompt({
      message: "Check any project",
      options: foundGitlab.projects.map(({ id, siteName }) => ({
        name: siteName,
        value: id,
      })),
    });
    const checkedProjects = foundGitlab.projects.filter((project) =>
      checkedProjectIds.some((id) => id === project.id)
    );

    const projectsPromise = checkedProjects.map(async (project) => {
      return {
        ...project,
        branches: await nkFetch<Branch[]>(
          `${foundGitlab.entry}/projects/${project.id}/repository/branches`,
          {
            headers: { "Authorization": `Bearer ${foundGitlab.token}` },
          },
        ),
      };
    });

    const artifact: Artifact = {
      name: foundGitlab.name,
      projects: await Promise.all(projectsPromise),
    };

    artifact.projects.forEach(({ siteName, branches }) => {
      const mappedBranches = branches.map((branch) => {
        const { name, commit, merged } = branch;
        // NOTE: 日付の実装はざっくりなのでいつか見直すかも
        const { years, weeks, days, hours, seconds } = difference(
          new Date(),
          new Date(commit.created_at),
          {
            units: ["years", "weeks", "days", "hours", "seconds"],
          },
        );
        const diffDateToArray = [
          { key: "years", value: years as number },
          { key: "weeks", value: weeks as number },
          { key: "days", value: days as number },
          { key: "hours", value: hours as number },
          { key: "seconds", value: seconds as number },
        ];
        const elapsedDate = diffDateToArray.find(({ value }) => value > 0);

        // findの返り値を確認
        assertIsDefined(elapsedDate);

        const dateTransform = (
          elapsedDate: { key: string; value: number },
        ): { key: string; value: number } => {
          // 1ヶ月は4.34524週間なのでmonthが0でweekが4より上なら計算した結果の月を返す
          if (elapsedDate.key === "weeks" && elapsedDate.value > 4) {
            return {
              key: "month",
              value: Math.trunc(elapsedDate.value / 4.34524),
            };
          }
          return elapsedDate;
        };

        const timeAgo = dateTransform(elapsedDate);

        return {
          branch_name: name,
          committer_name: commit.author_name,
          merged: `${merged}`,
          time_ago: `${timeAgo.value} ${timeAgo.key} ago`,
        };
      });
      const flattenBranches = mappedBranches.map((branch) =>
        Object.entries(branch).map(([key, value]) => ({ key, value }))
      );
      const flattenValues = flattenBranches.map((branch) =>
        branch.map(({ value }) => value)
      );
      const flattenKeys = flattenBranches[0].map(({ key }) => key);
      new Table()
        .header([
          new Cell(siteName).colSpan(flattenKeys.length).border(false),
        ])
        .body([flattenKeys, ...flattenValues])
        .border(true)
        .render();
    });
  });

export default gitlab;

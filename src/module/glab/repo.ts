import { Command } from "https://deno.land/x/cliffy@v0.25.4/command/command.ts";
import { Select } from "https://deno.land/x/cliffy@v0.25.4/prompt/select.ts";
import assertIsDefined from "../../lib/assertIsDefined.ts";
import { Checkbox } from "https://deno.land/x/cliffy@v0.25.4/prompt/checkbox.ts";
import nkFetch from "../../lib/nkFetch.ts";
import { Artifact, Branch, Gitlab } from "./types.ts";
import { difference } from "https://deno.land/std@0.164.0/datetime/mod.ts";
import { Table } from "https://deno.land/x/cliffy@v0.25.4/table/table.ts";
import { Cell } from "https://deno.land/x/cliffy@v0.25.4/table/cell.ts";
import config from "../../../config.json" assert { type: "json" };

const selectGitlab = (gitlabConfig: Gitlab[]) => {
  // https://cliffy.io/docs@v0.25.4/prompt/types/select
  return Select.prompt({
    message: "Select any gitlab",
    options: gitlabConfig.map(({ name }) => name),
  });
};

const checkProjects = (({ projects }: Gitlab) => {
  // https://cliffy.io/docs@v0.25.4/prompt/types/checkbox
  return Checkbox.prompt({
    message: "Check any project",
    options: projects.map(({ id, siteName }) => ({
      name: siteName,
      value: id,
    })),
  });
});

const viewBranchesTable = (artifact: Artifact) => {
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
};

const view = new Command()
  .description("View Gitlab projects/repositories.")
  .action(async () => {
    const gitlabConfig = config.gitlab;

    const selectedGitlabName = await selectGitlab(gitlabConfig);
    const foundGitlab = gitlabConfig.find(({ name }) =>
      name === selectedGitlabName
    );

    // findの返り値を確認
    assertIsDefined(foundGitlab);

    const checkedProjectIds = await checkProjects(foundGitlab);
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

    viewBranchesTable(artifact);
  });

const repo = new Command()
  .description("Work with Gitlab repositories.")
  .command("view", view);

export default repo;

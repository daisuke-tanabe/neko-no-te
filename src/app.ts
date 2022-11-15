import { Command } from 'https://deno.land/x/cliffy@v0.25.4/command/mod.ts';
import { Select, Checkbox } from 'https://deno.land/x/cliffy@v0.25.4/prompt/mod.ts';
import { Table, Cell } from "https://deno.land/x/cliffy@v0.25.4/table/mod.ts";
import Config from '../config.json' assert {type: 'json'};

type Branch = {
  name: string,
  commit: {
    id: string,
    short_id: string,
    created_at: string,
    parent_ids: null | string,
    title: string,
    message: string,
    author_name: string,
    author_email: string,
    authored_date: string,
    committer_name: string,
    committer_email: string,
    committed_date: string,
    trailers: null | string,
    web_url: string
  },
  merged: boolean,
  protected: boolean,
  developers_can_push: boolean,
  developers_can_merge: boolean,
  can_push: boolean,
  default: boolean,
  web_url: string
}

type GitlabConfig = {
  name: string,
  entry: string,
  token: string,
  projects: {
    id: string,
    siteName: string
  }[]
}[]

type Artifact = {
  name: string;
  projects: {
    id: string;
    siteName: string;
    branches: Branch[]
  }[]
}

function assertIsDefined<T>(args: T): asserts args is NonNullable<T> {
  if (args === undefined || args === null) {
    throw new Error(
      `Expected 'val' to be defined, but received ${args}`
    );
  }
}

const gitlabCommand = new Command()
  .action(async () => {
    const gitlabConfig: GitlabConfig = Config.gitlab;

    // https://cliffy.io/docs@v0.25.4/prompt/types/select
    const selectedGitlab = await Select.prompt({
      message: 'Select any gitlab',
      options: gitlabConfig.map(({ name }) => name),
    });
    const foundGitlab = gitlabConfig.find(({ name }) => name === selectedGitlab);

    // findの返り値を確認
    assertIsDefined(foundGitlab);

    // https://cliffy.io/docs@v0.25.4/prompt/types/checkbox
    const checkedProjectIds = await Checkbox.prompt({
      message: 'Check any project',
      options: foundGitlab.projects.map(({ id, siteName }) => ({ name: siteName, value: id })),
    });
    const checkedProjects = foundGitlab.projects.filter(project => checkedProjectIds.some(id => id === project.id));

    const projectsPromise = checkedProjects.map(async project => {
      return {
        ...project,
        branches: await fetch(
          `${foundGitlab.entry}/projects/${project.id}/repository/branches`,
          {
            headers: {'Authorization': `Bearer ${foundGitlab.token}`}
          })
          .then(response => response.json())
          .catch(error => console.error(error))
      }
    });

    const artifact: Artifact = {
      name: foundGitlab.name,
      projects: await Promise.all(projectsPromise)
    };

    artifact.projects.forEach(({ siteName, branches }) => {
      const mappedBranches = branches.map(branch => {
        const { name, commit, merged, protected: guard } = branch;
        return {
          branch_name: name,
          committer_name: commit.author_name,
          committed_date: commit.created_at,
          merged: `${merged}`,
          protected: `${guard}`,
        }
      });
      const flattenBranches = mappedBranches.map(branch => Object.entries(branch).map(([key, value]) => ({ key, value })));
      const flattenValues = flattenBranches.map(branch => branch.map(({ value }) => value));
      const flattenKeys = flattenBranches[0].map(({ key }) => key);
      new Table()
        .header([
          new Cell(siteName).colSpan(flattenKeys.length).border(false)
        ])
        .body([flattenKeys, ...flattenValues])
        .border(true)
        .render();
    });
  });

await new Command()
  .name('neko-no-te')
  .version("0.0.0")
  .description('猫の手も借りたい、そんなときに')
  .command("gitlab", gitlabCommand)
  .parse(Deno.args);

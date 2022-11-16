import { Command } from 'https://deno.land/x/cliffy@v0.25.4/command/mod.ts';
import { Select, Checkbox } from 'https://deno.land/x/cliffy@v0.25.4/prompt/mod.ts';
import { Table, Cell } from "https://deno.land/x/cliffy@v0.25.4/table/mod.ts";
import assertIsDefined from '../lib/assertIsDefined.ts'
import config from '../../config.json' assert { type: 'json' };

const gitlab = new Command()
  .action(async () => {
    const gitlabConfig = config.gitlab;

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

export default gitlab;

export type Branch = {
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

export type Artifact = {
  name: string;
  projects: {
    id: string;
    siteName: string;
    branches: Branch[]
  }[]
}

export type FetchRepositoryBranchesByProject<T> = (
  { entry, token, projectId }:
  { entry: string, token: string, projectId: string }
) => Promise<T>

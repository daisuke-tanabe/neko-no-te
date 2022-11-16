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

export const getWebsiteURL = () => {
  return process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3002'
}

const getGithubRepo = () => {
  return process.env.NEXT_PUBLIC_GITHUB_REPO || 'markokosticdev/greenlight'
}

export const getGithubRepoURL = () => {
  return `https://github.com/${getGithubRepo()}`
}

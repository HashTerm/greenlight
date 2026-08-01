const getRuntimeURL = (runtimeKey: string, publicKey: string, fallback: string) => {
  return process.env[runtimeKey] || process.env[publicKey] || fallback
}

export const getDocsURL = () => {
  return getRuntimeURL('DOCS_URL', 'NEXT_PUBLIC_DOCS_URL', 'http://localhost:3003')
}

export const getWebsiteURL = () => {
  return getRuntimeURL('WEBSITE_URL', 'NEXT_PUBLIC_WEBSITE_URL', 'http://localhost:3002')
}

const getGithubRepo = () => {
  return process.env.NEXT_PUBLIC_GITHUB_REPO || 'HashTerm/greenlight'
}

export const getGithubRepoURL = () => {
  return `https://github.com/${getGithubRepo()}`
}

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

async function githubRequest(path: string, options: any) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured in environment');

  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options?.headers || {})
    }
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const message = data?.message || text || `GitHub API error ${res.status}`;
    const err: any = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baselineValue, filePath, prTitle, repo } = body;

    if (!baselineValue || !filePath) {
      return NextResponse.json({ success: false, error: 'baselineValue and filePath are required' }, { status: 400 });
    }

    const githubRepo = repo || process.env.GITHUB_REPO;
    if (!githubRepo) return NextResponse.json({ success: false, error: 'GITHUB_REPO not configured (owner/repo)' }, { status: 400 });

    const [owner, repoName] = githubRepo.split('/');

    // Determine base branch (default branch)
    const repoInfo = await githubRequest(`/repos/${owner}/${repoName}`, { method: 'GET' });
    const baseBranch = process.env.GITHUB_BASE_BRANCH || repoInfo.default_branch || 'main';

    // Get reference for base branch
    const baseRef = await githubRequest(`/repos/${owner}/${repoName}/git/ref/heads/${baseBranch}`, { method: 'GET' });
    const baseSha = baseRef.object.sha;

    // Create new branch
    const timestamp = Date.now();
    const branchName = `apply-baseline-${timestamp}`;

    await githubRequest(`/repos/${owner}/${repoName}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha })
    });

    // Fetch file content
    const fileData = await githubRequest(`/repos/${owner}/${repoName}/contents/${encodeURIComponent(filePath)}?ref=${baseBranch}`, { method: 'GET' });

    const originalSha = fileData.sha;
    const contentBase64 = fileData.content;
    const buffer = Buffer.from(contentBase64, 'base64');
    let content = buffer.toString('utf-8');

    // Attempt to replace baseline constant or let/var declarations
    const newValue = Math.round(baselineValue);
    const patterns = [
      /const baseline2025FreightCost = \d+;/g,
      /let baseline2025FreightCost = \d+;/g,
      /var baseline2025FreightCost = \d+;/g
    ];

    let replaced = false;
    for (const p of patterns) {
      if (p.test(content)) {
        content = content.replace(p, `const baseline2025FreightCost = ${newValue}; // Extracted baseline`);
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      // If no pattern matched, insert a const near the top after imports
      const insertPoint = content.indexOf('\n\n');
      const declaration = `\nconst baseline2025FreightCost = ${newValue}; // Extracted baseline - inserted by admin PR\n`;
      content = content.slice(0, insertPoint >= 0 ? insertPoint : 0) + declaration + content.slice(insertPoint >= 0 ? insertPoint : 0);
    }

    // Commit updated file to new branch
    const updatedContentBase64 = Buffer.from(content, 'utf-8').toString('base64');

    await githubRequest(`/repos/${owner}/${repoName}/contents/${encodeURIComponent(filePath)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: prTitle || `Apply extracted baseline ${newValue}`,
        content: updatedContentBase64,
        sha: originalSha,
        branch: branchName
      })
    });

    // Create PR
    const pr = await githubRequest(`/repos/${owner}/${repoName}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: prTitle || `Apply extracted baseline ${newValue}`,
        head: branchName,
        base: baseBranch,
        body: `This PR updates ${filePath} to set the extracted baseline value of ${newValue}.`,
        maintainer_can_modify: true
      })
    });

    return NextResponse.json({ success: true, prUrl: pr.html_url, branch: branchName });

  } catch (error: any) {
    console.error('Create baseline PR failed:', error);
    return NextResponse.json({ success: false, error: error.message || String(error), details: error.body || null }, { status: 500 });
  }
}

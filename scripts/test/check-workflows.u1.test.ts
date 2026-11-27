import { describe, expect, it } from 'vitest';
import { findWorkflowProblems, readWorkflows } from '../check-workflows.ts';

const GATED_DEPLOY = `
name: deploy
run-name: deploy \${{ github.event.inputs.sha || github.event.workflow_run.head_sha }}
jobs:
  deploy:
    if: >-
      github.event_name == 'workflow_dispatch' ||
      (github.event.workflow_run.conclusion == 'success' &&
       github.event.workflow_run.event == 'push' &&
       github.event.workflow_run.head_repository.full_name == github.repository)
    runs-on: ubuntu-24.04
    steps:
      - run: git merge-base --is-ancestor "$SHA" origin/main
`;

const GATED_RELEASE = `
jobs:
  release:
    steps:
      - run: gh run list --workflow deploy --status success --limit 200 --json displayTitle
`;

/** Review R-01 and R-07: CI fails when the deploy gate or the release's deploy check is removed. */
describe('workflow gates', () => {
  it('passes when the deploy job is gated and the release requires a successful deploy', () => {
    expect(findWorkflowProblems({ deploy: GATED_DEPLOY, release: GATED_RELEASE })).toEqual([]);
  });

  it("names the missing gate when the deploy job no longer checks the triggering event", () => {
    const deploy = GATED_DEPLOY.replace(" &&\n       github.event.workflow_run.event == 'push'", '');
    expect(findWorkflowProblems({ deploy, release: GATED_RELEASE })).toEqual([
      "deploy.yml: the deploy job's if must require github.event.workflow_run.event == 'push'",
    ]);
  });

  it('does not count a gate that only appears in a comment or another key', () => {
    const deploy = GATED_DEPLOY.replace(
      ' &&\n       github.event.workflow_run.head_repository.full_name == github.repository)',
      ')',
    ).replace(
      'runs-on: ubuntu-24.04',
      "runs-on: ubuntu-24.04\n    # github.event.workflow_run.head_repository.full_name == github.repository",
    );
    expect(findWorkflowProblems({ deploy, release: GATED_RELEASE })).toEqual([
      "deploy.yml: the deploy job's if must require github.event.workflow_run.head_repository.full_name == github.repository",
    ]);
  });

  it('names a missing ancestry check, run name and release deploy check', () => {
    const deploy = GATED_DEPLOY.replace(/^run-name:.*$/m, '').replace(/^.*merge-base.*$/m, '');
    expect(findWorkflowProblems({ deploy, release: 'jobs: {}' })).toEqual([
      'deploy.yml: must verify the commit is on main (git merge-base --is-ancestor "$SHA" origin/main)',
      'deploy.yml: run-name must name the deployed commit (release.yml finds the deploy by it)',
      'release.yml: must require a successful deploy run of the tagged commit',
    ]);
  });

  it('passes on this repository', () => {
    expect(findWorkflowProblems(readWorkflows())).toEqual([]);
  });
});

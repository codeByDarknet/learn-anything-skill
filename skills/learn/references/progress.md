# Manifest and progress tracking

Three files under `.learn/`. JSON is written by the agent; `results.log` is appended by `tools/check.*` so grading never needs the agent or `jq`.

## `.learn/course.json` — the manifest

```json
{
  "schema": 1,
  "skill": "learn",
  "skillVersion": "1.0.0",
  "createdAt": "2026-09-29T10:00:00Z",
  "params": {
    "technology": "Kubernetes",
    "slug": "kubernetes",
    "lang": "fr",
    "level": "beginner",
    "goal": "Deploy and operate my own apps on a cluster",
    "time": "1h/day",
    "github": false
  },
  "profiles": ["infrastructure"],
  "tools": [
    { "name": "kubectl", "version": "1.34", "installed": true, "verify": "kubectl version --client" },
    { "name": "kind", "version": "0.30", "installed": false, "verify": "kind version" }
  ],
  "modules": [
    {
      "id": "03",
      "slug": "03-deployments",
      "title": "Deployments et rollouts",
      "lessons": [ { "id": "03-01", "file": "03-deployments/lessons/01-replicasets.md", "title": "ReplicaSets" } ],
      "exercises": [
        {
          "id": "03-02",
          "path": "03-deployments/exercises/02-rolling-update",
          "title": "Rolling update sans coupure",
          "concepts": ["deployment", "rollout", "readinessProbe"],
          "difficulty": 2,
          "check": "./tools/check.sh 03-deployments/exercises/02-rolling-update"
        }
      ],
      "milestone": "capstone/milestones/03-deploy-api.md"
    }
  ],
  "capstone": { "title": "...", "milestones": [ { "id": "03", "file": "capstone/milestones/03-deploy-api.md", "check": "./tools/check.sh capstone 03" } ] },
  "generation": {
    "root": "done",
    "playground": "done",
    "modules": { "00": "done", "01": "done", "02": "in_progress" },
    "capstone": "pending",
    "ci": "pending"
  },
  "verification": {
    "verified": false,
    "ranAt": null,
    "stubsFailing": 0,
    "solutionsPassing": 0,
    "problems": [],
    "skipped": [ { "target": "10-ingress", "reason": "Docker not running" } ]
  }
}
```

Statuses: `pending` → `in_progress` → `done`. Update after each group so `/learn resume` knows where to continue.

## `.learn/results.log` — written by check scripts

Tab-separated, one line per graded target, append-only:

```
2026-09-30T18:22:01Z	03-deployments/exercises/02-rolling-update	pass
2026-09-30T18:10:44Z	03-deployments/exercises/02-rolling-update	fail
2026-10-02T09:01:12Z	capstone/03	pass
```

## `.learn/progress.json` — learner state (agent-maintained)

```json
{
  "schema": 1,
  "startedAt": "2026-09-29T10:00:00Z",
  "lastActivity": "2026-10-02T09:01:12Z",
  "lessons": { "03-01": { "done": true, "at": "2026-09-30T17:40:00Z" } },
  "exercises": {
    "03-02": { "status": "passed", "attempts": 3, "firstPassAt": "2026-09-30T18:22:01Z", "hintsUsed": 1, "solutionViewed": false }
  },
  "milestones": { "03": { "status": "passed", "at": "2026-10-02T09:01:12Z" } },
  "quizzes": { "03": { "score": 9, "total": 12, "at": "2026-10-01T20:00:00Z", "missedConcepts": ["maxSurge"] } },
  "weakConcepts": { "readinessProbe": 2 },
  "streakDays": 3,
  "notes": []
}
```

## Reconciliation (`/learn status`, `/learn check`, `/learn next`)

1. Read `results.log`; for each exercise/milestone, `passed` if its latest result is `pass`, `failing` if latest is `fail`, `todo` if never run. Attempts = number of lines.
2. Lessons are marked done when the learner says so or when all exercises of the lesson pass.
3. A module is **complete** when all its exercises pass and its milestone passes. Quiz is recommended, not required.
4. `weakConcepts`: +1 for each concept of an exercise with ≥3 failing attempts, of a missed quiz question, or when a hint level 3 was needed.
5. Regenerate `PROGRESS.md` (checkboxes + per-module bar like `██████░░░░ 60%`) and write `progress.json`.

## `/learn status` output (in `lang`)

```
Kubernetes — beginner — started 29 Sep, 3-day streak
00 Introduction        ██████████ 100%  ✓ milestone
01 Pods                ██████████ 100%  ✓ milestone
02 Services            ███████░░░  70%  exercise 04 failing (3 attempts)
03 Deployments         ░░░░░░░░░░   0%
...
Overall: 24/88 exercises · 2/14 milestones · est. 5 weeks left at 1h/day
Weak spots: readinessProbe, Service selectors → suggestion: /learn explain readinessProbe
Next: 02-services/exercises/04-headless-service
```

# Capstone project (fil rouge)

One real project, built incrementally across the whole course. It is what makes the course stick: every module adds a capability the learner can see and demo.

## Choosing it

- Derived from `goal` / `project` parameters, or pick from the 3 ideas offered at intake.
- **Real, not a toy:** has users (even imaginary), data, failure cases, and something to show at the end (a running app, a deployed service, a published CLI).
- **Scoped to the course:** reachable with the modules' content, not requiring unrelated technologies (a Docker course doesn't require writing a React frontend — provide it pre-built in `capstone/starter`).
- **Exercises every major concept at least once.**

## capstone/README.md

1. Product vision (3–5 lines) and the "demo at the end" description.
2. User stories / requirements.
3. Architecture sketch (ASCII or Mermaid), components and data flow.
4. Milestone map: table `milestone | module | capability added | acceptance check`.
5. How to run it and how to validate a milestone.
6. Definition of done for the whole project (tests, docs, deploy/release).

## Milestones (`capstone/milestones/NN-<slug>.md`)

```markdown
# Milestone NN — <capability>   (after module NN)

## Goal
What the project can do after this milestone, from the user's point of view.

## Specification
Precise requirements: endpoints / screens / resources / commands, data shapes, errors.

## Acceptance criteria
- [ ] Criterion that a test or validate script checks
- [ ] ...

## Validate
    ./tools/check.sh capstone NN

## Guidance
Which lessons apply, suggested order of work, design decisions to make (with trade-offs), pitfalls.

## Stretch goals
Optional improvements for fast learners.
```

## Automated acceptance

- Each milestone has an automated check in `capstone/tests/`: API tests hitting the running server, widget/integration tests, E2E, or a `validate-NN.sh` that asserts system state.
- Checks are **cumulative**: milestone N's validation also runs 1..N-1 (no regressions).
- Specify interfaces tightly enough that tests can target them (routes, CLI flags, resource names, widget keys) but leave the internal design free.

## Reference implementation

Optional but recommended for verification: `capstone/reference/NN-<slug>/` (or git tags) with a working version at each milestone, used in authoring mode to prove the acceptance tests are satisfiable. Tell the learner not to peek before trying; `/learn hint` never pastes from it wholesale.

## Final milestone

Always includes production concerns relevant to the tech: tests + CI, configuration & secrets, logging/observability, packaging/deployment or release build, a README the learner writes themselves, and a short retrospective prompt ("what would you do differently?").

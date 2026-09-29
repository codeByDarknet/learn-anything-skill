# Pedagogy — writing lessons that build real understanding

The learner should be able to **predict** what their code or system will do, and **explain why**. Syntax is the easy part; mental models are the goal.

## Lesson template

Every `lessons/NN-<slug>.md` follows this skeleton (headings translated into `lang`):

```markdown
# NN — <Title>

> **In one sentence:** <the core idea>
> **You will be able to:** <2–4 observable outcomes, verbs like build/debug/explain/choose>
> **Time:** ~<n> min · **Prerequisites:** <lessons>

## Why this exists
The problem this concept solves, ideally shown by the pain of *not* having it.

## Mental model
A simple, accurate picture (analogy, diagram in ASCII/Mermaid, or state table).
State its limits: where the analogy breaks.

## Step by step
Small runnable examples, each followed by its output. Build complexity gradually.
Every snippet must run as-is (or say clearly that it is a fragment).

## Predict, then run
2–3 snippets or commands. Ask "what happens?" and hide the answer in <details>.
The learner runs them in the playground to confirm.

## Common mistakes
3–5 real mistakes: the symptom (exact error message when there is one), why it happens, the fix.

## In the real world
Where this shows up in production code / real clusters / real apps. Idioms and conventions.

## Check yourself
3–5 short questions (answers in <details>). At least one "explain in your own words".

## Practice
Links to the exercises of this lesson and what each trains.
```

## Principles

- **One lesson, one idea.** If the "In one sentence" line needs "and", split the lesson.
- **Concrete before abstract.** Show an example, then name the concept, then generalize.
- **Worked example → faded example → exercise.** First fully solved, then partially, then the learner alone.
- **Interleave and revisit.** Later exercises reuse earlier concepts on purpose (spaced repetition). Mention it: "This uses closures from module 02."
- **Show the machine.** For languages: memory, stack/heap, scheduler, compilation. For infra: control loops, desired vs actual state, network paths, layers. For frameworks: render cycle, lifecycle, request pipeline. Diagrams help.
- **Errors are content.** Show real compiler/runtime/CLI errors and teach how to read them.
- **Idiomatic from day one.** Use the ecosystem's formatter and conventions in every snippet.
- **No filler.** No history lessons unless they explain a design choice. No marketing tone.
- **Accurate.** If a behavior depends on version, say which. Don't invent APIs or flags.

## Levels

- `beginner`: define every term at first use, smaller steps, more worked examples, more "predict" blocks, glossary at the end of each module README.
- `intermediate`: map concepts to what they already know ("like X in Python, but..."), skip programming basics, faster ramp.
- `advanced`: internals, performance, trade-offs, failure modes, production hardening, reading source/specs.

## Quizzes (`quiz.md`)

8–15 questions per module mixing: multiple choice with plausible distractors (each distractor = a real misconception), predict-the-output, spot-the-bug, "which would you choose and why", ordering steps. Each answer in `<details>` with the explanation of *why* the others are wrong. In tutor mode (`/learn quiz`) ask them one by one instead of showing the file.

## Module README

Objectives, lesson list with links, exercise table (`# | exercise | concepts | difficulty ★☆☆`), capstone milestone of this module, "you're done when" criteria (all checks green + milestone accepted), glossary (beginner).

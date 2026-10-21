// Parse a module quiz.md into questions (no dependencies, so it can be unit-tested).
//
// Expected format (see references/pedagogy.md › Quiz file format):
//
//   # Quiz — <module title>          ← intro (anything before the first ---)
//   ---
//   **1.** Question text, code blocks allowed.
//   - a) option
//   - b) option
//   <details><summary>Answer</summary>
//   **b.** Why b is right, why the others are wrong.
//   </details>
//   ---
//   **2.** Open question (no options): the learner self-grades after revealing.
//   <details><summary>Answer</summary> ... </details>
//
// Tolerated variants: no `---` separators (questions split on `**N.**` / `### N.`),
// options as `- a.`, `- **a)**`, `* a)`, and answer heads like `**b)**`, `**a, c.**`,
// `**Answer: b**`, `**Réponse : b.**`.

const OPTION = /^\s{0,3}[-*]\s+\**\(?([a-h])[).]\**\s+(.*)$/;
const ANSWER_HEAD = /^\*\*(?:[^*:\n]{1,24}:\s*)?([a-h](?:\s*(?:,|\/|\+|&|and|et|y|und)\s*[a-h])*)\s*(?:[.)]|\*\*)/i;
const QUESTION_START = /^(?:\*\*\s*(\d+)\s*[.)]|#{2,4}\s*(?:\S+\s+)?(\d+)\s*[.):—-])/;

function splitQuestions(src) {
  const parts = src.split(/^\s*---+\s*$/m);
  if (parts.length > 1 && parts.slice(1).some((p) => p.includes('<details'))) {
    return { intro: parts[0], chunks: parts.slice(1) };
  }
  // No separators: cut before every line that starts a numbered question.
  const lines = src.split('\n');
  const chunks = [];
  const intro = [];
  let cur = null;
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && QUESTION_START.test(line)) { cur = [line]; chunks.push(cur); continue; }
    (cur || intro).push(line);
  }
  return { intro: intro.join('\n'), chunks: chunks.map((c) => c.join('\n')) };
}

export function parseQuizMarkdown(src) {
  const { intro, chunks } = splitQuestions(src.replace(/\r\n/g, '\n'));
  const questions = [];
  for (const chunk of chunks) {
    const open = chunk.search(/<details[\s>]/);
    if (open < 0) continue;
    const qPart = chunk.slice(0, open);
    const answerMd = chunk.slice(open)
      .replace(/^<details[^>]*>\s*(<summary>[\s\S]*?<\/summary>)?/, '')
      .replace(/<\/details>\s*$/, '')
      .trim();
    const m = qPart.match(QUESTION_START) || qPart.match(/^\s*\*\*\s*(\d+)\s*[.)]/m);
    const options = [];
    const kept = [];
    let inFence = false;
    for (const line of qPart.split('\n')) {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      const o = !inFence && line.match(OPTION);
      if (o) { options.push({ letter: o[1].toLowerCase(), md: o[2] }); continue; }
      if (options.length && !inFence && /^\s{2,}\S/.test(line)) { options.at(-1).md += ' ' + line.trim(); continue; }
      kept.push(line);
    }
    let correct = [];
    const head = answerMd.match(ANSWER_HEAD);
    if (head && options.length) {
      const letters = head[1].toLowerCase().match(/\b[a-h]\b/g) || [];
      const valid = new Set(options.map((o) => o.letter));
      correct = letters.filter((l) => valid.has(l));
    }
    questions.push({
      n: Number(m && (m[1] || m[2])) || questions.length + 1,
      md: kept.join('\n').trim(),
      options,
      correct,
      answerMd,
    });
  }
  return { introMd: intro, questions };
}

// Studio UI strings, shared by the browser (app.js) and the server (PROGRESS.md).
//
// The language comes from .learn/course.json → params.lang ("fr", "pt-BR", ...).
// Lookup order: exact tag → base language → English. Missing keys fall back to English.
// To support a new language, add one object below (same keys as `en`), written natively.
// `{name}` placeholders are filled by t(); keep them as they are.

export const STRINGS = {
  en: {
    // chrome
    menu: 'Menu', theme: 'Light / dark theme', terminal: 'Terminal', drawer_btn: '⌘ Terminal',
    drawer_title: 'Free terminal (Ctrl+`)', restart: 'Restart', close: 'Close',
    nav_dashboard: 'Dashboard', nav_playground: 'Playground', nav_setup: 'Setup', nav_modules: 'Modules',
    nav_overview: 'Overview', nav_capstone: 'Capstone project',
    k_lesson: 'L', k_exercise: 'E', k_quiz: 'Q', k_milestone: 'M',
    status_passed: 'passed', status_failing: 'to rework', status_todo: 'to do',
    top_exercises: '{d}/{t} exercises', top_milestones: '{d}/{t} milestones', streak_short: '🔥 {n} d',
    // dashboard
    level_beginner: 'Beginner level', level_intermediate: 'Intermediate level', level_advanced: 'Advanced level',
    started_on: 'started {date}', resume: 'Resume', begin: 'Start',
    kind_lesson: 'Lesson', kind_exercise: 'Exercise', kind_quiz: 'Quiz', kind_milestone: 'Project milestone',
    module_n: 'module {id}', continue: 'Continue →', all_done: 'Everything is validated. Well done!',
    stat_lessons: 'lessons read', stat_exercises: 'exercises passed', stat_milestones: 'milestones',
    stat_streak_one: 'day in a row', stat_streak_many: 'days in a row',
    failing_title: 'To rework', attempts_one: '{n} attempt', attempts_many: '{n} attempts',
    weak_title: 'Weak spots', modules_title: 'Modules', module_label: 'Module {id}', n_exercises: '{d}/{t} exercises',
    docs_title: 'Documents', doc_readme: 'Course overview and how to work', doc_setup: 'Installing the tools',
    doc_studio: 'How the Studio works', folder: 'Folder',
    // module / lesson
    module_meta: 'Module {id} · ~{h} h · {pct}% done', lessons: 'Lessons', exercises: 'Exercises', lesson_read: 'read',
    module_quiz: 'Module quiz', todo: 'to do', lesson_of: 'lesson {i}/{n}', lesson_done: '✓ Lesson read',
    mark_read: 'I have read this lesson', try_terminal: '⌘ Try it in the terminal', prev: '← Previous', next: 'Next →',
    lesson_marked: 'Lesson marked as read',
    // quiz
    quiz_title: 'Quiz — {title}', quiz_last: 'Last score: <strong>{s}/{t}</strong>', quiz_best: ' · best: {b}/{t}',
    quiz_retry: 'Retake it as often as you like.', score: 'score: {n}', question: 'Question {n}',
    quiz_done: 'Quiz finished · saved', quiz_perfect: '— perfect!', quiz_solid: '— solid.',
    quiz_review: '— reread the explanations of the questions you missed.', quiz_missed: 'To review: {list}',
    quiz_again: 'Start again', right_answer: '✓ Correct', wrong_answer: '✗ The right answer was {x}',
    quiz_placeholder: 'Your answer (just for you, before looking)…', show_answer: 'Show the answer',
    self_grade: 'Were you right?', yes: 'Yes', no: 'No', counted_right: '✓ Counted as right', counted_wrong: '✗ Counted as wrong',
    // workspace
    ws_exercise: 'exercise', ws_milestone: 'milestone {id} (cumulative)', milestone_n: 'Milestone {id} — {title}',
    btn_setup: '▶ Set up', btn_check: '✓ Check', btn_reset: '↺ Start over', btn_solution: 'Solution',
    tab_terminal: 'Terminal', tab_files: 'Files', tab_output: 'Results',
    editor_empty: 'Pick a file on the left.<br>Changes are saved automatically.', out_empty: 'Click “Check” to run the grading.',
    save: 'Save', saved: 'saved', modified: '● modified', binary: 'Binary file: not editable here',
    too_big: 'File too large for the editor', save_failed: 'Save failed: {e}', refresh: 'Refresh',
    not_exists: '{d}/ does not exist yet', running: '⏳ {label} running…', already_running: 'A command is already running',
    label_check: 'Grading', label_setup: 'Setup', label_reset: 'Reset',
    all_green: '✓ All green!', not_yet_banner: '✗ Not yet: read the ✗ lines below, fix, then run again.',
    action_done: '✓ {label} finished. The terminal is open in the exercise folder.',
    action_failed: '✗ {label} failed (code {code}).', toast_pass: '✓ Passed', toast_fail: '✗ Not yet',
    // solution
    sol_title: 'Solution · {t}', sol_sure: 'Are you sure?',
    sol_passed: 'Your exercise is green: compare with the solution, there is often another way to do it.',
    sol_not_passed: 'You have not passed this exercise yet. Did you open the hints (at the end of the statement)? Viewing the solution is recorded in your progress.',
    sol_show: 'Show the solution', sol_not_yet: 'Not yet', sol_no_notes: 'No NOTES.md.', pick_file: 'Pick a file',
    // capstone / playground / misc
    capstone_eyebrow: 'Capstone project', milestones: 'Milestones', playground_eyebrow: 'Sandbox',
    playground_title: 'A terminal opened in playground/', open_terminal: '⌘ Open the terminal',
    not_found: 'Not found', back_dashboard: 'Back to the dashboard', oops: 'Oops',
    copy: 'Copy', copied: 'Copied', copy_failed: 'Copy failed', to_terminal: '→ Terminal',
    to_terminal_title: 'Paste into the terminal (without running it)', session_ended: 'Session ended', new_shell: 'New shell',
    // PROGRESS.md (server)
    pm_title: 'My progress — {tech}', pm_meta: 'Started: {s} · Last activity: {l} · Streak: {n}',
    pm_days_one: '{n} day', pm_days_many: '{n} days',
    pm_overall: '**Overall:** {bar} {x}/{y} exercises · {m}/{k} milestones',
    pm_note: '> Regenerated by the Studio and by `/learn status` from `.learn/results.log` (real grading results).',
    pm_lesson: 'Lesson {n} — {t}', pm_exercise: 'Exercise {n} — {t} {stars}', pm_quiz: 'Quiz',
    pm_milestone: 'Capstone milestone {id} — {t}', pm_weak: 'Weak spots to review',
  },

  fr: {
    menu: 'Menu', theme: 'Thème clair / sombre', terminal: 'Terminal', drawer_btn: '⌘ Terminal',
    drawer_title: 'Terminal libre (Ctrl+`)', restart: 'Relancer', close: 'Fermer',
    nav_dashboard: 'Tableau de bord', nav_playground: 'Playground', nav_setup: 'Installation', nav_modules: 'Modules',
    nav_overview: 'Vue d’ensemble', nav_capstone: 'Projet fil rouge',
    k_lesson: 'L', k_exercise: 'E', k_quiz: 'Q', k_milestone: 'J',
    status_passed: 'réussi', status_failing: 'à retravailler', status_todo: 'à faire',
    top_exercises: '{d}/{t} exercices', top_milestones: '{d}/{t} jalons', streak_short: '🔥 {n} j',
    level_beginner: 'Niveau débutant', level_intermediate: 'Niveau intermédiaire', level_advanced: 'Niveau avancé',
    started_on: 'commencé le {date}', resume: 'Reprendre', begin: 'Commencer',
    kind_lesson: 'Leçon', kind_exercise: 'Exercice', kind_quiz: 'Quiz', kind_milestone: 'Jalon du projet',
    module_n: 'module {id}', continue: 'Continuer →', all_done: 'Tout est validé. Bravo !',
    stat_lessons: 'leçons lues', stat_exercises: 'exercices réussis', stat_milestones: 'jalons',
    stat_streak_one: 'jour d’affilée', stat_streak_many: 'jours d’affilée',
    failing_title: 'À retravailler', attempts_one: '{n} essai', attempts_many: '{n} essais',
    weak_title: 'Points fragiles', modules_title: 'Modules', module_label: 'Module {id}', n_exercises: '{d}/{t} exercices',
    docs_title: 'Documents', doc_readme: 'Présentation du cours et méthode de travail', doc_setup: 'Installation des outils',
    doc_studio: 'Comment marche le Studio', folder: 'Dossier',
    module_meta: 'Module {id} · ~{h} h · {pct} % fait', lessons: 'Leçons', exercises: 'Exercices', lesson_read: 'lue',
    module_quiz: 'Quiz du module', todo: 'à faire', lesson_of: 'leçon {i}/{n}', lesson_done: '✓ Leçon lue',
    mark_read: 'J’ai lu cette leçon', try_terminal: '⌘ Essayer dans le terminal', prev: '← Précédent', next: 'Suivant →',
    lesson_marked: 'Leçon marquée comme lue',
    quiz_title: 'Quiz — {title}', quiz_last: 'Dernier score : <strong>{s}/{t}</strong>', quiz_best: ' · meilleur : {b}/{t}',
    quiz_retry: 'Tu peux le refaire autant que tu veux.', score: 'score : {n}', question: 'Question {n}',
    quiz_done: 'Quiz terminé · enregistré', quiz_perfect: '— parfait !', quiz_solid: '— solide.',
    quiz_review: '— relis les explications des questions ratées.', quiz_missed: 'À revoir : {list}',
    quiz_again: 'Recommencer', right_answer: '✓ Bonne réponse', wrong_answer: '✗ La bonne réponse était {x}',
    quiz_placeholder: 'Ta réponse (pour toi seulement, avant de regarder)…', show_answer: 'Voir la réponse',
    self_grade: 'Tu avais juste ?', yes: 'Oui', no: 'Non', counted_right: '✓ Compté juste', counted_wrong: '✗ Compté faux',
    ws_exercise: 'exercice', ws_milestone: 'jalon {id} (cumulatif)', milestone_n: 'Jalon {id} — {title}',
    btn_setup: '▶ Mise en place', btn_check: '✓ Corriger', btn_reset: '↺ Repartir de zéro', btn_solution: 'Solution',
    tab_terminal: 'Terminal', tab_files: 'Fichiers', tab_output: 'Correction',
    editor_empty: 'Choisis un fichier à gauche.<br>Les modifications sont enregistrées automatiquement.',
    out_empty: 'Clique sur « Corriger » pour lancer la vérification.',
    save: 'Enregistrer', saved: 'enregistré', modified: '● modifié', binary: 'Fichier binaire : non éditable ici',
    too_big: 'Fichier trop gros pour l’éditeur', save_failed: 'Échec de l’enregistrement : {e}', refresh: 'Rafraîchir',
    not_exists: '{d}/ n’existe pas encore', running: '⏳ {label} en cours…', already_running: 'Une commande tourne déjà',
    label_check: 'Correction', label_setup: 'Mise en place', label_reset: 'Remise à zéro',
    all_green: '✓ Tout est vert !', not_yet_banner: '✗ Pas encore : lis les lignes ✗ ci-dessous, corrige, puis relance.',
    action_done: '✓ {label} terminée. Le terminal est ouvert dans le dossier de l’exercice.',
    action_failed: '✗ {label} a échoué (code {code}).', toast_pass: '✓ Validé', toast_fail: '✗ Pas encore',
    sol_title: 'Solution · {t}', sol_sure: 'Tu es sûr ?',
    sol_passed: 'Ton exercice est au vert : compare avec la solution, il y a souvent une autre façon de faire.',
    sol_not_passed: 'Tu n’as pas encore réussi cet exercice. As-tu ouvert les indices (en bas de l’énoncé) ? La solution vue sera notée dans ta progression.',
    sol_show: 'Voir la solution', sol_not_yet: 'Pas encore', sol_no_notes: 'Pas de NOTES.md.', pick_file: 'Choisis un fichier',
    capstone_eyebrow: 'Projet fil rouge', milestones: 'Jalons', playground_eyebrow: 'Bac à sable',
    playground_title: 'Un terminal ouvert dans playground/', open_terminal: '⌘ Ouvrir le terminal',
    not_found: 'Introuvable', back_dashboard: 'Retour au tableau de bord', oops: 'Oups',
    copy: 'Copier', copied: 'Copié', copy_failed: 'Copie impossible', to_terminal: '→ Terminal',
    to_terminal_title: 'Coller dans le terminal (sans exécuter)', session_ended: 'Session terminée', new_shell: 'Nouveau shell',
    pm_title: 'Ma progression — {tech}', pm_meta: 'Démarré : {s} · Dernière activité : {l} · Série : {n}',
    pm_days_one: '{n} jour', pm_days_many: '{n} jours',
    pm_overall: '**Global :** {bar} {x}/{y} exercices · {m}/{k} jalons',
    pm_note: '> Régénéré par le Studio et par `/learn status` à partir de `.learn/results.log` (les résultats réels des corrections).',
    pm_lesson: 'Leçon {n} — {t}', pm_exercise: 'Exercice {n} — {t} {stars}', pm_quiz: 'Quiz',
    pm_milestone: 'Jalon capstone {id} — {t}', pm_weak: 'Points à revoir',
  },
};

/** Build a translator for a BCP 47 tag: t(key, { var: value }). */
export function translator(lang) {
  const tag = String(lang || 'en');
  const table = { ...STRINGS.en, ...(STRINGS[tag.split('-')[0].toLowerCase()] || {}), ...(STRINGS[tag] || {}) };
  const t = (key, vars = {}) => String(table[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  t.plural = (n, one, many, vars = {}) => t(n === 1 ? one : many, { n, ...vars });
  return t;
}

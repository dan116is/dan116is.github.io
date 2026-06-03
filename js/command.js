// Central command router: one place decides whether free Hebrew text is a
// question, action, or add request. This keeps the smart bar, capture sheet,
// voice tasks, and talk overlay from drifting into different behaviours.
const Command = (() => {
  function classify(text) {
    const t = String(text || '').trim();
    if (!t) return 'none';
    try {
      if (window.NLU && NLU.classify) return NLU.classify(t);
    } catch (e) {}
    try {
      if (window.QuickAdd && QuickAdd.looksLikeQuestion && QuickAdd.looksLikeQuestion(t)) return 'question';
      if (window.QuickAdd && QuickAdd.classify) return QuickAdd.classify(t);
    } catch (e) {}
    return 'shopping';
  }

  function normalize(result, source) {
    if (!result) return null;
    return {
      ...result,
      source: result.source || source,
      reply: result.reply || result.msg || ''
    };
  }

  function shouldStayLocal(kind) {
    // These are live-data or deterministic device actions. Keeping them local
    // avoids cloud latency and prevents accidental side effects from model drift.
    return kind === 'question' || kind === 'meal' || kind === 'complete' || kind === 'delete';
  }

  function runLocal(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    const kind = classify(t);
    try {
      if (window.NLU && shouldStayLocal(kind)) return normalize(NLU.run(t), 'nlu');
    } catch (e) {}
    try {
      const add = window.QuickAdd ? QuickAdd.handleSmart(t) : null;
      if (add) return normalize({ kind: 'add', added: add.added, reply: add.msg }, 'quickadd');
    } catch (e) {}
    try {
      return window.NLU ? normalize(NLU.run(t), 'nlu') : null;
    } catch (e) { return null; }
  }

  async function run(text, options = {}) {
    const t = String(text || '').trim();
    if (!t) return null;
    const kind = classify(t);
    if (shouldStayLocal(kind) || options.localOnly) return runLocal(t);
    if (options.useAI !== false) {
      try {
        if (window.AI && AI.enabled()) {
          const action = await AI.understand(t);
          const aiResult = action ? AI.execute(action, t) : null;
          if (aiResult) return normalize(aiResult, 'ai');
        }
      } catch (e) {}
    }
    return runLocal(t);
  }

  return { classify, runLocal, run };
})();
if (typeof window !== 'undefined') window.Command = Command;

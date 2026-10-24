(() => {
  'use strict';
  const STORAGE_KEY = 'humanityStrongest.bestWinStreak.v1';
  const MILESTONES = Object.freeze([5,10,20]);
  function parseBest(value) {
    if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return 0;
    const number = Number(value);
    return Number.isSafeInteger(number) ? number : 0;
  }
  function create(storage) {
    const recorded = new WeakMap();
    let current = 0, best = 0, storageAvailable = Boolean(storage);
    function readBest() {
      if (!storageAvailable) return;
      try { best = Math.max(best, parseBest(storage.getItem(STORAGE_KEY))); }
      catch { storageAvailable = false; }
    }
    readBest();
    const snapshot = () => Object.freeze({current,best,storageAvailable});
    function record(result) {
      if (!result || !['player','cpu','draw'].includes(result.winner)) throw new Error('確定した対戦結果が必要です。');
      if (recorded.has(result)) return recorded.get(result);
      readBest();
      const previous = current;
      if (result.winner === 'player') current = Math.min(Number.MAX_SAFE_INTEGER, current + 1);
      else if (result.winner === 'cpu') current = 0;
      if (current > best) {
        best = current;
        if (storageAvailable) {
          try { storage.setItem(STORAGE_KEY, String(best)); }
          catch { storageAvailable = false; }
        }
      }
      const update = Object.freeze({...snapshot(),previous,winner:result.winner,
        milestone:result.winner === 'player' && MILESTONES.includes(current) ? current : null});
      recorded.set(result, update);
      return update;
    }
    return {snapshot,record};
  }
  window.HumanityStreak = { STORAGE_KEY, MILESTONES, parseBest, create };
})();

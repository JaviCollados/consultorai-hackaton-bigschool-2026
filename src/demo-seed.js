import {REVIEWED_DEMO_REVISION, reviewedDemoState} from './reviewed-demo-state.js';

export const DEMO_BACKUP_KEY = 'consultorai.hackaton.before-reviewed-demo';

export function mergeReviewedDemoState(existing) {
  if (existing?.demoSeedRevision === REVIEWED_DEMO_REVISION) return existing;
  const reviewed = structuredClone(reviewedDemoState);
  if (!existing) return reviewed;
  const reviewedKeys = new Set(reviewed.cases.map(item => item.sampleKey));
  const customCases = existing.cases.filter(item => !reviewedKeys.has(item.sampleKey));
  const active = existing.cases.find(item => item.id === existing.activeId);
  reviewed.cases.push(...customCases);
  reviewed.activeId = active?.sampleKey && reviewedKeys.has(active.sampleKey)
    ? reviewed.cases.find(item => item.sampleKey === active.sampleKey).id
    : customCases.some(item => item.id === existing.activeId)
      ? existing.activeId : reviewed.activeId;
  return reviewed;
}

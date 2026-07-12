import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalIntelligenceSummary } from '../ai.js';

test('buildOperationalIntelligenceSummary highlights FIFA World Cup 2026 GenAI capabilities', () => {
  const summary = buildOperationalIntelligenceSummary({
    activeScenario: 'rain',
    crowdLevels: { gate_3: 90, concession_b: 72, restroom_b: 80 },
    volunteerCount: 12,
    accessibilityRequests: 3,
    transportDemand: 4,
    sustainabilityMode: 'eco'
  });

  assert.match(summary, /FIFA World Cup 2026/i);
  assert.match(summary, /Accessibility/i);
  assert.match(summary, /Transport/i);
  assert.match(summary, /Sustainability/i);
});

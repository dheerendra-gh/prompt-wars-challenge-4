import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationalIntelligenceSummary, translateText, sendMessageToAI } from '../ai.js';

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

test('translateText handles fallback mock translation values correctly', async () => {
  // Test existing translation mapping
  const translationES = await translateText({ text: 'Hello, how can I help you?', targetLang: 'es' });
  assert.equal(translationES, 'Hola, ¿cómo puedo ayudarte?');

  const translationHI = await translateText({ text: 'Where is your ticket?', targetLang: 'hi' });
  assert.equal(translationHI, 'आपका टिकट कहाँ है?');

  // Test dynamic simulation template format for unmapped phrases
  const translationFallback = await translateText({ text: 'Where is the match today?', targetLang: 'fr' });
  assert.match(translationFallback, /\[Simulated Translation to FR\]/);
});

test('sendMessageToAI handles fallback streaming response categories', async () => {
  // Check Navigation Intent
  let receivedTextNav = '';
  await new Promise((resolve) => {
    sendMessageToAI({
      prompt: 'How do I get to gate D?',
      apiKey: '',
      context: { congestedNode: 'gate_c' },
      onChunk: (chunk) => { receivedTextNav += chunk; },
      onDone: resolve
    });
  });
  assert.match(receivedTextNav, /Smart Indoor Navigation/i);
  assert.match(receivedTextNav, /Accessible/i);

  // Check Food Intent
  let receivedTextFood = '';
  await new Promise((resolve) => {
    sendMessageToAI({
      prompt: 'Where is the food court?',
      apiKey: '',
      context: { crowdLevels: { concession_a: 50, concession_b: 60 } },
      onChunk: (chunk) => { receivedTextFood += chunk; },
      onDone: resolve
    });
  });
  assert.match(receivedTextFood, /Concession.*North/i);
  assert.match(receivedTextFood, /Concession.*South/i);

  // Check Custom Translation Inline Intent
  let receivedTextTranslate = '';
  await new Promise((resolve) => {
    sendMessageToAI({
      prompt: 'Translate "where is the elevator" to spanish',
      apiKey: '',
      context: {},
      onChunk: (chunk) => { receivedTextTranslate += chunk; },
      onDone: resolve
    });
  });
  assert.match(receivedTextTranslate, /¿Dónde está el ascensor\?/i);
});


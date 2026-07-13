import test from 'node:test';
import assert from 'node:assert/strict';

// Create a lightweight DOM mock structure to test browser modules in Node.js
function createMockElement(tagName = 'div') {
  const attrs = {};
  const classes = new Set();
  const children = [];
  return {
    tagName,
    innerHTML: '',
    textContent: '',
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    attributes: attrs,
    setAttribute: (name, val) => { attrs[name] = val; },
    getAttribute: (name) => attrs[name],
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    querySelector: () => createMockElement('button'),
    querySelectorAll: () => [],
    addEventListener: () => {},
    dispatchEvent: () => {},
    style: {},
    children
  };
}

const mockDocument = {
  createElement: (tag) => createMockElement(tag),
  createElementNS: (ns, tag) => createMockElement(tag),
  getElementById: (id) => createMockElement('div'),
  querySelectorAll: () => [],
  body: createMockElement('body')
};

// Set up browser environment globals
globalThis.window = {
  addEventListener: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  }
};
globalThis.document = mockDocument;
globalThis.localStorage = globalThis.window.localStorage;
globalThis.TextDecoder = class {
  decode() { return ''; }
};

// Import modules under test
import { renderVenueMap } from '../map.js';
import { VENUE_NODES, VENUE_EDGES } from '../data.js';

test('renderVenueMap appends SVG elements to mock map container', () => {
  const mockSvg = createMockElement('svg');
  renderVenueMap(mockSvg, VENUE_NODES, VENUE_EDGES, {}, () => {});
  
  // Verify that layout boundaries, edges and nodes got created and appended
  assert.ok(mockSvg.children.length > 0);
  assert.ok(mockSvg.children.some(child => child.tagName === 'ellipse'));
  assert.ok(mockSvg.children.some(child => child.tagName === 'line'));
});

test('app.js initializes and binds UI logic on DOMContentLoaded', async () => {
  const windowListeners = {};
  globalThis.window.addEventListener = (event, callback) => {
    windowListeners[event] = callback;
  };
  
  // Dynamically load client-side app entrypoint
  await import('../app.js');
  
  // Validate DOMContentLoaded handler gets wired up
  assert.ok(windowListeners['DOMContentLoaded']);
});

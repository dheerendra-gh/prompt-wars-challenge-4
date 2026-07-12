import test from 'node:test';
import assert from 'node:assert/strict';
import { VENUE_NODES, VENUE_EDGES } from '../data.js';
import { findShortestPath } from '../map.js';

test('findShortestPath applies accessibility preferences correctly', () => {
  // Test starting at gate_4 going to sector_101
  // Accessibility preference should favor route via elevator_lobby
  const normalPath = findShortestPath(VENUE_NODES, VENUE_EDGES, 'gate_4', 'sector_101', {}, { accessibility: false, eco: false });
  const accPath = findShortestPath(VENUE_NODES, VENUE_EDGES, 'gate_4', 'sector_101', {}, { accessibility: true, eco: false });

  // Verify paths are returned
  assert.ok(normalPath.length > 0);
  assert.ok(accPath.length > 0);

  // Since accessibility preference reduces the weight of elevator nodes,
  // the accessibility path should prefer passing through the elevator lobby.
  assert.ok(accPath.includes('elevator_lobby'), 'Accessible path should favor elevator_lobby');
});

test('findShortestPath applies eco-friendly preferences correctly', () => {
  // Test starting at concession_a going to gate_1
  // Eco preference should favor routing through eco_hub_north
  const normalPath = findShortestPath(VENUE_NODES, VENUE_EDGES, 'concession_a', 'gate_1', {}, { accessibility: false, eco: false });
  const ecoPath = findShortestPath(VENUE_NODES, VENUE_EDGES, 'concession_a', 'gate_1', {}, { accessibility: false, eco: true });

  assert.ok(normalPath.length > 0);
  assert.ok(ecoPath.length > 0);

  // Eco-friendly path should detour/prefer eco_hub_north
  assert.ok(ecoPath.includes('eco_hub_north'), 'Eco path should detour to eco_hub_north');
});

test('findShortestPath routes around highly congested areas', () => {
  // If restroom_a is extremely congested (95%), the route should avoid it if possible.
  const crowdLevels = {
    restroom_a: 95,
    gate_4: 10,
    sector_101: 10,
    elevator_lobby: 10
  };

  const pathWithCongestion = findShortestPath(VENUE_NODES, VENUE_EDGES, 'gate_4', 'sector_101', crowdLevels, { accessibility: false, eco: false });
  
  // Verify it doesn't traverse restroom_a if an alternative exists
  assert.ok(!pathWithCongestion.includes('restroom_a'), 'Route should avoid restroom_a due to high congestion');
});

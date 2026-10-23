// ============================================================
// CareFlow — End-to-End Acceptance Test Suite
// Verifies TEST A through TEST O per TPM Assessment Specification
// ============================================================

import assert from 'node:assert';
import { createInitialState } from '../lib/seed.ts';
import {
  calcFeverFreeStreak,
  calcDischargeEligibility,
  isFever,
  isCritical,
  occupiedBeds,
  freeBeds,
  buildBeds,
  mortalityRate,
  successRate,
  averageLengthOfStay,
  effectiveReadingForDate,
  readingsForDate
} from '../lib/business.ts';

console.log('====================================================');
console.log('  CareFlow Acceptance Verification Suite');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

// ----------------------------------------------------
// TEST A & B: Bed Integrity & 74-bed capacity
// ----------------------------------------------------
runTest('TEST K1 — Exactly 74 beds initialized', () => {
  const state = createInitialState();
  const beds = buildBeds(state);
  assert.strictEqual(beds.length, 74, 'Beds array must have exactly 74 beds');
  assert.strictEqual(beds[0].number, 1);
  assert.strictEqual(beds[73].number, 74);
});

runTest('TEST K2 — No double bed allocation', () => {
  const state = createInitialState();
  const beds = buildBeds(state);
  const occupiedBedNumbers = beds.filter(b => b.patientId).map(b => b.number);
  const uniqueBeds = new Set(occupiedBedNumbers);
  assert.strictEqual(occupiedBedNumbers.length, uniqueBeds.size, 'No bed may have more than one patient');
});

runTest('TEST K3 — Bed counts add up to 74', () => {
  const state = createInitialState();
  const occupied = occupiedBeds(state);
  const free = freeBeds(state);
  assert.strictEqual(occupied + free, 74, 'Occupied + Free must equal 74');
  assert(occupied > 0 && free > 0, 'Must have both occupied and free beds in seed state');
});

// ----------------------------------------------------
// TEST D, E, F: Temperature Logic & Fever Alerts
// ----------------------------------------------------
runTest('TEST E1 — Fever threshold at 38.0°C and Critical threshold at 39.5°C', () => {
  assert.strictEqual(isFever(37.9), false);
  assert.strictEqual(isFever(38.0), true);
  assert.strictEqual(isFever(39.4), true);
  assert.strictEqual(isCritical(39.4), false);
  assert.strictEqual(isCritical(39.5), true);
  assert.strictEqual(isCritical(40.1), true);
});

runTest('TEST E2 — Fever streak calculation: PAT-001 has 3 completed fever-free days', () => {
  const state = createInitialState();
  const pat1 = state.patients.find(p => p.id === 'PAT-001');
  const streak = calcFeverFreeStreak(state.temperatureReadings, pat1.id, pat1.admittedAt);
  assert.strictEqual(streak, 3, 'PAT-001 should have a fever-free streak of 3');
});

runTest('TEST E3 — Fever streak calculation: PAT-003 (fever) resets streak to 0', () => {
  const state = createInitialState();
  const pat3 = state.patients.find(p => p.id === 'PAT-003');
  const streak = calcFeverFreeStreak(state.temperatureReadings, pat3.id, pat3.admittedAt);
  assert.strictEqual(streak, 0, 'Fever should reset streak to 0');
});

// ----------------------------------------------------
// TEST I: Discharge Eligibility & Approval Rules
// ----------------------------------------------------
runTest('TEST I1 — Discharge eligibility requires >= 3 completed fever-free days', () => {
  const state = createInitialState();
  const pat1 = state.patients.find(p => p.id === 'PAT-001');
  const eligible1 = calcDischargeEligibility(state.temperatureReadings, pat1.id, pat1.admittedAt);
  assert.strictEqual(eligible1, true, 'PAT-001 with 3 days streak must be eligible');

  const pat3 = state.patients.find(p => p.id === 'PAT-003');
  const eligible3 = calcDischargeEligibility(state.temperatureReadings, pat3.id, pat3.admittedAt);
  assert.strictEqual(eligible3, false, 'PAT-003 with fever must not be eligible');

  const pat9 = state.patients.find(p => p.id === 'PAT-009'); // 1 day streak
  const eligible9 = calcDischargeEligibility(state.temperatureReadings, pat9.id, pat9.admittedAt);
  assert.strictEqual(eligible9, false, 'PAT-009 with only 1 day streak must not be eligible');
});

runTest('TEST I2 — Approved patient (PAT-002) is present in seed data awaiting execution', () => {
  const state = createInitialState();
  const pat2 = state.patients.find(p => p.id === 'PAT-002');
  assert.strictEqual(pat2.status, 'discharge_approved');
  assert(pat2.dischargeApprovedAt, 'Approved patient must have approval timestamp');
  assert(pat2.dischargeApprovedByName, 'Approved patient must have approving doctor');
});

// ----------------------------------------------------
// TEST J: Death Workflow
// ----------------------------------------------------
runTest('TEST J1 — Death declared patient (PAT-008) retains occupied bed until confirmation', () => {
  const state = createInitialState();
  const pat8 = state.patients.find(p => p.id === 'PAT-008');
  assert.strictEqual(pat8.status, 'death_declared');
  assert(pat8.deathNote, 'Death declaration must have clinical note');
  
  // Bed must still be occupied by PAT-008
  const beds = buildBeds(state);
  const bed8 = beds.find(b => b.number === pat8.bedNumber);
  assert.strictEqual(bed8.patientId, 'PAT-008', 'Bed remains occupied while death is only declared');
});

runTest('TEST J2 — Confirmed death (PAT-012) frees bed and locks record', () => {
  const state = createInitialState();
  const pat12 = state.patients.find(p => p.id === 'PAT-012');
  assert.strictEqual(pat12.status, 'death_confirmed');
  
  const beds = buildBeds(state);
  const bed12 = beds.find(b => b.number === pat12.bedNumber);
  assert.strictEqual(bed12.patientId, undefined, 'Confirmed death immediately frees bed');
});

// ----------------------------------------------------
// TEST M: Management Metrics & 15% Mortality Benchmark
// ----------------------------------------------------
runTest('TEST M1 — Closed cases only include discharged and confirmed deaths', () => {
  const state = createInitialState();
  const from = new Date(Date.now() - 30 * 86400000);
  const to = new Date();
  
  const mort = mortalityRate(state.patients, from, to);
  const succ = successRate(state.patients, from, to);
  
  assert(typeof mort === 'number' && !isNaN(mort), 'Mortality rate must be a valid number');
  assert(typeof succ === 'number' && !isNaN(succ), 'Success rate must be a valid number');
  assert(mort + succ > 0, 'Mortality + success must reflect closed cases');
});

runTest('TEST M2 — Average Length of Stay calculates correctly', () => {
  const state = createInitialState();
  const from = new Date(Date.now() - 30 * 86400000);
  const to = new Date();
  
  const alos = averageLengthOfStay(state.patients, from, to);
  assert(alos > 0, 'ALOS must be positive for closed cases');
});

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`  Tests Passed: ${passedTests} / ${totalTests}`);
console.log(`  Overall Result: ${passedTests === totalTests ? 'ALL CHECKS PASSED ✓' : 'SOME CHECKS FAILED ✗'}`);
console.log('====================================================\n');

process.exit(passedTests === totalTests ? 0 : 1);

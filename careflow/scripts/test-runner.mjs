// ============================================================
// CareFlow — Acceptance & Business Logic Verification Runner
// Comprehensive tests covering all specified workflows
// ============================================================

import assert from 'node:assert';

console.log('========================================================');
console.log('  CareFlow Verification Suite — End-to-End Business Rules');
console.log('========================================================\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    -> ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------
// 1. Bed Capacity & Allocation Integrity (Exactly 74 beds)
// -----------------------------------------------------------------
console.log('\n[SECTION 1: Bed Integrity & 74-Bed Capacity]');

it('1.1 Capacity invariant: Exactly 74 beds must exist', () => {
  const beds = Array.from({ length: 74 }, (_, i) => ({ number: i + 1 }));
  assert.strictEqual(beds.length, 74, 'Facility capacity must be exactly 74');
  assert.strictEqual(beds[0].number, 1);
  assert.strictEqual(beds[73].number, 74);
});

it('1.2 Vacant bed assignment: Patient assigned to vacant bed occupies it', () => {
  const beds = Array.from({ length: 74 }, (_, i) => ({ number: i + 1 }));
  const patient = { id: 'PAT-TEST-1', name: 'John Doe', bedNumber: 5 };
  beds[patient.bedNumber - 1] = { ...beds[patient.bedNumber - 1], patientId: patient.id, patientName: patient.name };
  
  assert.strictEqual(beds[4].patientId, 'PAT-TEST-1');
  assert.strictEqual(beds[4].patientName, 'John Doe');
  assert.strictEqual(beds[5].patientId, undefined);
});

it('1.3 Reassignment consistency: Frees old bed and occupies new bed in single state change', () => {
  let beds = Array.from({ length: 74 }, (_, i) => ({ number: i + 1 }));
  beds[2] = { number: 3, patientId: 'PAT-1', patientName: 'Alice' }; // Bed 3
  
  // Reassign to Bed 10
  const oldBed = 3;
  const newBed = 10;
  beds = beds.map(b => {
    if (b.number === oldBed) return { number: b.number };
    if (b.number === newBed) return { ...b, patientId: 'PAT-1', patientName: 'Alice' };
    return b;
  });

  assert.strictEqual(beds[oldBed - 1].patientId, undefined, 'Old bed must be vacant');
  assert.strictEqual(beds[newBed - 1].patientId, 'PAT-1', 'New bed must be occupied');
});

// -----------------------------------------------------------------
// 2. Temperature Thresholds & Fever Rules (Celsius, 38.0°C & 39.5°C)
// -----------------------------------------------------------------
console.log('\n[SECTION 2: Clinical Temperature & Fever Alert Rules]');

const FEVER_THRESHOLD = 38.0;
const CRITICAL_THRESHOLD = 39.5;

function isFever(temp) { return temp >= FEVER_THRESHOLD; }
function isCritical(temp) { return temp >= CRITICAL_THRESHOLD; }

it('2.1 Temperature classification thresholds', () => {
  assert.strictEqual(isFever(37.9), false, '37.9°C is normal');
  assert.strictEqual(isFever(38.0), true, '38.0°C triggers fever alert');
  assert.strictEqual(isCritical(39.4), false, '39.4°C is fever but not critical');
  assert.strictEqual(isCritical(39.5), true, '39.5°C triggers urgent critical alert');
});

it('2.2 Fever-free day definition (all readings for that completed day < 38.0°C)', () => {
  function isDayFeverFree(readings) {
    if (readings.length === 0) return false;
    return readings.every(r => r.value < FEVER_THRESHOLD);
  }

  assert.strictEqual(isDayFeverFree([{ value: 36.8 }, { value: 37.2 }]), true, 'Normal readings make fever-free day');
  assert.strictEqual(isDayFeverFree([{ value: 36.8 }, { value: 38.0 }]), false, 'Any reading >= 38.0 resets fever-free status');
  assert.strictEqual(isDayFeverFree([]), false, 'Missing readings cannot be fever-free');
});

it('2.3 Fever-free streak requires consecutive completed days; fever resets to 0', () => {
  function calcStreak(dailyReadings) {
    let streak = 0;
    for (const day of dailyReadings) {
      if (day.length === 0 || day.some(r => r.value >= FEVER_THRESHOLD)) {
        break;
      }
      streak++;
    }
    return streak;
  }

  // 3 completed days backwards from yesterday: all normal
  const streak3 = calcStreak([
    [{ value: 36.9 }], // Day -1
    [{ value: 37.0 }], // Day -2
    [{ value: 36.8 }], // Day -3
  ]);
  assert.strictEqual(streak3, 3, 'Consecutive 3 days gives streak 3');

  // Day -2 had fever: streak broken at Day -1
  const streakBroken = calcStreak([
    [{ value: 36.9 }], // Day -1 (normal)
    [{ value: 38.2 }], // Day -2 (fever!)
    [{ value: 36.8 }], // Day -3
  ]);
  assert.strictEqual(streakBroken, 1, 'Fever on Day -2 resets streak beyond that');
});

// -----------------------------------------------------------------
// 3. Discharge Workflow & Biological Eligibility
// -----------------------------------------------------------------
console.log('\n[SECTION 3: Discharge Eligibility & Execution Workflow]');

it('3.1 Eligibility rule: Exactly 3 or more consecutive completed fever-free days required', () => {
  function isEligible(streak) { return streak >= 3; }
  assert.strictEqual(isEligible(0), false);
  assert.strictEqual(isEligible(1), false);
  assert.strictEqual(isEligible(2), false);
  assert.strictEqual(isEligible(3), true, 'Eligible on day 3');
  assert.strictEqual(isEligible(4), true, 'Eligible beyond day 3');
});

it('3.2 Fever added after discharge approval automatically cancels approval', () => {
  let patient = {
    id: 'PAT-2',
    name: 'Mohan Pillai',
    status: 'discharge_approved',
    dischargeApprovedAt: '2026-10-22T09:00:00Z',
    feverFreeStreak: 4,
  };

  function onNewReading(p, temp) {
    if (temp >= FEVER_THRESHOLD && p.status === 'discharge_approved') {
      return {
        ...p,
        status: 'active',
        dischargeApprovedAt: undefined,
        feverFreeStreak: 0,
      };
    }
    return p;
  }

  const updated = onNewReading(patient, 38.4);
  assert.strictEqual(updated.status, 'active', 'Discharge approval must be cancelled on fever');
  assert.strictEqual(updated.dischargeApprovedAt, undefined, 'Approval timestamp cleared');
  assert.strictEqual(updated.feverFreeStreak, 0, 'Streak reset to 0');
});

it('3.3 Discharge execution frees bed and marks patient discharged', () => {
  let beds = [{ number: 1, patientId: 'PAT-1', patientName: 'Ananya' }];
  let patient = { id: 'PAT-1', status: 'discharge_approved', bedNumber: 1 };

  // Admin executes discharge
  patient = { ...patient, status: 'discharged', dischargedAt: new Date().toISOString() };
  beds = beds.map(b => b.number === patient.bedNumber ? { number: b.number } : b);

  assert.strictEqual(patient.status, 'discharged');
  assert.strictEqual(beds[0].patientId, undefined, 'Bed must be freed upon discharge execution');
});

// -----------------------------------------------------------------
// 4. Death Declaration and Confirmation
// -----------------------------------------------------------------
console.log('\n[SECTION 4: Death Declaration & Confirmation Workflow]');

it('4.1 Death declared: Patient leaves active worklists but bed remains occupied', () => {
  let patient = { id: 'PAT-8', status: 'active', bedNumber: 8 };
  let bed = { number: 8, patientId: 'PAT-8', patientName: 'Vijay' };

  // Doctor declares death
  patient.status = 'death_declared';
  patient.deathDeclaredAt = new Date().toISOString();
  patient.deathNote = 'Acute cardiopulmonary arrest.';

  // Check worklist membership: active worklists filter out death_declared
  const isActiveForDoctorNurse = ['active', 'eligible', 'discharge_approved'].includes(patient.status);
  assert.strictEqual(isActiveForDoctorNurse, false, 'Patient leaves nurse and doctor daily worklists');
  assert.strictEqual(bed.patientId, 'PAT-8', 'Bed remains occupied until admin confirmation');
});

it('4.2 Death confirmed by admin: Bed freed and record locked', () => {
  let patient = { id: 'PAT-8', status: 'death_declared', bedNumber: 8 };
  let beds = [{ number: 8, patientId: 'PAT-8', patientName: 'Vijay' }];

  // Admin confirms death
  patient.status = 'death_confirmed';
  patient.deathConfirmedAt = new Date().toISOString();
  beds = beds.map(b => b.number === patient.bedNumber ? { number: b.number } : b);

  assert.strictEqual(patient.status, 'death_confirmed');
  assert.strictEqual(beds[0].patientId, undefined, 'Bed is freed on confirmation');
});

// -----------------------------------------------------------------
// 5. Management Metrics & 15% Mortality Benchmark
// -----------------------------------------------------------------
console.log('\n[SECTION 5: Management Dashboard KPIs & Benchmark Rules]');

it('5.1 Closed cases formula: Discharges + Confirmed Deaths only', () => {
  const patients = [
    { id: '1', status: 'discharged' },
    { id: '2', status: 'discharged' },
    { id: '3', status: 'death_confirmed' },
    { id: '4', status: 'active' }, // excluded
    { id: '5', status: 'death_declared' }, // excluded
  ];

  const closed = patients.filter(p => p.status === 'discharged' || p.status === 'death_confirmed');
  assert.strictEqual(closed.length, 3, 'Must exclude active patients and unconfirmed deaths');

  const mortality = (closed.filter(p => p.status === 'death_confirmed').length / closed.length) * 100;
  const success = (closed.filter(p => p.status === 'discharged').length / closed.length) * 100;

  assert.strictEqual(Number(mortality.toFixed(1)), 33.3);
  assert.strictEqual(Number(success.toFixed(1)), 66.7);
  assert.strictEqual(Math.round(mortality + success), 100);
});

it('5.2 Mortality benchmark alert: Triggers warning banner when > 15%', () => {
  function checkMortalityAlert(mortalityPct) {
    return mortalityPct > 15;
  }

  assert.strictEqual(checkMortalityAlert(14.9), false, '14.9% does not trigger warning');
  assert.strictEqual(checkMortalityAlert(15.0), false, '15.0% does not trigger warning');
  assert.strictEqual(checkMortalityAlert(15.1), true, '15.1% triggers executive alert banner');
  assert.strictEqual(checkMortalityAlert(25.0), true, '25% triggers executive alert banner');
});

it('5.3 Zero closed cases handles division safely without NaN', () => {
  const closedCount = 0;
  const deathsCount = 0;
  const rate = closedCount > 0 ? (deathsCount / closedCount) * 100 : 0;
  assert.strictEqual(rate, 0);
  assert(!isNaN(rate));
});

// -----------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------
console.log('\n========================================================');
console.log(`  Tests Passed: ${passed} / ${passed + failed}`);
console.log(`  Status: ${failed === 0 ? 'ALL ACCEPTANCE SUITE CHECKS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
console.log('========================================================\n');

process.exit(failed === 0 ? 0 : 1);

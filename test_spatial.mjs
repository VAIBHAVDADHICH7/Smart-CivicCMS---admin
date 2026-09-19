import { INITIAL_WARDS, INITIAL_COMPLAINTS } from "./src/lib/seedData.ts";
import { 
  resolveWardFromCoordinates, 
  checkDuplicateComplaint, 
  validateResolutionProximity, 
  calculateGeodeticDistance, 
  pointInPolygon 
} from "./src/lib/spatial.ts";

console.log("=== RUNNING SPATIAL & ALGORITHMIC UNIT TEST SUITE ===\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }
}

// 1. Polygon containment & Ward auto-resolution
const detectedWard1 = resolveWardFromCoordinates(26.9100, 75.7950, INITIAL_WARDS);
assert(detectedWard1 === "WARD_14", `Expected WARD_14 for Civil Lines coords, got ${detectedWard1}`);

const detectedWard2 = resolveWardFromCoordinates(26.8650, 75.7700, INITIAL_WARDS);
assert(detectedWard2 === "WARD_15", `Expected WARD_15 for Mansarovar coords, got ${detectedWard2}`);

const detectedWard3 = resolveWardFromCoordinates(26.9110, 75.7420, INITIAL_WARDS);
assert(detectedWard3 === "WARD_16", `Expected WARD_16 for Vaishali Nagar coords, got ${detectedWard3}`);

// 2. Geodetic distance accuracy tests
const d0 = calculateGeodeticDistance(26.9000, 75.7950, 26.9000, 75.7950);
assert(Math.round(d0) === 0, `Distance between identical points should be 0, got ${d0}`);

const d10 = calculateGeodeticDistance(26.9000, 75.7950, 26.90009, 75.7950);
assert(d10 > 5 && d10 < 15, `Expected approx 10 meters, got ${d10}`);

// 3. 20-Meter Deduplication Proximity Clustering
const testSeed = INITIAL_COMPLAINTS[0];
const dupCheckNear = checkDuplicateComplaint(
  testSeed.latitude + 0.00008, // ~8.9 meters away
  testSeed.longitude,
  INITIAL_COMPLAINTS,
  20.0
);
assert(dupCheckNear.isDuplicate === true, `8.9m proximity should trigger deduplication duplicate flag`);
assert(dupCheckNear.duplicateIncident !== undefined, `Duplicate result must provide duplicateIncident`);

// 50-meter shift should NOT duplicate
const dupCheckFar = checkDuplicateComplaint(
  testSeed.latitude + 0.0005, // ~55 meters away
  testSeed.longitude,
  INITIAL_COMPLAINTS,
  20.0
);
assert(dupCheckFar.isDuplicate === false, `55m offset must NOT trigger duplicate clustering`);

// 4. Anti-Fraud 30-Meter Geofence Gate for Field Crew
const fraudCheckValid = validateResolutionProximity(
  testSeed.latitude,
  testSeed.longitude,
  testSeed.latitude + 0.0001, // ~11m
  testSeed.longitude,
  30.0
);
assert(fraudCheckValid.isValid === true, `11m proximity must pass 30m geofence`);

const fraudCheckInvalid = validateResolutionProximity(
  testSeed.latitude,
  testSeed.longitude,
  testSeed.latitude + 0.001, // ~111m
  testSeed.longitude,
  30.0
);
assert(fraudCheckInvalid.isValid === false, `111m proximity must FAIL 30m geofence with anti-fraud flag`);

console.log(`\n========================================`);
console.log(`SPATIAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

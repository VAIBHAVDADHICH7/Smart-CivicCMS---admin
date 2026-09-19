async function runTests() {
  console.log("=== STARTING CIVICPULSE API ENDPOINT TEST SUITE ===\n");
  const baseUrl = "http://localhost:3000";
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`Testing: ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log("❌ FAILED:", err.message);
      failed++;
    }
  }

  // 1. Health Probe
  await test("GET /api/health", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "healthy") throw new Error(`Unexpected status: ${data.status}`);
    if (data.version !== "2.0.0") throw new Error(`Version mismatch: ${data.version}`);
  });

  // 2. Webhook / Intake - Missing GPS coordinates should return 400
  await test("POST /api/webhooks/citizen-complaint (Missing GPS Validation)", async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/citizen-complaint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Pothole without location",
        description: "Missing lat/lng"
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    if (data.error !== "VALIDATION_FAILED") throw new Error(`Expected VALIDATION_FAILED, got ${data.error}`);
  });

  // 3. Webhook / Intake - Valid Submission with Polygon Ward Routing
  await test("POST /api/webhooks/citizen-complaint (Valid Intake & Polygon Ward Routing)", async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/citizen-complaint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Dangerous Pothole on Tonk Road",
        description: "Large 1-meter pothole near crossing",
        category: "POTHOLE",
        latitude: 26.8920,
        longitude: 75.7980,
        address_text: "Tonk Road, Ward 14 - Civil Lines"
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (data.status !== "SUCCESS") throw new Error(`Expected status SUCCESS, got ${data.status}`);
    if (!data.ticket || !data.ticket.id) throw new Error("Missing ticket object in response");
    if (!data.dispatch || !data.dispatch.assigned_crew_id) throw new Error("Missing auto-dispatch payload");
  });

  // 4. Notification Dispatch
  await test("POST /api/notifications/dispatch (Alert Delivery)", async () => {
    const res = await fetch(`${baseUrl}/api/notifications/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Urgent Pothole Repair Dispatched",
        message: "High priority order assigned to crew.",
        type: "TASK_ASSIGNED",
        target_role: "FIELD_CREW"
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "SUCCESS") throw new Error(`Expected status SUCCESS, got ${data.status}`);
    if (!data.notification || !data.notification.id) throw new Error("Missing notification ID");
  });

  // 5. Citizen Feedback Webhook - Confirm
  await test("POST /api/webhooks/citizen-feedback (Confirm Resolution)", async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/citizen-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        complaint_id: "test-complaint-abc",
        action: "CONFIRM",
        feedback_rating: 5
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "SUCCESS" || data.action !== "CITIZEN_CONFIRMED") {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  });

  // 6. Citizen Feedback Webhook - Reopen
  await test("POST /api/webhooks/citizen-feedback (Dispute & Reopen)", async () => {
    const res = await fetch(`${baseUrl}/api/webhooks/citizen-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        complaint_id: "test-complaint-xyz",
        action: "REOPEN",
        dispute_reason: "Debris remains uncleaned on side of road."
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "SUCCESS" || data.action !== "CITIZEN_REOPENED") {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
  });

  // 7. SLA Escalation Cron Worker
  await test("GET /api/cron/escalate (Escalation Sweep)", async () => {
    const res = await fetch(`${baseUrl}/api/cron/escalate`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== "SUCCESS") throw new Error(`Expected status SUCCESS, got ${data.status}`);
    if (!data.summary) throw new Error("Missing summary in escalation response");
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);
  if (failed > 0) process.exit(1);
}

runTests();

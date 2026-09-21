(() => {
  "use strict";
  const API = "https://kjebemdgvjvuutzvhbtp.supabase.co/functions/v1/claudification-runtime";
  const DEMO_KEY = "claudification-public-demo-v1";
  let motionId = null;

  const el = (id) => document.getElementById(id);
  const start = el("start-motion");
  const inspect = el("inspect-motion");
  const approve = el("approve-motion");
  const escalate = el("escalate-motion");
  const reject = el("reject-motion");

  async function call(action) {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "x-demo-key": DEMO_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, motion_id: motionId })
    });
    const data = await res.json().catch(() => ({ error: "invalid_provider_response" }));
    if (!res.ok) throw new Error(data.detail || data.error || ("HTTP " + res.status));
    return data;
  }

  function setBusy(busy) {
    [start, inspect, approve, escalate, reject].forEach((b) => {
      if (b) b.dataset.busy = busy ? "true" : "false";
    });
  }

  function pretty(value) {
    return JSON.stringify(value, null, 2);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function renderTrace(events) {
    const trace = el("event-trace");
    if (!events || !events.length) {
      trace.innerHTML = "<li>No provider trace returned yet.</li>";
      return;
    }
    trace.innerHTML = events.map((event) =>
      "<li><b>" + escapeHtml(String(event.seq)) + " · " + escapeHtml(event.event_type) + "</b>" +
      "<span>" + escapeHtml(event.state) + " · " + escapeHtml(event.observed_at || "") + "</span></li>"
    ).join("");
  }

  async function inspectMotion() {
    if (!motionId) return;
    try {
      const data = await call("inspect");
      if (data.motion) {
        el("runtime-state").textContent = data.motion.state;
        if (data.motion.provider_receipt && Object.keys(data.motion.provider_receipt).length) {
          el("provider-receipt").textContent = pretty(data.motion.provider_receipt);
        }
        if (data.motion.eval_result && Object.keys(data.motion.eval_result).length) {
          el("eval-result").textContent = pretty(data.motion.eval_result);
        }
      }
      renderTrace(data.events || []);
    } catch (error) {
      el("runtime-summary").textContent = "Readback failed: " + error.message;
    }
  }

  async function startMotion() {
    setBusy(true);
    try {
      const data = await call("start");
      motionId = data.motion_id;
      el("runtime-state").textContent = data.state;
      el("runtime-motion").textContent = data.motion_key;
      el("runtime-summary").textContent = "Plan bound. Provider mutation blocked on explicit human gate.";
      el("tool-plan").innerHTML = (data.tool_plan.steps || []).map((step) =>
        "<div class='runtime-step'><b>" + escapeHtml(String(step.seq)) + " · " + escapeHtml(step.capability) + "</b>" +
        "<span>" + escapeHtml(step.mode) + " · " + escapeHtml(step.status) + "</span></div>"
      ).join("");
      el("gate-copy").innerHTML =
        "<strong>Proposed action:</strong> " + escapeHtml(data.gate.proposed_action.type) +
        "<br><span>" + escapeHtml(data.gate.proposed_action.side_effect_boundary) + "</span>";
      [approve, escalate, reject, inspect].forEach((button) => button.disabled = false);
      start.disabled = true;
      el("provider-receipt").textContent = "Blocked by SEND GATE.";
      el("eval-result").textContent = "Pending decision.";
      await inspectMotion();
    } catch (error) {
      el("runtime-state").textContent = "ERROR";
      el("runtime-summary").textContent = error.message;
    } finally {
      setBusy(false);
    }
  }

  async function decide(action) {
    if (!motionId) return;
    setBusy(true);
    try {
      const data = await call(action);
      el("runtime-state").textContent = data.state;
      el("runtime-summary").textContent = action === "approve"
        ? "Approved bounded action executed, provider-read back, and evaluated."
        : "Human decision recorded. No provider action executed.";
      approve.disabled = true;
      escalate.disabled = true;
      reject.disabled = true;
      if (data.provider_receipt) el("provider-receipt").textContent = pretty(data.provider_receipt);
      else el("provider-receipt").textContent = "No provider mutation executed.";
      if (data.eval) el("eval-result").textContent = pretty(data.eval);
      else el("eval-result").textContent = "Not promoted to execution/eval.";
      if (data.events) renderTrace(data.events);
      await inspectMotion();
    } catch (error) {
      el("runtime-state").textContent = "ERROR";
      el("runtime-summary").textContent = error.message;
    } finally {
      setBusy(false);
    }
  }

  start.addEventListener("click", startMotion);
  inspect.addEventListener("click", inspectMotion);
  approve.addEventListener("click", () => decide("approve"));
  escalate.addEventListener("click", () => decide("escalate"));
  reject.addEventListener("click", () => decide("reject"));
})();
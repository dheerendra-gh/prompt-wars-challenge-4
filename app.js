// Main Application Controller & State Orchestrator
import { VENUE_NODES, VENUE_EDGES, EVENT_SCHEDULE, INITIAL_TASKS, SIMULATION_SCENARIOS } from "./data.js";
import { renderVenueMap, findShortestPath, drawRoute } from "./map.js";
import { sendMessageToAI, translateText, buildOperationalIntelligenceSummary } from "./ai.js";

// Global App State
const state = {
  apiKey: localStorage.getItem("gemini_api_key") || "",
  activePanel: "organizer",
  activeScenario: "normal",
  crowdLevels: {}, // Current crowd levels (nodeId -> percentage)
  volunteerTasks: [...INITIAL_TASKS],
  recommendations: [],
  selectedNavNodes: { start: null, end: null },
  activePath: [],
  chatHistory: [],
  routePreferences: { accessibility: false, eco: false },
  theme: localStorage.getItem("app_theme") || "midnight"
};

// Initialize App
window.addEventListener("DOMContentLoaded", () => {
  initAppState();
  setupNavigation();
  setupMapInteractions();
  setupChatBot();
  setupTranslator();
  setupScenarioSimulator();
  setupSettings();
  
  // Render Initial View
  renderAll();
});

function initAppState() {
  // Load base crowd levels from VENUE_NODES definitions
  for (const nodeId in VENUE_NODES) {
    state.crowdLevels[nodeId] = VENUE_NODES[nodeId].baseCrowd;
  }
  
  // Load default recommendations
  state.recommendations = [...SIMULATION_SCENARIOS.normal.recommendations];
  
  // Check API Key
  const apiStatusIndicator = document.getElementById("api-status-indicator");
  const apiStatusText = document.getElementById("api-status-text");
  const apiKeyField = document.getElementById("settings-api-key");
  
  if (state.apiKey) {
    apiKeyField.value = state.apiKey;
    apiStatusIndicator.className = "status-indicator connected";
    apiStatusText.textContent = "Live Gemini API Ready";
  } else {
    apiStatusIndicator.className = "status-indicator simulated";
    apiStatusText.textContent = "DC Simulated AI";
  }

  // Initialize theme
  applyTheme(state.theme);
}

// 1. Sidebar Tab Switching Navigation
function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");
  const panels = document.querySelectorAll(".panel");
  const headerTitle = document.getElementById("header-panel-title");
  const headerRoleTag = document.getElementById("header-role-tag");

  const panelTitles = {
    organizer: "Organizer Command Center",
    fan: "Fan Experience Portal",
    volunteer: "Volunteer & Staff Dashboard",
    settings: "System Config & Simulation Settings"
  };

  const roleTags = {
    organizer: "Organizer",
    fan: "Tournament Fan",
    volunteer: "Staff / Volunteer",
    settings: "Developer Mode"
  };

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPanel = link.getAttribute("data-panel");
      state.activePanel = targetPanel;
      
      // Update sidebar nav state
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      
      // Update panel visibility
      panels.forEach(p => p.classList.remove("active"));
      document.getElementById(`panel-${targetPanel}`).classList.add("active");
      
      // Update Header Text
      headerTitle.textContent = panelTitles[targetPanel];
      headerRoleTag.textContent = roleTags[targetPanel];
      
      // Re-render relevant view
      renderAll();
    });
  });
}

// 2. SVG Map Interactions (Clicking on nodes to set waypoint paths)
function setupMapInteractions() {
  // Populate Wayfinding Select options in Fan Portal
  const originSelect = document.getElementById("fan-origin-select");
  const destSelect = document.getElementById("fan-dest-select");
  
  // Sort node names alphabetically for dropdown convenience
  const sortedNodes = Object.values(VENUE_NODES).sort((a, b) => a.name.localeCompare(b.name));
  
  sortedNodes.forEach(node => {
    const opt1 = document.createElement("option");
    opt1.value = node.id;
    opt1.textContent = node.name;
    originSelect.appendChild(opt1);
    
    const opt2 = document.createElement("option");
    opt2.value = node.id;
    opt2.textContent = node.name;
    destSelect.appendChild(opt2);
  });

  // Listener for dropdown selectors
  const onSelectorChange = () => {
    const startId = originSelect.value;
    const endId = destSelect.value;
    
    state.selectedNavNodes.start = startId || null;
    state.selectedNavNodes.end = endId || null;
    
    calculateAndDrawPath();
  };

  originSelect.addEventListener("change", onSelectorChange);
  destSelect.addEventListener("change", onSelectorChange);

  // Listeners for routing preferences checkboxes
  const prefAccessibility = document.getElementById("pref-accessibility");
  const prefEco = document.getElementById("pref-eco");

  if (prefAccessibility) {
    prefAccessibility.addEventListener("change", (e) => {
      state.routePreferences.accessibility = e.target.checked;
      calculateAndDrawPath();
    });
  }

  if (prefEco) {
    prefEco.addEventListener("change", (e) => {
      state.routePreferences.eco = e.target.checked;
      calculateAndDrawPath();
    });
  }
}

// Node click handler passed to SVG map
function handleNodeClick(nodeId) {
  // When in Fan Portal, node click can select start and end paths
  if (state.activePanel === "fan") {
    const originSelect = document.getElementById("fan-origin-select");
    const destSelect = document.getElementById("fan-dest-select");

    if (!state.selectedNavNodes.start) {
      state.selectedNavNodes.start = nodeId;
      originSelect.value = nodeId;
      showToast("Starting location selected: " + VENUE_NODES[nodeId].name);
    } else if (!state.selectedNavNodes.end && state.selectedNavNodes.start !== nodeId) {
      state.selectedNavNodes.end = nodeId;
      destSelect.value = nodeId;
      showToast("Destination selected: " + VENUE_NODES[nodeId].name);
    } else {
      // Clear selection and set new start
      state.selectedNavNodes.start = nodeId;
      state.selectedNavNodes.end = null;
      originSelect.value = nodeId;
      destSelect.value = "";
      showToast("Selection reset. New start: " + VENUE_NODES[nodeId].name);
    }

    calculateAndDrawPath();
  }
}

// Computes Dijkstra path and draws the pulse line
function calculateAndDrawPath() {
  const { start, end } = state.selectedNavNodes;
  const fanSvg = document.getElementById("fan-map-svg");
  const resultsCard = document.getElementById("fan-route-results");
  const routeTime = document.getElementById("fan-route-time");
  const routeDist = document.getElementById("fan-route-dist");
  const congestionWarning = document.getElementById("fan-congestion-warning-row");
  
  if (!start || !end) {
    resultsCard.style.display = "none";
    return;
  }
  
  // Compute path using Dijkstra in map.js with live crowd levels and routing preferences
  const path = findShortestPath(VENUE_NODES, VENUE_EDGES, start, end, state.crowdLevels, state.routePreferences);
  state.activePath = path;
  
  // Draw path overlays on both maps
  const orgSvg = document.getElementById("organizer-map-svg");
  drawRoute(fanSvg, path, VENUE_NODES);
  drawRoute(orgSvg, path, VENUE_NODES);
  
  if (path.length > 0) {
    // Calculate values
    // Assume average weight = distance in meters
    let totalDist = 0;
    let hasCongestedNode = false;
    
    for (let i = 0; i < path.length - 1; i++) {
      const edge = VENUE_EDGES.find(e => 
        (e.from === path[i] && e.to === path[i+1]) || 
        (e.from === path[i+1] && e.to === path[i])
      );
      if (edge) {
        totalDist += edge.weight;
      }
      
      // Check if path goes through high crowd node (> 70%)
      const crowd = state.crowdLevels[path[i]];
      if (crowd > 70) {
        hasCongestedNode = true;
      }
    }
    
    // Check end node congestion as well
    if (state.crowdLevels[path[path.length - 1]] > 70) {
      hasCongestedNode = true;
    }

    // Walking speed: 1.4 m/s. Add congestion delay
    let baseTimeSec = totalDist / 1.4;
    if (hasCongestedNode) {
      baseTimeSec += 180; // Add 3 mins delay
    }
    
    const minutes = Math.ceil(baseTimeSec / 60);
    
    // Update Results UI
    resultsCard.style.display = "block";
    routeTime.textContent = `${minutes} min${minutes > 1 ? 's' : ''}`;
    routeDist.textContent = `${totalDist} meters`;
    
    if (hasCongestedNode) {
      congestionWarning.style.display = "flex";
      routeTime.style.color = "var(--color-warning)";
    } else {
      congestionWarning.style.display = "none";
      routeTime.style.color = "var(--neon-cyan)";
    }

    // Toggle custom preferences feedback rows
    const ecoRow = document.getElementById("fan-eco-bonus-row");
    const accessibilityRow = document.getElementById("fan-accessibility-bonus-row");
    
    if (ecoRow) {
      const hasEcoNode = path.some(nodeId => VENUE_NODES[nodeId].type === "eco");
      ecoRow.style.display = (state.routePreferences.eco && hasEcoNode) ? "flex" : "none";
    }
    
    if (accessibilityRow) {
      const hasElevatorNode = path.some(nodeId => VENUE_NODES[nodeId].type === "elevator");
      if (state.routePreferences.accessibility) {
        accessibilityRow.style.display = "flex";
        document.getElementById("fan-accessibility-bonus-text").textContent = hasElevatorNode 
          ? "Utilizing MetLife ADA elevators. 0 stairs." 
          : "Step-free route. Standard ADA ramp access.";
      } else {
        accessibilityRow.style.display = "none";
      }
    }
  } else {
    resultsCard.style.display = "none";
    showToast("No direct routing pathway found between these points.", "error");
  }

  // Refresh maps to update active class border highlights
  renderMapsOnly();
}

// 3. Aegis AI Chat Assistant Control
function setupChatBot() {
  const chatInput = document.getElementById("chat-input-field");
  const sendBtn = document.getElementById("chat-send-btn");
  const quickBtns = document.querySelectorAll(".quick-prompt-btn");
  
  const handleChatSubmit = async () => {
    const text = chatInput.value.trim();
    if (!text) return;
    
    chatInput.value = "";
    appendChatMessage("user", text);
    
    // Show typing indicator
    const typingIndicator = document.getElementById("chat-typing-indicator");
    typingIndicator.style.display = "flex";
    
    // Scroll chat to bottom
    scrollToBottom("chat-messages");

    // Build context state description for Aegis AI
    const context = {
      activeScenario: state.activeScenario,
      crowdLevels: state.crowdLevels,
      volunteerCount: state.volunteerTasks.filter(t => t.status === "In-Progress").length,
      currentLanguage: "English",
      congestedNode: Object.entries(state.crowdLevels)
        .filter(([_, level]) => level > 70)
        .map(([id]) => VENUE_NODES[id].name)
        .join(", ")
    };
    
    // Create new AI bubble to stream text into
    const aiBubble = appendChatMessage("ai", "");
    let bufferText = "";
    
    try {
      await sendMessageToAI({
        prompt: text,
        apiKey: state.apiKey,
        context: context,
        onChunk: (chunk) => {
          bufferText += chunk;
          aiBubble.innerHTML = formatMarkdown(bufferText);
          scrollToBottom("chat-messages");
        },
        onDone: () => {
          typingIndicator.style.display = "none";
          state.chatHistory.push({ role: "user", content: text });
          state.chatHistory.push({ role: "ai", content: bufferText });
        },
        onError: (err) => {
          typingIndicator.style.display = "none";
          aiBubble.innerHTML = "<p style='color:var(--color-danger);'>Failed to fetch response. Check internet connection or API settings.</p>";
        }
      });
    } catch (e) {
      typingIndicator.style.display = "none";
      console.error(e);
    }
  };

  sendBtn.addEventListener("click", handleChatSubmit);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleChatSubmit();
  });
  
  quickBtns.forEach(btn => {
    if (!btn.classList.contains("helper-phrase-btn")) {
      btn.addEventListener("click", () => {
        chatInput.value = btn.getAttribute("data-prompt");
        handleChatSubmit();
      });
    }
  });
}

function appendChatMessage(role, text) {
  const container = document.getElementById("chat-messages");
  const typingIndicator = document.getElementById("chat-typing-indicator");
  
  const msg = document.createElement("div");
  msg.className = `chat-message ${role}`;
  msg.innerHTML = formatMarkdown(text);
  
  // Insert before typing indicator
  container.insertBefore(msg, typingIndicator);
  return msg;
}

// 4. Live translation portal helper in Staff tab
function setupTranslator() {
  const translateBtn = document.getElementById("translator-submit-btn");
  const inputText = document.getElementById("translator-input-text");
  const targetLangSelect = document.getElementById("translator-target-lang");
  const outputBox = document.getElementById("translator-output-box");
  const helperPhraseBtns = document.querySelectorAll(".helper-phrase-btn");
  
  const handleTranslation = async () => {
    const text = inputText.value.trim();
    if (!text) return;
    
    outputBox.innerHTML = "<span style='color: var(--text-muted);'>Translating with Gemini...</span>";
    
    try {
      const translated = await translateText({
        text: text,
        targetLang: targetLangSelect.value,
        apiKey: state.apiKey
      });
      
      outputBox.innerHTML = `<strong style="color: var(--neon-cyan); display:block; margin-bottom: 6px;">Translation (${targetLangSelect.options[targetLangSelect.selectedIndex].text.split(" (")[0]}):</strong>
      <p style="font-size:15px; font-weight: 500;">${translated}</p>`;
    } catch (err) {
      outputBox.innerHTML = `<span style="color: var(--color-danger);">Translation Failed. Please check settings.</span>`;
    }
  };

  translateBtn.addEventListener("click", handleTranslation);
  
  // Quick helper phrase inputs
  helperPhraseBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      inputText.value = btn.getAttribute("data-phrase");
      handleTranslation();
    });
  });
}

// 5. Scenario simulation trigger engine
function setupScenarioSimulator() {
  const simGrid = document.getElementById("sim-scenario-grid");
  
  // Render Simulation Scenarios options inside settings
  simGrid.innerHTML = "";
  for (const key in SIMULATION_SCENARIOS) {
    const scenario = SIMULATION_SCENARIOS[key];
    const triggerCard = document.createElement("div");
    triggerCard.className = `sim-trigger-card ${state.activeScenario === key ? 'active' : ''}`;
    triggerCard.setAttribute("data-scenario-key", key);
    
    triggerCard.innerHTML = `
      <div class="sim-trigger-header">
        <span>${scenario.icon}</span>
        <span>${scenario.name}</span>
      </div>
      <div class="sim-trigger-desc">${scenario.description}</div>
    `;
    
    triggerCard.addEventListener("click", () => {
      triggerOperationalScenario(key);
    });
    
    simGrid.appendChild(triggerCard);
  }
}

function triggerOperationalScenario(key) {
  const scenario = SIMULATION_SCENARIOS[key];
  if (!scenario) return;
  
  state.activeScenario = key;
  
  // Update Scenario cards highlight
  const cards = document.querySelectorAll(".sim-trigger-card");
  cards.forEach(c => {
    c.classList.remove("active");
    if (c.getAttribute("data-scenario-key") === key) {
      c.classList.add("active");
    }
  });
  
  // 1. Modify crowd densities based on scenario config
  for (const nodeId in VENUE_NODES) {
    const baseVal = VENUE_NODES[nodeId].baseCrowd;
    const modifier = scenario.crowdModifiers[nodeId] || 0;
    
    // Bound within 5% - 98%
    state.crowdLevels[nodeId] = Math.max(5, Math.min(98, baseVal + modifier));
  }
  
  // 2. Generate scenario recommendations
  state.recommendations = [...scenario.recommendations];
  
  // 3. Inject new Tasks into the Staff Dashboard
  if (key === "rain") {
    state.volunteerTasks = [
      { id: "task_rain_1", title: "Establish umbrella bins at Gate C (South)", location: "gate_3", assignee: "Unassigned", status: "Pending", priority: "Medium" },
      { id: "task_rain_2", title: "Dry slippery concourse floors near North Concourse", location: "concession_a", assignee: "Volunteer Alex", status: "In-Progress", priority: "High" },
      { id: "task_rain_3", title: "Redirect supporters from flooded outer lawn to Sponsor Expo indoor booths", location: "sponsor_booth", assignee: "Volunteer Chloe", status: "In-Progress", priority: "Medium" },
      ...INITIAL_TASKS.filter(t => t.id !== "task_3")
    ];
  } else if (key === "emergency") {
    state.volunteerTasks = [
      { id: "task_em_1", title: "Erect ticketing lane barricades at Gate B (East)", location: "gate_2", assignee: "Unassigned", status: "Pending", priority: "High" },
      { id: "task_em_2", title: "Direct shuttle bus arrivals at Gate A (North)", location: "gate_1", assignee: "Volunteer Chloe", status: "In-Progress", priority: "High" },
      { id: "task_em_3", title: "Assist lost supporters with train delay schedule translations", location: "info_desk", assignee: "Volunteer Alex", status: "In-Progress", priority: "Medium" }
    ];
  } else if (key === "sponsor") {
    state.volunteerTasks = [
      { id: "task_sp_1", title: "Distribute public transit reward codes to exiting supporters", location: "gate_3", assignee: "Unassigned", status: "Pending", priority: "Medium" },
      { id: "task_sp_2", title: "Direct ADA wheelchair egress queues towards West Gate D Elevator", location: "elevator_lobby", assignee: "Volunteer Chloe", status: "In-Progress", priority: "Low" },
      { id: "task_sp_3", title: "Form orderly line at South recycling refund bins", location: "eco_hub_south", assignee: "Unassigned", status: "Pending", priority: "Low" }
    ];
  } else {
    // Normal resets
    state.volunteerTasks = [...INITIAL_TASKS];
  }
  
  showToast(`Scenario triggered: ${scenario.name}! System updating...`);
  
  // Recalculate path wayfinding automatically if values changed
  if (state.selectedNavNodes.start && state.selectedNavNodes.end) {
    calculateAndDrawPath();
  }
  
  renderAll();
}

// 6. Settings Panel configuration
function setupSettings() {
  const apiKeyField = document.getElementById("settings-api-key");
  const saveBtn = document.getElementById("settings-save-key-btn");
  
  saveBtn.addEventListener("click", () => {
    const key = apiKeyField.value.trim();
    state.apiKey = key;
    localStorage.setItem("gemini_api_key", key);
    
    const apiStatusIndicator = document.getElementById("api-status-indicator");
    const apiStatusText = document.getElementById("api-status-text");
    
    if (key) {
      apiStatusIndicator.className = "status-indicator connected";
      apiStatusText.textContent = "Live Gemini API Ready";
      showToast("Gemini Developer API Key Saved Successfully!");
    } else {
      apiStatusIndicator.className = "status-indicator simulated";
      apiStatusText.textContent = "DC Simulated AI";
      showToast("Key cleared. Reverted to DC Simulated AI.");
    }
    
    renderAll();
  });

  // Theme Switching Event Listeners
  const themeCards = document.querySelectorAll("#theme-selector-grid .theme-card");
  themeCards.forEach(card => {
    card.addEventListener("click", () => {
      const selectedTheme = card.getAttribute("data-theme");
      applyTheme(selectedTheme);
      showToast(`Visual Theme updated to: ${card.querySelector(".theme-card-title").textContent}`);
    });
  });
}

function applyTheme(themeName) {
  state.theme = themeName;
  localStorage.setItem("app_theme", themeName);

  // Update body classes
  const body = document.body;
  body.classList.remove("theme-forest", "theme-sunset", "theme-cyber", "theme-carbon");
  if (themeName !== "midnight") {
    body.classList.add(`theme-${themeName}`);
  }

  // Update active states on the settings cards
  const themeCards = document.querySelectorAll("#theme-selector-grid .theme-card");
  themeCards.forEach(card => {
    if (card.getAttribute("data-theme") === themeName) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });
}

// 7. Render Core Functions
function renderAll() {
  renderStats();
  renderMapsOnly();
  renderRecommendations();
  renderSchedule();
  renderVolunteerTasks();
  renderGenAIHighlights();
}

function renderStats() {
  const attendeesVal = document.getElementById("stat-attendees");
  const waitVal = document.getElementById("stat-wait-time");
  const waitTrend = document.getElementById("stat-wait-trend");
  const staffVal = document.getElementById("stat-staff");
  const alertsVal = document.getElementById("stat-alerts");
  const alertsFooter = document.getElementById("stat-alerts-footer");
  
  // Calculate average crowd level as wait metric
  const totalCrowd = Object.values(state.crowdLevels).reduce((acc, curr) => acc + curr, 0);
  const avgCrowd = Math.round(totalCrowd / Object.keys(state.crowdLevels).length);
  const waitMinutes = Math.round(avgCrowd * 0.3);
  
  waitVal.textContent = `${waitMinutes}m`;
  
  if (state.activeScenario === "normal") {
    attendeesVal.textContent = "12,240";
    staffVal.textContent = "68%";
    waitTrend.innerHTML = '<span class="trend-down">↓ 1.2m</span> vs peak';
  } else if (state.activeScenario === "rain") {
    attendeesVal.textContent = "15,820";
    staffVal.textContent = "95%";
    waitTrend.innerHTML = '<span class="trend-up">↑ 6.4m</span> rain delay';
  } else if (state.activeScenario === "emergency") {
    attendeesVal.textContent = "13,110";
    staffVal.textContent = "90%";
    waitTrend.innerHTML = '<span class="trend-up">↑ 12m</span> scanner lockout';
  } else if (state.activeScenario === "sponsor") {
    attendeesVal.textContent = "14,560";
    staffVal.textContent = "85%";
    waitTrend.innerHTML = '<span class="trend-up">↑ 4.2m</span> event rush';
  }

  const alertCount = state.recommendations.length;
  alertsVal.textContent = alertCount;
  alertsVal.style.color = alertCount > 0 ? "var(--color-warning)" : "var(--color-success)";
  alertsFooter.textContent = alertCount > 0 ? `${alertCount} operations action pending` : "All systems normal";
}

function renderMapsOnly() {
  const orgSvg = document.getElementById("organizer-map-svg");
  const fanSvg = document.getElementById("fan-map-svg");
  
  // Re-render SVG nodes
  renderVenueMap(orgSvg, VENUE_NODES, VENUE_EDGES, state.crowdLevels, handleNodeClick, state.selectedNavNodes);
  renderVenueMap(fanSvg, VENUE_NODES, VENUE_EDGES, state.crowdLevels, handleNodeClick, state.selectedNavNodes);
  
  // Redraw active wayfinding route if any
  if (state.activePath.length > 0) {
    drawRoute(orgSvg, state.activePath, VENUE_NODES);
    drawRoute(fanSvg, state.activePath, VENUE_NODES);
  }
}

function renderRecommendations() {
  const recList = document.getElementById("ai-recommendations");
  recList.innerHTML = "";
  
  if (state.recommendations.length === 0) {
    recList.innerHTML = `
      <div style="text-align: center; padding: 20px 0; color: var(--text-secondary); font-size:13.5px;">
        ✅ No pending recommendations. All systems optimized!
      </div>
    `;
    return;
  }
  
  state.recommendations.forEach(rec => {
    const recDiv = document.createElement("div");
    recDiv.className = `rec-item ${rec.type}`;
    
    let typeLabel = "INFO";
    if (rec.type === "warning") typeLabel = "WARNING";
    if (rec.type === "danger") typeLabel = "CRITICAL ACTION";
    
    recDiv.innerHTML = `
      <div class="rec-title-row ${rec.type}">
        <span>🤖</span>
        <span>${typeLabel} Recommendation</span>
      </div>
      <div class="rec-text">${rec.text}</div>
      <button class="rec-button" data-id="${rec.id}">${rec.actionLabel}</button>
    `;
    
    // Add event listener to recommendation button
    const btn = recDiv.querySelector(".rec-button");
    btn.addEventListener("click", () => {
      approveAIRecommendation(rec.id);
    });
    
    recList.appendChild(recDiv);
  });
}

// Executes operational changes when organizers approve AI suggestions
function approveAIRecommendation(recId) {
  // Remove recommendation
  state.recommendations = state.recommendations.filter(r => r.id !== recId);
  
  // Implement state modifications to show visual results immediately!
  if (recId === "rec_rain_1") {
    // Authorize Annex queue
    state.crowdLevels.concession_b = Math.max(10, state.crowdLevels.concession_b - 25);
    state.volunteerTasks.push({
      id: "task_added_rain_1",
      title: "Supervise emergency overflow queue at Concession B",
      location: "concession_b",
      assignee: "Unassigned",
      status: "Pending",
      priority: "Medium"
    });
    showToast("Emergency queue authorized. Concession B pressure reduced.");
  } 
  else if (recId === "rec_rain_2") {
    // Redirect Restroom B traffic to Restroom A
    state.crowdLevels.restroom_b = Math.max(10, state.crowdLevels.restroom_b - 20);
    state.crowdLevels.restroom_a = Math.min(95, state.crowdLevels.restroom_a + 12);
    showToast("Digital signage updated. Concourse restroom loads redistributed.");
  }
  else if (recId === "rec_em_1") {
    // Egress shuttle reroute
    state.crowdLevels.gate_2 = Math.max(10, state.crowdLevels.gate_2 - 45);
    state.crowdLevels.gate_1 = Math.min(95, state.crowdLevels.gate_1 + 25);
    state.volunteerTasks.push({
      id: "task_added_em_1",
      title: "Direct shuttle arrivals from Gate 2 detour to Gate 1",
      location: "gate_1",
      assignee: "Unassigned",
      status: "Pending",
      priority: "High"
    });
    showToast("Shuttles redirected to Gate 1. Gate 2 egress clear.");
  }
  else if (recId === "rec_em_2") {
    // Translation kiosks
    state.crowdLevels.info_desk = Math.max(5, state.crowdLevels.info_desk - 15);
    showToast("Automated AI Translation kiosks activated at central concourse.");
  }
  else if (recId === "rec_sp_1") {
    // Sponsor pedestrian loop
    state.crowdLevels.sponsor_booth = Math.max(10, state.crowdLevels.sponsor_booth - 20);
    showToast("Pedestrian loop barriers deployed. Expo zone crowd flowing.");
  }
  else if (recId === "rec_sp_2") {
    // Shift VIP Gate staff
    state.crowdLevels.sponsor_booth = Math.max(10, state.crowdLevels.sponsor_booth - 12);
    state.crowdLevels.gate_4 = Math.min(95, state.crowdLevels.gate_4 + 5);
    showToast("Gate 4 backup staff diverted to Sponsor Expo zone.");
  } else {
    showToast("AI operational action approved and executed.");
  }
  
  // Recalculate routing paths if endpoints are selected
  if (state.selectedNavNodes.start && state.selectedNavNodes.end) {
    calculateAndDrawPath();
  }
  
  renderAll();
}

function renderGenAIHighlights() {
  const container = document.getElementById("genai-highlight-list");
  if (!container) return;

  container.innerHTML = "";

  const highlights = [
    {
      title: "AI Navigation Assistant (ADA & Eco)",
      text: "Real-time Dijkstra routing. Toggle Accessibility to utilize MetLife ADA Elevator loops, or Eco-mode to map via Sustainability Hubs."
    },
    {
      title: "FIFA Crowd Intelligence",
      text: "Generative AI monitors stadium entrance bottlenecks (NJ Transit rail outage, thunderstorm) and provides operations briefings."
    },
    {
      title: "Multilingual Assistance Desk",
      text: "Supporters and volunteer staff receive instant voice translation for international teams (Spanish, French, Hindi, Japanese)."
    },
    {
      title: "Green & Accessible Operations",
      text: "GenAI supports real-time solar energy status, plastic bottle savings tracking, and ADA helper tasks assignments."
    }
  ];

  highlights.forEach((item) => {
    const card = document.createElement("div");
    card.className = "genai-highlight-card";
    card.innerHTML = `
      <h4>${item.title}</h4>
      <p>${item.text}</p>
    `;
    container.appendChild(card);
  });

  const summary = document.getElementById("genai-operations-summary");
  if (summary) {
    let energySavings = 85;
    if (state.activeScenario === "rain") energySavings = 35;
    if (state.activeScenario === "emergency") energySavings = 75;
    if (state.activeScenario === "sponsor") energySavings = 90;

    let plasticSaved = 1420;
    if (state.routePreferences.eco) plasticSaved += 320;
    if (state.activeScenario === "sponsor") plasticSaved += 480;

    summary.textContent = buildOperationalIntelligenceSummary({
      activeScenario: state.activeScenario,
      crowdLevels: state.crowdLevels,
      volunteerCount: state.volunteerTasks.filter((task) => task.status === "In-Progress").length,
      accessibilityRequests: state.volunteerTasks.filter(t => t.location === "gate_4" || t.location === "elevator_lobby" || t.title.toLowerCase().includes("wheelchair") || t.title.toLowerCase().includes("ada")).length + 2,
      transportDemand: state.activeScenario === "emergency" ? 8 : 4,
      plasticSaved: plasticSaved,
      energySavings: energySavings
    });
  }
}

function renderSchedule() {
  const scheduleContainer = document.getElementById("schedule-list");
  scheduleContainer.innerHTML = "";
  
  EVENT_SCHEDULE.forEach(ev => {
    const evDiv = document.createElement("div");
    evDiv.className = "event-item";
    
    let statusClass = "upcoming";
    if (ev.status === "Completed") statusClass = "completed";
    if (ev.status === "Ongoing") statusClass = "ongoing";
    
    evDiv.innerHTML = `
      <div class="event-details">
        <h4>${ev.event}</h4>
        <span>${ev.time} • ${ev.sector}</span>
      </div>
      <span class="event-status ${statusClass}">${ev.status}</span>
    `;
    scheduleContainer.appendChild(evDiv);
  });
}

function renderVolunteerTasks() {
  const taskContainer = document.getElementById("volunteer-task-list");
  taskContainer.innerHTML = "";
  
  if (state.volunteerTasks.length === 0) {
    taskContainer.innerHTML = `
      <div style="text-align: center; padding: 20px 0; color: var(--text-secondary); font-size:13.5px;">
        No active tasks. Outstanding work completed!
      </div>
    `;
    return;
  }
  
  state.volunteerTasks.forEach(task => {
    const card = document.createElement("div");
    card.className = `task-card priority-${task.priority.toLowerCase()}`;
    
    const locName = VENUE_NODES[task.location]?.name.split(" (")[0] || task.location;
    
    card.innerHTML = `
      <div class="task-header">
        <h4 class="task-title">${task.title}</h4>
        <span class="task-priority-badge ${task.priority.toLowerCase()}">${task.priority}</span>
      </div>
      <div class="task-details-row">
        <div class="task-detail-item">📍 <span>${locName}</span></div>
        <div class="task-detail-item">👤 <span>${task.assignee}</span></div>
        <div class="task-detail-item">🏷️ <span>${task.status}</span></div>
      </div>
      <div class="task-actions">
        ${task.status === "Pending" ? 
          `<button class="task-btn claim" data-id="${task.id}">Claim Task</button>` : 
          (task.status === "In-Progress" ? 
            `<button class="task-btn complete" data-id="${task.id}">Mark Complete</button>` : 
            `<span style="color:var(--color-success); font-size:12px; font-weight:600; padding: 4px;">✓ Completed</span>`
          )
        }
      </div>
    `;
    
    // Wire up buttons
    const claimBtn = card.querySelector(".task-btn.claim");
    if (claimBtn) {
      claimBtn.addEventListener("click", () => {
        task.assignee = "You (Volunteer)";
        task.status = "In-Progress";
        showToast("Task claimed: " + task.title);
        renderAll();
      });
    }
    
    const completeBtn = card.querySelector(".task-btn.complete");
    if (completeBtn) {
      completeBtn.addEventListener("click", () => {
        task.status = "Completed";
        showToast("Task completed! Well done.");
        // Clean completed tasks after brief delay for visual feedback
        setTimeout(() => {
          state.volunteerTasks = state.volunteerTasks.filter(t => t.id !== task.id);
          renderAll();
        }, 1000);
        renderAll();
      });
    }
    
    taskContainer.appendChild(card);
  });
}

// 8. Visual Toast Notifications & Markdown formatting helpers
function showToast(message, type = "success") {
  // Remove existing toasts
  const oldToast = document.getElementById("toast-toast");
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement("div");
  toast.setAttribute("id", "toast-toast");
  toast.className = "toast-notification";
  
  if (type === "error") {
    toast.style.backgroundColor = "var(--color-danger)";
    toast.style.borderColor = "rgba(239, 68, 68, 0.4)";
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function scrollToBottom(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}

function formatMarkdown(text) {
  // Simple regex markdown parsing for UI chat visualization
  let html = text;
  
  // Replace bold strings: **text** -> <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Replace items list
  html = html.replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Replace newlines with breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

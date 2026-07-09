// Venue Map and Simulation Data Models

export const VENUE_NODES = {
  "gate_1": { id: "gate_1", name: "Gate 1 (North Entrance)", type: "gate", x: 400, y: 40, baseCrowd: 35, description: "Main entry point from north parking." },
  "gate_2": { id: "gate_2", name: "Gate 2 (East Entrance)", type: "gate", x: 740, y: 250, baseCrowd: 20, description: "East shuttle drop-off entry." },
  "gate_3": { id: "gate_3", name: "Gate 3 (South Entrance)", type: "gate", x: 400, y: 460, baseCrowd: 50, description: "Primary public transport entrance." },
  "gate_4": { id: "gate_4", name: "Gate 4 (West VIP Entrance)", type: "gate", x: 60, y: 250, baseCrowd: 15, description: "VIP, Sponsor & Media entrance." },
  
  "concession_a": { id: "concession_a", name: "Concession Zone A (North)", type: "food", x: 580, y: 110, baseCrowd: 65, description: "Burger Bar, Brews & Snacks." },
  "concession_b": { id: "concession_b", name: "Concession Zone B (South)", type: "food", x: 220, y: 390, baseCrowd: 40, description: "Tacos, Pizza & Smoothies." },
  
  "restroom_a": { id: "restroom_a", name: "Restrooms A", type: "restroom", x: 220, y: 110, baseCrowd: 30, description: "Male, Female & Accessible Restrooms." },
  "restroom_b": { id: "restroom_b", name: "Restrooms B", type: "restroom", x: 580, y: 390, baseCrowd: 45, description: "Male, Female & Accessible Restrooms." },
  
  "info_desk": { id: "info_desk", name: "Information Center", type: "info", x: 400, y: 250, baseCrowd: 15, description: "General inquiries, lost & found, translations." },
  "sponsor_booth": { id: "sponsor_booth", name: "Sponsor Expo Pavilion", type: "info", x: 560, y: 250, baseCrowd: 55, description: "Interactive sponsor booths & giveaways." },
  
  "sector_101": { id: "sector_101", name: "Seating Sector 101", type: "seating", x: 300, y: 170, baseCrowd: 60, description: "North-West Tier Seating." },
  "sector_102": { id: "sector_102", name: "Seating Sector 102", type: "seating", x: 500, y: 170, baseCrowd: 75, description: "North-East Tier Seating." },
  "sector_103": { id: "sector_103", name: "Seating Sector 103", type: "seating", x: 300, y: 330, baseCrowd: 45, description: "South-West Tier Seating." },
  "sector_104": { id: "sector_104", name: "Seating Sector 104", type: "seating", x: 500, y: 330, baseCrowd: 80, description: "South-East Tier Seating." }
};

// Map connections for navigation routing (Dijkstra algorithm)
export const VENUE_EDGES = [
  { from: "gate_1", to: "restroom_a", weight: 180 },
  { from: "gate_1", to: "concession_a", weight: 180 },
  { from: "gate_1", to: "sector_101", weight: 160 },
  { from: "gate_1", to: "sector_102", weight: 160 },
  
  { from: "gate_2", to: "concession_a", weight: 200 },
  { from: "gate_2", to: "sponsor_booth", weight: 180 },
  { from: "gate_2", to: "sector_102", weight: 250 },
  { from: "gate_2", to: "sector_104", weight: 250 },
  { from: "gate_2", to: "restroom_b", weight: 200 },
  
  { from: "gate_3", to: "restroom_b", weight: 180 },
  { from: "gate_3", to: "concession_b", weight: 180 },
  { from: "gate_3", to: "sector_103", weight: 160 },
  { from: "gate_3", to: "sector_104", weight: 160 },
  
  { from: "gate_4", to: "concession_b", weight: 200 },
  { from: "gate_4", to: "restroom_a", weight: 200 },
  { from: "gate_4", to: "sector_101", weight: 250 },
  { from: "gate_4", to: "sector_103", weight: 250 },
  { from: "gate_4", to: "info_desk", weight: 340 },
  
  { from: "info_desk", to: "sector_101", weight: 130 },
  { from: "info_desk", to: "sector_102", weight: 130 },
  { from: "info_desk", to: "sector_103", weight: 130 },
  { from: "info_desk", to: "sector_104", weight: 130 },
  { from: "info_desk", to: "sponsor_booth", weight: 160 },
  { from: "info_desk", to: "restroom_a", weight: 230 },
  { from: "info_desk", to: "restroom_b", weight: 230 },
  { from: "info_desk", to: "concession_a", weight: 230 },
  { from: "info_desk", to: "concession_b", weight: 230 }
];

export const EVENT_SCHEDULE = [
  { time: "09:00 AM", event: "Gates Open & Morning Rush", sector: "All Gates", status: "Completed" },
  { time: "10:30 AM", event: "Tournament Opening Ceremony", sector: "Main Field / All Sectors", status: "Completed" },
  { time: "02:00 PM", event: "Quarter Finals - Match A (Tennis Singles)", sector: "Sectors 101, 102", status: "Ongoing" },
  { time: "04:30 PM", event: "Quarter Finals - Match B (Tennis Singles)", sector: "Sectors 103, 104", status: "Upcoming" },
  { time: "07:30 PM", event: "Semifinals & Sponsor Showdowns", sector: "All Sectors & Expo Zone", status: "Upcoming" }
];

export const INITIAL_TASKS = [
  { id: "task_1", title: "Assist queue flow at Gate 3", location: "gate_3", assignee: "Volunteer Alex", status: "In-Progress", priority: "High" },
  { id: "task_2", title: "Information assistance for French tour group", location: "info_desk", assignee: "Volunteer Chloe", status: "In-Progress", priority: "Medium" },
  { id: "task_3", title: "Check concession scanner issue", location: "concession_b", assignee: "Unassigned", status: "Pending", priority: "Low" }
];

export const SIMULATION_SCENARIOS = {
  "normal": {
    name: "Normal Operations",
    icon: "🟢",
    description: "Standard crowd conditions. Moderate waiting times.",
    crowdModifiers: {},
    recommendations: [
      { id: "rec_normal_1", type: "info", text: "Crowd distribution is balanced. Maintain standard staff rotation.", actionLabel: "Refresh Patrols" }
    ]
  },
  "rain": {
    name: "Sudden Rainstorm",
    icon: "🌧️",
    description: "Heavy downpour outside. Visitors are rushing inside. Outdoor seating is empty, and indoor food courts and restrooms are severely congested.",
    crowdModifiers: {
      "gate_1": 15,
      "gate_3": 25,
      "concession_a": 30,
      "concession_b": 45,
      "restroom_a": 40,
      "restroom_b": 35,
      "sponsor_booth": 20,
      "sector_101": -10,
      "sector_103": -10
    },
    recommendations: [
      { id: "rec_rain_1", type: "warning", text: "Concession B queue has exceeded safety boundaries. Action: Open emergency annex queue space and dispatch 2 staff to manage lines.", actionLabel: "Authorize Annex Queue" },
      { id: "rec_rain_2", type: "warning", text: "Heavy crowding at South Restrooms (B). Action: Update digital billboards to direct visitors to North Restrooms (A).", actionLabel: "Redirect Signs" }
    ]
  },
  "emergency": {
    name: "Gate 2 Scanner Outage",
    icon: "⚠️",
    description: "Gate 2 ticketing scanners fail. Ticket processing is halted. Crowds build up outside Gate 2, and security needs to divert them to Gate 1 and Gate 3.",
    crowdModifiers: {
      "gate_2": 65,
      "gate_1": 30,
      "gate_3": 20,
      "info_desk": 25
    },
    recommendations: [
      { id: "rec_em_1", type: "danger", text: "Gate 2 backlog is blocking safety egress. Action: Halt Gate 2 entries, redirect incoming shuttles to Gate 1, and dispatch 4 volunteers to guide current crowd.", actionLabel: "Enact Shuttle Reroute" },
      { id: "rec_em_2", type: "warning", text: "Increased translation demands at Info Desk. Action: Enable AI Multi-lingual Assist on info kiosks.", actionLabel: "Deploy Translation Kiosks" }
    ]
  },
  "sponsor": {
    name: "Sponsor Celebrity Appearance",
    icon: "⭐",
    description: "A popular athlete arrives at the Sponsor Expo Pavilion. Massive crowd congestion in the center corridor.",
    crowdModifiers: {
      "sponsor_booth": 45,
      "info_desk": 20,
      "sector_102": 15,
      "sector_104": 15
    },
    recommendations: [
      { id: "rec_sp_1", type: "warning", text: "Sponsor Pavilion crowd is spilling into seating corridors. Action: Erect crowd barrier gates and establish a one-way pedestrian loop.", actionLabel: "Deploy Corridors" },
      { id: "rec_sp_2", type: "info", text: "VIP Gate 4 has low volume. Action: Divert VIP staff to assist with security at the Expo Zone.", actionLabel: "Shift VIP Staff" }
    ]
  }
};

// Venue Map and Simulation Data Models for FIFA World Cup 2026 - MetLife Stadium (NY/NJ)

export const VENUE_NODES = {
  // Gates (MetLife Entrances & Transit Hubs)
  "gate_1": { id: "gate_1", name: "Gate A (North Entrance & Ride-Share)", type: "gate", x: 400, y: 40, baseCrowd: 35, description: "North entrance gate. Dedicated ride-share pickup zone and parking access." },
  "gate_2": { id: "gate_2", name: "Gate B (East Entrance & Shuttles)", type: "gate", x: 740, y: 250, baseCrowd: 20, description: "East entrance gate. Shuttle bus drop-off points and parking fields." },
  "gate_3": { id: "gate_3", name: "Gate C (South Entrance & NJ Transit)", type: "gate", x: 400, y: 460, baseCrowd: 50, description: "Primary entrance from NJ Transit Train Stadium Station." },
  "gate_4": { id: "gate_4", name: "Gate D (West VIP & Media Entrance)", type: "gate", x: 60, y: 250, baseCrowd: 15, description: "West entrance. Dedicated security screening for VIPs, media, and accessibility arrivals." },
  
  // Concessions
  "concession_a": { id: "concession_a", name: "Concession Area North (Burgers & Dogs)", type: "food", x: 580, y: 110, baseCrowd: 65, description: "North upper concourse concession zone. Serving stadium burgers and local craft beers." },
  "concession_b": { id: "concession_b", name: "Concession Area South (Tacos & Empanadas)", type: "food", x: 220, y: 390, baseCrowd: 40, description: "South lower concourse concession zone. Serving street tacos, empanadas, and cold drinks." },
  
  // Restrooms
  "restroom_a": { id: "restroom_a", name: "Restrooms Block A (North-West)", type: "restroom", x: 220, y: 110, baseCrowd: 30, description: "Male, Female, All-Gender, and Wheelchair-Accessible Restrooms." },
  "restroom_b": { id: "restroom_b", name: "Restrooms Block B (South-East)", type: "restroom", x: 580, y: 390, baseCrowd: 45, description: "Male, Female, All-Gender, and Wheelchair-Accessible Restrooms." },
  
  // Information & Expo
  "info_desk": { id: "info_desk", name: "Central Guest Services & ADA Hub", type: "info", x: 400, y: 250, baseCrowd: 15, description: "General inquiries, lost and found, multilingual assistance, and wheelchair dispatch." },
  "sponsor_booth": { id: "sponsor_booth", name: "FIFA Fan Festival & Sponsor Expo", type: "info", x: 560, y: 250, baseCrowd: 55, description: "FIFA Fan Festival zone with interactive sponsor kiosks, games, and merchandise booths." },
  
  // Seating Sectors / Stands
  "sector_101": { id: "sector_101", name: "Section 110 (North Stand - USA Fan Club)", type: "seating", x: 300, y: 170, baseCrowd: 60, description: "North lower tier seating. Home of the USA supporter fan club." },
  "sector_102": { id: "sector_102", name: "Section 120 (East Stand Mid-Tier)", type: "seating", x: 500, y: 170, baseCrowd: 75, description: "East tier stadium seating. Standard spectator tickets." },
  "sector_103": { id: "sector_103", name: "Section 130 (South Stand - England Supporters)", type: "seating", x: 300, y: 330, baseCrowd: 45, description: "South lower tier seating. Dedicated England national team supporters section." },
  "sector_104": { id: "sector_104", name: "Section 140 (West Stand - Club Suite & VIP)", type: "seating", x: 500, y: 330, baseCrowd: 80, description: "West premium tier seating. VIP boxes, corporate suites, and media boxes." },

  // [NEW] Sustainability & Accessibility specific nodes
  "eco_hub_north": { id: "eco_hub_north", name: "North Sustainability Hub", type: "eco", x: 500, y: 95, baseCrowd: 15, description: "Eco-friendly recycling center and solar-powered water refill station." },
  "eco_hub_south": { id: "eco_hub_south", name: "South Sustainability Hub", type: "eco", x: 300, y: 405, baseCrowd: 15, description: "Eco-friendly recycling center and solar-powered water refill station." },
  "elevator_lobby": { id: "elevator_lobby", name: "Central ADA Elevator Lobby", type: "elevator", x: 320, y: 250, baseCrowd: 20, description: "ADA Elevator lobby providing direct wheelchair ramp access to all premium seating suites." }
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
  { from: "info_desk", to: "concession_b", weight: 230 },

  // [NEW] Connections to Sustainability & Accessibility nodes
  { from: "gate_1", to: "eco_hub_north", weight: 100 },
  { from: "concession_a", to: "eco_hub_north", weight: 80 },
  { from: "sector_102", to: "eco_hub_north", weight: 80 },

  { from: "gate_3", to: "eco_hub_south", weight: 100 },
  { from: "concession_b", to: "eco_hub_south", weight: 80 },
  { from: "sector_103", to: "eco_hub_south", weight: 80 },

  { from: "gate_4", to: "elevator_lobby", weight: 120 },
  { from: "info_desk", to: "elevator_lobby", weight: 80 },
  { from: "sector_101", to: "elevator_lobby", weight: 100 },
  { from: "sector_103", to: "elevator_lobby", weight: 100 }
];

export const EVENT_SCHEDULE = [
  { time: "01:00 PM", event: "Stadium Gates & Security Screening Open", sector: "All Gates", status: "Completed" },
  { time: "03:30 PM", event: "FIFA Fan Festival Live Concert & sponsor show", sector: "Expo Zone", status: "Completed" },
  { time: "06:00 PM", event: "Group B Match: USA vs England", sector: "MetLife Pitch / Seating Areas", status: "Ongoing" },
  { time: "08:30 PM", event: "Group B Match: Mexico vs Argentina", sector: "MetLife Pitch / Seating Areas", status: "Upcoming" },
  { time: "11:00 PM", event: "Post-Match Transit Egress & Eco-Cleanup", sector: "Egress Gates & Train Station", status: "Upcoming" }
];

export const INITIAL_TASKS = [
  { id: "task_1", title: "Assist wheelchair entry queue at Gate D", location: "gate_4", assignee: "Volunteer Alex", status: "In-Progress", priority: "High" },
  { id: "task_2", title: "Guide French tour group to Sector 140 Club Suites", location: "info_desk", assignee: "Volunteer Chloe", status: "In-Progress", priority: "Medium" },
  { id: "task_3", title: "Refill plastic cups & check eco water filtration pressure", location: "eco_hub_south", assignee: "Unassigned", status: "Pending", priority: "Low" }
];

export const SIMULATION_SCENARIOS = {
  "normal": {
    name: "Normal Matchday (USA vs England)",
    icon: "⚽",
    description: "Standard FIFA crowd conditions. Fan Fest active, ticket gates flowing, moderate concession waits.",
    crowdModifiers: {},
    recommendations: [
      { id: "rec_normal_1", type: "info", text: "Crowd distribution is balanced. Maintain standard staff rotation.", actionLabel: "Refresh Patrols" }
    ]
  },
  "rain": {
    name: "Sudden Thunderstorm",
    icon: "⛈️",
    description: "Severe weather alert. Heavy rain closes the outdoor Fan Festival. Fans rush inside. Concourse concession areas and restrooms are heavily congested.",
    crowdModifiers: {
      "gate_1": 15,
      "gate_3": 25,
      "concession_a": 30,
      "concession_b": 45,
      "restroom_a": 40,
      "restroom_b": 35,
      "sponsor_booth": -40, // People leaving outdoors
      "sector_101": -10,
      "sector_103": -10
    },
    recommendations: [
      { id: "rec_rain_1", type: "warning", text: "Concession Zone South queue exceeds safety parameters. Action: Open emergency annex lines and dispatch 2 staff to manage lines.", actionLabel: "Authorize Annex Queue" },
      { id: "rec_rain_2", type: "warning", text: "Heavy crowding at South Restrooms. Action: Update digital billboard mapping to direct fans to North Restrooms.", actionLabel: "Redirect Signs" }
    ]
  },
  "emergency": {
    name: "NJ Transit Train Delay",
    icon: "🚇",
    description: "NJ Transit rails face a temporary power outage. MetLife train station platform overflows. Crowds accumulate heavily outside Gates B and C.",
    crowdModifiers: {
      "gate_3": 55,
      "gate_2": 40,
      "gate_1": 15,
      "info_desk": 25
    },
    recommendations: [
      { id: "rec_em_1", type: "danger", text: "Gate C ticket scan backlog poses safety risk. Action: Halt transit station flow, reroute shuttle buses to Gate A, dispatch 4 volunteers to guide crowd.", actionLabel: "Enact Shuttle Reroute" },
      { id: "rec_em_2", type: "warning", text: "Heavy translation and transit directions requests at Info Desk. Action: Deploy AI Multilingual Support tablets to field staff.", actionLabel: "Deploy Translation Kiosks" }
    ]
  },
  "sponsor": {
    name: "Post-Match Exit Rush",
    icon: "🚶‍♂️",
    description: "Match ends in a dramatic 2-2 draw. 80,000 fans begin egress. High congestion at all exit gates, especially public transit routes.",
    crowdModifiers: {
      "gate_1": 40,
      "gate_2": 35,
      "gate_3": 50,
      "gate_4": 20,
      "info_desk": 15,
      "sector_101": -45,
      "sector_102": -45,
      "sector_103": -45,
      "sector_104": -45
    },
    recommendations: [
      { id: "rec_sp_1", type: "warning", text: "Transit egress bottlenecking at Gate C. Action: Activate green transit rewards on fan app (discount codes for train riders) and set one-way exit lanes.", actionLabel: "Deploy Corridors" },
      { id: "rec_sp_2", type: "info", text: "VIP West Gate D is operating at low volume. Action: Divert 3 VIP customer reps to South Gates to help clear crowds.", actionLabel: "Shift VIP Staff" }
    ]
  }
};

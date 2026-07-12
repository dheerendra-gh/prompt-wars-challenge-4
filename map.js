// Interactive SVG Map Renderer and Wayfinding Dijkstra Engine

/**
 * Dijkstra Shortest Path Algorithm
 * Returns an array of node IDs representing the path from startId to endId.
 */
export function findShortestPath(nodes, edges, startId, endId, crowdLevels = {}, preferences = { accessibility: false, eco: false }) {
  if (!nodes[startId] || !nodes[endId]) return [];
  if (startId === endId) return [startId];

  const distances = {};
  const previous = {};
  const unvisited = new Set();

  // Initialize
  for (const nodeId in nodes) {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
    unvisited.add(nodeId);
  }
  distances[startId] = 0;

  while (unvisited.size > 0) {
    // Find node in unvisited set with minimum distance
    let currentId = null;
    let minDistance = Infinity;
    
    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentId = nodeId;
      }
    }

    if (currentId === null || currentId === endId) {
      break;
    }

    unvisited.delete(currentId);

    // Get neighbors of currentId
    const neighbors = edges.filter(e => e.from === currentId || e.to === currentId);
    
    for (const edge of neighbors) {
      const neighborId = edge.from === currentId ? edge.to : edge.from;
      if (!unvisited.has(neighborId)) continue;

      // Get live crowd level
      const nodeCrowd = crowdLevels[neighborId] || nodes[neighborId].baseCrowd || 0;
      
      // Base distance weight
      let weight = edge.weight;

      // Normal congestion penalty
      let congestionPenalty = 0;
      if (nodeCrowd > 70) {
        congestionPenalty = edge.weight * 2.5;
      } else if (nodeCrowd > 40) {
        congestionPenalty = edge.weight * 1.5;
      }
      
      // Preference modifiers
      let preferenceModifier = 0;
      
      if (preferences.accessibility) {
        // Accessibility Mode:
        // - Large penalty for crowded zones (strollers, wheelchairs struggle with high crowd density)
        if (nodeCrowd > 70) {
          preferenceModifier += 500;
        } else if (nodeCrowd > 40) {
          preferenceModifier += 200;
        }
        
        // - Heavy preference (discount) for elevators
        if (nodes[neighborId].type === "elevator") {
          preferenceModifier -= 150;
        }
      }
      
      if (preferences.eco) {
        // Eco-Friendly Mode:
        // - Heavy preference (discount) for passing green/eco water hubs
        if (nodes[neighborId].type === "eco") {
          preferenceModifier -= 180;
        }
      }

      // Ensure final edge weight is non-negative and has a small baseline to avoid zero/negative loops
      const finalWeight = Math.max(10, weight + congestionPenalty + preferenceModifier);
      
      const tentativeDistance = distances[currentId] + finalWeight;
      
      if (tentativeDistance < distances[neighborId]) {
        distances[neighborId] = tentativeDistance;
        previous[neighborId] = currentId;
      }
    }
  }

  // Reconstruct path
  const path = [];
  let u = endId;
  while (u !== null) {
    path.unshift(u);
    u = previous[u];
  }

  return path[0] === startId ? path : [];
}

/**
 * Renders the main venue SVG map layout into the provided SVG container
 */
export function renderVenueMap(svgEl, nodes, edges, crowdLevels = {}, onNodeClick = null, selectedNodes = { start: null, end: null }) {
  if (!svgEl) return;
  svgEl.innerHTML = ""; // Clear existing

  // 1. Draw Stadium Oval Boundary
  const stadiumOutline = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  stadiumOutline.setAttribute("cx", "400");
  stadiumOutline.setAttribute("cy", "250");
  stadiumOutline.setAttribute("rx", "360");
  stadiumOutline.setAttribute("ry", "220");
  stadiumOutline.setAttribute("fill", "none");
  stadiumOutline.setAttribute("stroke", "rgba(255, 255, 255, 0.05)");
  stadiumOutline.setAttribute("stroke-width", "4");
  svgEl.appendChild(stadiumOutline);

  const innerTrack = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
  innerTrack.setAttribute("cx", "400");
  innerTrack.setAttribute("cy", "250");
  innerTrack.setAttribute("rx", "180");
  innerTrack.setAttribute("ry", "90");
  innerTrack.setAttribute("fill", "rgba(16, 185, 129, 0.02)");
  innerTrack.setAttribute("stroke", "rgba(255, 255, 255, 0.03)");
  innerTrack.setAttribute("stroke-width", "2");
  svgEl.appendChild(innerTrack);

  // 2. Draw Edges (Paths)
  edges.forEach((edge, index) => {
    const nodeFrom = nodes[edge.from];
    const nodeTo = nodes[edge.to];
    if (nodeFrom && nodeTo) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", nodeFrom.x);
      line.setAttribute("y1", nodeFrom.y);
      line.setAttribute("x2", nodeTo.x);
      line.setAttribute("y2", nodeTo.y);
      line.setAttribute("class", "svg-edge");
      line.setAttribute("id", `edge-${edge.from}-${edge.to}`);
      svgEl.appendChild(line);
    }
  });

  // 3. Draw Active Route Line (Overlay layer)
  const routeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  routeGroup.setAttribute("id", "route-overlay-group");
  svgEl.appendChild(routeGroup);

  // 4. Draw Nodes
  for (const nodeId in nodes) {
    const node = nodes[nodeId];
    const crowd = crowdLevels[nodeId] || node.baseCrowd;
    
    // Determine crowd density classification
    let densityClass = "crowd-low";
    if (crowd > 70) densityClass = "crowd-high";
    else if (crowd > 40) densityClass = "crowd-med";

    const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeG.setAttribute("class", `svg-node ${densityClass} node-type-${node.type}`);
    nodeG.setAttribute("data-id", nodeId);
    nodeG.setAttribute("tabindex", "0");
    nodeG.setAttribute("role", "button");
    nodeG.setAttribute("aria-label", `${node.name}. Capacity crowd load: ${crowd}%. Type: ${node.type}`);
    
    if (selectedNodes.start === nodeId || selectedNodes.end === nodeId) {
      nodeG.classList.add("selected-node");
    }

    // Node Circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", "12");
    
    // Add pulsing elements for very crowded zones
    if (crowd > 75) {
      const pulseCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulseCircle.setAttribute("cx", node.x);
      pulseCircle.setAttribute("cy", node.y);
      pulseCircle.setAttribute("r", "18");
      pulseCircle.setAttribute("fill", "none");
      pulseCircle.setAttribute("stroke", "var(--color-danger)");
      pulseCircle.setAttribute("stroke-width", "1.5");
      pulseCircle.setAttribute("opacity", "0.7");
      
      const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animate.setAttribute("attributeName", "r");
      animate.setAttribute("values", "12;24;12");
      animate.setAttribute("dur", "2s");
      animate.setAttribute("repeatCount", "indefinite");
      
      const animateOp = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      animateOp.setAttribute("attributeName", "opacity");
      animateOp.setAttribute("values", "0.7;0;0.7");
      animateOp.setAttribute("dur", "2s");
      animateOp.setAttribute("repeatCount", "indefinite");

      pulseCircle.appendChild(animate);
      pulseCircle.appendChild(animateOp);
      nodeG.appendChild(pulseCircle);
    }

    // Node Icons based on Type
    let nodeIcon = "📍";
    if (node.type === "gate") nodeIcon = "🚪";
    else if (node.type === "food") nodeIcon = "🍔";
    else if (node.type === "restroom") nodeIcon = "🚻";
    else if (node.type === "info") nodeIcon = "ℹ️";
    else if (node.type === "seating") nodeIcon = "🏟️";
    else if (node.type === "eco") nodeIcon = "🌱";
    else if (node.type === "elevator") nodeIcon = "🛗";

    // Text Label below Node
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y + 24);
    text.setAttribute("class", "svg-node-label");
    text.textContent = node.name.split(" (")[0]; // Short name

    // Interaction Tooltip data
    nodeG.addEventListener("mouseenter", (e) => showMapTooltip(e, node, crowd));
    nodeG.addEventListener("mouseleave", hideMapTooltip);
    nodeG.addEventListener("focus", (e) => showMapTooltip(e, node, crowd));
    nodeG.addEventListener("blur", hideMapTooltip);
    
    if (onNodeClick) {
      nodeG.addEventListener("click", () => onNodeClick(nodeId));
      nodeG.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNodeClick(nodeId);
        }
      });
    }

    nodeG.appendChild(circle);
    
    // Add micro short-label overlay inside circle
    const iconText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    iconText.setAttribute("x", node.x);
    iconText.setAttribute("y", node.y + 3.5);
    iconText.setAttribute("font-size", "9px");
    iconText.setAttribute("fill", "white");
    iconText.setAttribute("text-anchor", "middle");
    iconText.setAttribute("pointer-events", "none");
    iconText.textContent = nodeIcon;
    nodeG.appendChild(iconText);
    
    nodeG.appendChild(text);
    svgEl.appendChild(nodeG);
  }
}

/**
 * Draws the computed route line on the map
 */
export function drawRoute(svgEl, path, nodes) {
  const routeGroup = svgEl.getElementById("route-overlay-group");
  if (!routeGroup) return;
  routeGroup.innerHTML = ""; // Clear existing path

  if (!path || path.length < 2) return;

  // Draw continuous route path
  let pathD = `M ${nodes[path[0]].x} ${nodes[path[0]].y}`;
  for (let i = 1; i < path.length; i++) {
    const node = nodes[path[i]];
    pathD += ` L ${node.x} ${node.y}`;
  }

  // Pulsing background path
  const routePulse = document.createElementNS("http://www.w3.org/2000/svg", "path");
  routePulse.setAttribute("d", pathD);
  routePulse.setAttribute("fill", "none");
  routePulse.setAttribute("stroke", "rgba(0, 242, 254, 0.15)");
  routePulse.setAttribute("stroke-width", "8");
  routePulse.setAttribute("stroke-linecap", "round");
  routePulse.setAttribute("stroke-linejoin", "round");
  routeGroup.appendChild(routePulse);

  // Core animated path
  const routePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  routePath.setAttribute("d", pathD);
  routePath.setAttribute("fill", "none");
  routePath.setAttribute("stroke", "var(--neon-cyan)");
  routePath.setAttribute("stroke-width", "4");
  routePath.setAttribute("stroke-linecap", "round");
  routePath.setAttribute("stroke-linejoin", "round");
  routePath.setAttribute("filter", "drop-shadow(0 0 4px rgba(0, 242, 254, 0.8))");
  
  // Dash flow animation
  routePath.setAttribute("stroke-dasharray", "8, 6");
  
  const animateDash = document.createElementNS("http://www.w3.org/2000/svg", "animate");
  animateDash.setAttribute("attributeName", "stroke-dashoffset");
  animateDash.setAttribute("values", "100;0");
  animateDash.setAttribute("dur", "4s");
  animateDash.setAttribute("repeatCount", "indefinite");
  
  routePath.appendChild(animateDash);
  routeGroup.appendChild(routePath);
}

/**
 * Tooltip Helper Functions
 */
function showMapTooltip(event, node, crowd) {
  let tooltip = document.getElementById("map-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.setAttribute("id", "map-tooltip");
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "rgba(13, 17, 39, 0.95)";
    tooltip.style.border = "1px solid var(--border-active)";
    tooltip.style.borderRadius = "8px";
    tooltip.style.padding = "10px 14px";
    tooltip.style.color = "var(--text-main)";
    tooltip.style.fontFamily = "var(--font-sans)";
    tooltip.style.fontSize = "12px";
    tooltip.style.boxShadow = "var(--shadow-neon)";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "1000";
    tooltip.style.backdropFilter = "blur(8px)";
    document.body.appendChild(tooltip);
  }

  let crowdStatus = "Low";
  let statusColor = "var(--color-success)";
  if (crowd > 70) {
    crowdStatus = "High Congestion";
    statusColor = "var(--color-danger)";
  } else if (crowd > 40) {
    crowdStatus = "Moderate Load";
    statusColor = "var(--color-warning)";
  }

  tooltip.innerHTML = `
    <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color:#ffffff;">${node.name}</div>
    <div style="color: var(--text-secondary); margin-bottom: 6px;">${node.description}</div>
    <div style="display: flex; justify-content: space-between; gap: 20px;">
      <span>Capacity Load:</span>
      <span style="font-weight: 700; color: ${statusColor};">${crowd}% (${crowdStatus})</span>
    </div>
  `;

  tooltip.style.display = "block";
  updateTooltipPosition(event, tooltip, node);
}

function updateTooltipPosition(event, tooltip, node) {
  let x, y;
  if (event && typeof event.clientX === 'number') {
    x = event.clientX;
    y = event.clientY;
  } else if (node) {
    const svg = document.getElementById("organizer-map-svg") || document.getElementById("fan-map-svg");
    if (svg) {
      const rect = svg.getBoundingClientRect();
      x = rect.left + (node.x / 800) * rect.width;
      y = rect.top + (node.y / 500) * rect.height;
    } else {
      x = 400;
      y = 250;
    }
  } else {
    x = 400;
    y = 250;
  }
  tooltip.style.left = `${x + 15}px`;
  tooltip.style.top = `${y + 15}px`;
}

function hideMapTooltip() {
  const tooltip = document.getElementById("map-tooltip");
  if (tooltip) {
    tooltip.style.display = "none";
  }
}

// Global window move listener to keep tooltip following mouse while inside node boundaries
if (typeof document !== 'undefined') {
  document.addEventListener("mousemove", (e) => {
    const tooltip = document.getElementById("map-tooltip");
    if (tooltip && tooltip.style.display === "block") {
      updateTooltipPosition(e, tooltip);
    }
  });
}

// AI Integration Layer (Real Gemini API & High-fidelity Simulation Engine)

// System prompt context for the FIFA World Cup 2026 MetLife Stadium environment
const VENUE_SYSTEM_PROMPT = `
You are "FIFA 2026 GenAI Assistant", the official GenAI Venue Operations & Fan Experience Companion for the FIFA World Cup 2026 at MetLife Stadium (New York/New Jersey).
You help fans, staff, and organizers manage the venue, find locations, understand soccer match schedules, coordinate transit, and follow sustainability/accessibility rules.
Be professional, concise, and helpful. Translate when requested.
Current Venue Info:
- Gates: Gate A (North Entrance, Ride-Share, Parking), Gate B (East Entrance, Shuttle buses), Gate C (South Entrance, NJ Transit Stadium Station), Gate D (West VIP & Media Entrance).
- Concessions: Concession Area North (Burgers & Dogs), Concession Area South (Tacos & Empanadas).
- Restrooms: Block A (North-West, near Gate D/West Stand), Block B (South-East, near Gate B/East Stand).
- Guest Services: Central Guest Services & ADA Hub (Center of the venue).
- Fan Experience: FIFA Fan Festival & Sponsor Expo (East side near Gate B).
- Seating: Section 110 (North Stand - USA Fan Club), Section 120 (East Stand Mid-Tier), Section 130 (South Stand - England Supporters), Section 140 (West Stand - Club Suite & VIP).
- Sustainability: North Sustainability Hub (Water Refill & Recycling), South Sustainability Hub.
- Accessibility: Central ADA Elevator Lobby (provides wheelchair ramp and elevator access near Section 140 and Section 110).
`;

/**
 * Sends a message to the Gemini API (streaming) or uses local simulation if key is missing.
 */
export function buildOperationalIntelligenceSummary(context = {}) {
  const scenarioName = context.activeScenario || 'normal';
  const crowdHotspots = Object.entries(context.crowdLevels || {})
    .filter(([, level]) => Number(level) > 70)
    .map(([id]) => id)
    .slice(0, 3);

  const accessibilityRequests = Number(context.accessibilityRequests || 3);
  const transportDemand = Number(context.transportDemand || 4);
  const plasticSaved = Number(context.plasticSaved || 1420);
  const energySavings = Number(context.energySavings || 45);

  let scenarioText = "Normal Matchday";
  if (scenarioName === "rain") scenarioText = "Severe Rainstorm Alert";
  if (scenarioName === "emergency") scenarioText = "NJ Transit Rail Outage";
  if (scenarioName === "sponsor") scenarioText = "Post-Match Peak Egress";

  return [
    `🏆 FIFA WORLD CUP 2026 OPERATIONAL BRIEF`,
    `🏟️ Venue: MetLife Stadium, NY/NJ`,
    `📋 Scenario Status: ${scenarioText.toUpperCase()}`,
    `👥 Crowd Hotspots: ${crowdHotspots.length ? crowdHotspots.map(id => id.replace('_', ' ').toUpperCase()).join(', ') : 'Optimal Flow'}`,
    `♿ Accessibility Support: ${accessibilityRequests} active wheelchair dispatches`,
    `🚌 Transportation Flow: Reroutes active via ${transportDemand} stadium shuttles`,
    `🌱 Sustainability Impact: Saved ${plasticSaved} plastic bottles today • Solar energy at ${energySavings}% capacity`
  ].join('\n');
}

export async function sendMessageToAI({ prompt, apiKey, context = {}, onChunk, onDone, onError }) {
  if (apiKey && apiKey.trim() !== "") {
    try {
      await streamGeminiAPI(prompt, apiKey, context, onChunk, onDone, onError);
    } catch (err) {
      console.error("Gemini API error, falling back to simulation:", err);
      streamSimulation(prompt, context, onChunk, onDone);
    }
  } else {
    streamSimulation(prompt, context, onChunk, onDone);
  }
}

/**
 * Real Gemini API Streaming Connection
 */
async function streamGeminiAPI(prompt, apiKey, context, onChunk, onDone, onError) {
  const fullPrompt = `${VENUE_SYSTEM_PROMPT}\nContext State: ${JSON.stringify(context)}\nUser Question: ${prompt}`;
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunkText = decoder.decode(value, { stream: true });
      buffer += chunkText;
      
      // Parse chunks of text using regex to extract "text" field values
      const regex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let match;
      let chunkCombined = "";
      
      while ((match = regex.exec(chunkText)) !== null) {
        try {
          // Parse Unicode escape sequences properly
          const parsedChunk = JSON.parse(`"${match[1]}"`);
          chunkCombined += parsedChunk;
        } catch (e) {
          chunkCombined += match[1];
        }
      }
      
      if (chunkCombined.length > 0) {
        onChunk(chunkCombined);
      }
    }
    onDone();
  } catch (err) {
    if (onError) onError(err);
    else console.error(err);
  }
}

/**
 * High-Fidelity Local Simulation Engine for FIFA World Cup 2026
 */
function streamSimulation(prompt, context, onChunk, onDone) {
  const lowerPrompt = prompt.toLowerCase();
  let responseText = "";

  // Intent classification
  // 1. Specific inline translation request (must be first to avoid conflicts with terms in navigation/food/etc)
  if (lowerPrompt.includes("translate") && (lowerPrompt.includes("to") || lowerPrompt.includes("in"))) {
    const match = prompt.match(/translate\s+["']?([^"']+)["']?\s+to\s+(\w+)/i);
    if (match) {
      const phrase = match[1];
      const lang = match[2].toLowerCase();
      const translations = {
        spanish: { "where is the elevator": "¿Dónde está el ascensor?", "how do i get to gate c": "¿Cómo llego a la puerta C?", "is water free": "¿El agua es gratis?" },
        french: { "where is the elevator": "Où est l'ascenseur?", "how do i get to gate c": "Comment aller à la porte C?", "is water free": "L'eau est-elle gratuite?" },
        hindi: { "where is the elevator": "लिफ्ट कहाँ है?", "how do i get to gate c": "गेट सी पर कैसे जाएं?", "is water free": "क्या पानी मुफ्त है?" },
        japanese: { "where is the elevator": "エレベーターはどこですか？", "how do i get to gate c": "ゲートCへはどう行きますか？", "is water free": "水は無料ですか？" }
      };
      const cleanPhrase = phrase.trim().toLowerCase().replace(/[?.]/g, '');
      const translated = translations[lang]?.[cleanPhrase] || `[Simulated ${lang.toUpperCase()} translation of "${phrase}"]`;
      responseText = `**AI Translation Assistant:**
      Original: "${phrase}"
      Translated (${lang.charAt(0).toUpperCase() + lang.slice(1)}): **"${translated}"**`;
    } else {
      responseText = "To translate a phrase, use the format: **Translate \"[phrase]\" to [Language]**.";
    }
  }
  // 2. General translation advice / list
  else if (lowerPrompt.includes("translate") || lowerPrompt.includes("french") || lowerPrompt.includes("spanish") || lowerPrompt.includes("hindi") || lowerPrompt.includes("japanese") || lowerPrompt.includes("german")) {
    responseText = `I can translate any statement! Here are standard inquiries translated:
    
    - **Spanish**: *"¿Dónde está el ascensor accesible?"* (Where is the accessible elevator?)
    - **French**: *"Comment aller au Festival des Fans de la FIFA?"* (How do I get to the FIFA Fan Festival?)
    - **Hindi**: *"पानी भरने का स्टेशन कहाँ है?"* (Where is the water refill station?)
    - **Japanese**: *"バッグの持ち込み規制はどうなっていますか？"* (What is the bag policy?)
    
    Just type: **Translate "[phrase]" to [Language]** or use the **AI Translator Card** in the Volunteer tab.`;
  }
  // 3. Navigation
  else if (lowerPrompt.includes("navigate") || lowerPrompt.includes("route") || lowerPrompt.includes("direction") || lowerPrompt.includes("get to") || lowerPrompt.includes("where is section") || lowerPrompt.includes("go to") || lowerPrompt.includes("elevator") || lowerPrompt.includes("wheelchair")) {
    responseText = `To navigate MetLife Stadium, please use the **Smart Indoor Navigation** tool on the left. 
    Select your current origin and destination (e.g., Gate A to Section 140 VIP).
    
    *GenAI Smart Toggles:*
    1. **♿ Accessible (ADA) Mode**: Select this preference to route through the **Central ADA Elevator Lobby** and avoid stairs and high crowd corridors.
    2. **🌱 Eco-Friendly Mode**: Select this to route through the **North/South Sustainability Hubs** so you can refill your water bottles and bypass single-use plastic zones.
    
    *Live Traffic Status:* Congestion is currently high around **${context.congestedNode || 'no gates'}** due to the match.`;
  } 
  // 4. Concessions & Food
  else if (lowerPrompt.includes("food") || lowerPrompt.includes("concession") || lowerPrompt.includes("eat") || lowerPrompt.includes("drink") || lowerPrompt.includes("burger") || lowerPrompt.includes("taco") || lowerPrompt.includes("empanada")) {
    const crowdA = context.crowdLevels?.concession_a || 65;
    const crowdB = context.crowdLevels?.concession_b || 40;
    responseText = `MetLife Stadium concession options for the FIFA World Cup 2026:
    1. **Concession Area North (near Section 120)**: Burgers, hot dogs, fries, and draft beers. Operating at **${crowdA}% capacity** (${crowdA > 60 ? 'Busy' : 'Normal'}).
    2. **Concession Area South (near Section 130)**: Street tacos, empanadas, churros, and soda. Operating at **${crowdB}% capacity** (${crowdB > 60 ? 'Busy' : 'Normal'}).
    
    *Eco Refill:* Both areas are supported by adjacent **Sustainability Hubs** for free filtered water. 
    *Queue Tip:* Head to **${crowdA < crowdB ? 'Concession North' : 'Concession South'}** for shorter wait times right now!`;
  }
  // 5. Restrooms
  else if (lowerPrompt.includes("restroom") || lowerPrompt.includes("toilet") || lowerPrompt.includes("washroom") || lowerPrompt.includes("bath")) {
    const crowdA = context.crowdLevels?.restroom_a || 30;
    const crowdB = context.crowdLevels?.restroom_b || 45;
    responseText = `Restrooms are located in the main concourse loops:
    - **Restrooms Block A (North-West near Section 110)**: Male, Female, All-Gender, and ADA wheelchair facilities. Load is **${crowdA}%** (Wait time: ~${Math.round(crowdA/10)} mins).
    - **Restrooms Block B (South-East near Section 130)**: Male, Female, All-Gender, and ADA wheelchair facilities. Load is **${crowdB}%** (Wait time: ~${Math.round(crowdB/10)} mins).
    
    *Recommendation:* Head to **${crowdA < crowdB ? 'Restrooms Block A' : 'Restrooms Block B'}** for faster service.`;
  }
  // 6. Tournament Schedule
  else if (lowerPrompt.includes("schedule") || lowerPrompt.includes("match") || lowerPrompt.includes("time") || lowerPrompt.includes("play") || lowerPrompt.includes("game")) {
    responseText = `Here is today's FIFA World Cup 2026 Matchday schedule at MetLife Stadium:
    - **01:00 PM** - Gates & Security Screening Open *(Completed)*
    - **03:30 PM** - FIFA Fan Festival Live sponsor concert *(Completed)*
    - **06:00 PM** - Group B Match: **USA vs England** *(Ongoing - MetLife Pitch)*
    - **08:30 PM** - Group B Match: **Mexico vs Argentina** *(Upcoming)*
    - **11:00 PM** - Post-match egress & NJ Transit trains departure *(Upcoming)*
    
    *Fan Advisory:* Transit queues at **Gate C (NJ Transit)** are expected to surge starting at **08:00 PM** as USA vs England fans head out.`;
  }
  // 7. Security / Bag Policy
  else if (lowerPrompt.includes("bag") || lowerPrompt.includes("policy") || lowerPrompt.includes("clear bag") || lowerPrompt.includes("security")) {
    responseText = `**FIFA World Cup 2026 Security & Bag Policy at MetLife Stadium:**
    - Only **clear plastic, vinyl, or PVC bags** that do not exceed **12" x 6" x 12"** are allowed.
    - Small clutch bags/purses (non-clear) are permitted if they do not exceed **4.5" x 6.5"** in size.
    - All bags are subject to security screening. Medically necessary items and strollers are allowed but must go through specialized screening lanes at **Gate D (West VIP & Accessibility)**.`;
  }
  // 8. Transit & Train links
  else if (lowerPrompt.includes("train") || lowerPrompt.includes("nyc") || lowerPrompt.includes("transport") || lowerPrompt.includes("shuttle") || lowerPrompt.includes("nj transit")) {
    responseText = `**Transportation options to/from MetLife Stadium:**
    - **NJ Transit Trains**: Departs directly from the Meadowlands Station outside **Gate C (South Entrance)**. Takes you to Secaucus Junction for direct transfers to New York Penn Station and Newark Penn Station. Trains run every 10 minutes post-match.
    - **Shuttles**: Free event shuttles depart from **Gate B (East Entrance)** to secondary parking lots and local airport transit centers.
    - **Ride-Share (Uber/Lyft)**: Dedicated pickup zone is located in Lot E, adjacent to **Gate A (North Entrance)**.
    
    *Eco-Note:* Taking public transit reduces your carbon footprint for the match by up to 80%!`;
  }
  // 9. Default Fallback Info
  else {
    responseText = `Welcome to the FIFA World Cup 2026 Venue Portal! I am your GenAI Operations Assistant. I monitor MetLife Stadium operations:
    - **Gates & Security**: Gates A, B, C, and D are fully active. Gate C NJ Transit station is experiencing high demand.
    - **Eco Impact**: North & South Sustainability Hubs are active. Fans can utilize eco water refill stations.
    - **Accessibility**: Central ADA Elevator Lobby is open for wheelchair routing.
    
    How can I help you navigate the stadium, review security policy, check match times, or translate phrases today?`;
  }

  // Simulate streaming text chunks
  const words = responseText.split(" ");
  let wordIndex = 0;
  
  const timer = setInterval(() => {
    if (wordIndex < words.length) {
      const chunk = words.slice(wordIndex, wordIndex + 2).join(" ") + " ";
      onChunk(chunk);
      wordIndex += 2;
    } else {
      clearInterval(timer);
      onDone();
    }
  }, 40);
}

/**
 * Text translation module for the Volunteer portal
 */
export async function translateText({ text, targetLang, apiKey }) {
  if (apiKey && apiKey.trim() !== "") {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Translate the following text to ${targetLang}. Return ONLY the translated text, no comments or extra styling:\n"${text}"` }] }]
          })
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
      }
    } catch (err) {
      console.error("Gemini Translation failed, using fallback:", err);
    }
  }

  // Fallback translator
  const mockTranslations = {
    "es": { 
      "Hello, how can I help you?": "Hola, ¿cómo puedo ayudarte?", 
      "Where is your ticket?": "¿Dónde está tu boleto?", 
      "The match is starting now.": "El partido está comenzando ahora.", 
      "Please follow this path to Gate 3.": "Por favor, siga este camino hacia la Puerta C." 
    },
    "fr": { 
      "Hello, how can I help you?": "Bonjour, comment puis-je vous aider?", 
      "Where is your ticket?": "Où est votre billet?", 
      "The match is starting now.": "Le match commence maintenant.", 
      "Please follow this path to Gate 3.": "Veuillez suivre ce chemin vers la porte C." 
    },
    "hi": { 
      "Hello, how can I help you?": "नमस्ते, मैं आपकी क्या मदद कर सकता हूँ?", 
      "Where is your ticket?": "आपका टिकट कहाँ है?", 
      "The match is starting now.": "मैच अभी शुरू हो रहा है।", 
      "Please follow this path to Gate 3.": "कृपया गेट सी के लिए इस मार्ग का अनुसरण करें।" 
    },
    "ja": { 
      "Hello, how can I help you?": "こんにちは、何かお手伝いできますか？", 
      "Where is your ticket?": "チケットはどこですか？", 
      "The match is starting now.": "試合が今始まります。", 
      "Please follow this path to Gate 3.": "ゲートCへはこの道を歩んでください。" 
    }
  };

  const cleanText = text.trim();
  return mockTranslations[targetLang]?.[cleanText] || `[Simulated Translation to ${targetLang.toUpperCase()}]: "${cleanText}"`;
}

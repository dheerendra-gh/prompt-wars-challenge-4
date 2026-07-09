// AI Integration Layer (Real Gemini API & High-fidelity Simulation Engine)

// System prompt context for the tournament environment
const VENUE_SYSTEM_PROMPT = `
You are "DC AI Assistant", the GenAI Venue Operations & Tournament Assistant.
You help fans, staff, and organizers manage the venue, find locations, understand schedules, and coordinate operations.
Be professional, concise, and helpful. Translate when requested.
Current Venue Info:
- Gates: Gate 1 (North, Parking), Gate 2 (East, Shuttles), Gate 3 (South, Transit), Gate 4 (West, VIP/Media).
- Concessions: Zone A (North - Burger Bar & Brews), Zone B (South - Tacos & Pizza).
- Restrooms: A (North-West), B (South-East).
- Info Desk: Center of the venue.
- Sponsor Expo Pavilion: East side.
- Seating: Sectors 101 & 102 (North Tier), Sectors 103 & 104 (South Tier).
`;

/**
 * Sends a message to the Gemini API (streaming) or uses local simulation if key is missing.
 */
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
 * High-Fidelity Local Simulation Engine
 */
function streamSimulation(prompt, context, onChunk, onDone) {
  const lowerPrompt = prompt.toLowerCase();
  let responseText = "";

  // Intent classification
  if (lowerPrompt.includes("navigate") || lowerPrompt.includes("route") || lowerPrompt.includes("direction") || lowerPrompt.includes("get to") || lowerPrompt.includes("where is sector") || lowerPrompt.includes("go to")) {
    responseText = `To navigate the venue, please use the **Smart Indoor Navigation** tool on the left panel. 
    Select your current origin and desired destination (e.g., Gate 1 to Sector 104). The interactive SVG map will calculate the shortest path using operational pathfinding algorithms, estimate travel times, and warn you of any line congestion.
    
    *Operational Note:* Currently, **${context.congestedNode || 'no sectors'}** is showing high congestion. You may want to choose routes that bypass this zone.`;
  } 
  else if (lowerPrompt.includes("food") || lowerPrompt.includes("concession") || lowerPrompt.includes("eat") || lowerPrompt.includes("drink") || lowerPrompt.includes("burger") || lowerPrompt.includes("pizza") || lowerPrompt.includes("taco")) {
    const crowdA = context.crowdLevels?.concession_a || 65;
    const crowdB = context.crowdLevels?.concession_b || 40;
    responseText = `We have two main Concession Zones:
    1. **Concession Zone A (North Side)**: Specializes in Gourmet Burgers, Local Brews, and Salads. Currently operating at **${crowdA}% capacity** (${crowdA > 60 ? 'Busy' : 'Normal'}).
    2. **Concession Zone B (South Side)**: Specializes in Artisanal Pizza, Street Tacos, and Fruit Smoothies. Currently operating at **${crowdB}% capacity** (${crowdB > 60 ? 'Busy' : 'Normal'}).
    
    *GenAI Tip:* If you are looking to avoid queues, **${crowdA < crowdB ? 'Concession Zone A' : 'Concession Zone B'}** has shorter lines right now!`;
  }
  else if (lowerPrompt.includes("restroom") || lowerPrompt.includes("toilet") || lowerPrompt.includes("washroom") || lowerPrompt.includes("bath")) {
    const crowdA = context.crowdLevels?.restroom_a || 30;
    const crowdB = context.crowdLevels?.restroom_b || 45;
    responseText = `Restrooms are located in two areas of the concourse:
    - **Restrooms A (North-West near Gate 4)**: Male, Female, and Family-accessible facilities. Current load is **${crowdA}%** (Estimated wait: ${Math.round(crowdA/10)} mins).
    - **Restrooms B (South-East near Gate 2)**: Male, Female, and Family-accessible facilities. Current load is **${crowdB}%** (Estimated wait: ${Math.round(crowdB/10)} mins).
    
    I recommend heading to **${crowdA < crowdB ? 'Restrooms A' : 'Restrooms B'}** as it currently has shorter wait times.`;
  }
  else if (lowerPrompt.includes("schedule") || lowerPrompt.includes("match") || lowerPrompt.includes("time") || lowerPrompt.includes("event") || lowerPrompt.includes("play")) {
    responseText = `Here is the current Tournament Schedule for Today:
    - **09:00 AM** - Gates Open & Morning Rush *(Completed)*
    - **10:30 AM** - Tournament Opening Ceremony *(Completed)*
    - **02:00 PM** - Quarter Finals: Match A (Tennis Singles) in **Sectors 101 & 102** *(Ongoing)*
    - **04:30 PM** - Quarter Finals: Match B (Tennis Singles) in **Sectors 103 & 104** *(Upcoming)*
    - **07:30 PM** - Semifinals & Sponsor Showdowns in **All Sectors & Expo Zone** *(Upcoming)*
    
    *Crowd Flow Advisory:* Crowd density in the South Tier (Sectors 103 & 104) is expected to rise sharply around **04:15 PM** in preparation for Quarter Finals Match B.`;
  }
  else if (lowerPrompt.includes("translate") || lowerPrompt.includes("french") || lowerPrompt.includes("spanish") || lowerPrompt.includes("hindi") || lowerPrompt.includes("japanese") || lowerPrompt.includes("german")) {
    responseText = `I can translate any phrase for you! Here are some common tournament inquiries in multiple languages:
    
    - **French**: *"Où sont les toilettes les plus proches?"* (Where is the nearest restroom?)
    - **Spanish**: *"¿Cómo llego al Sector 102?"* (How do I get to Sector 102?)
    - **Hindi**: *"सूचना डेस्क कहाँ है?"* (Where is the info desk?)
    - **Japanese**: *"ゲート3はどこですか？"* (Where is Gate 3?)
    
    If you'd like a specific phrase translated, type: **Translate "[phrase]" to [Language]** or use the **AI Translator Card** in the Volunteer tab.`;
  }
  else if (lowerPrompt.includes("translate") && (lowerPrompt.includes("to") || lowerPrompt.includes("in"))) {
    // Simple mock translation parser
    const match = prompt.match(/translate\s+["']?([^"']+)["']?\s+to\s+(\w+)/i);
    if (match) {
      const phrase = match[1];
      const lang = match[2].toLowerCase();
      const translations = {
        spanish: { "where is the restroom": "¿Dónde está el baño?", "how do i get to gate 1": "¿Cómo llego a la puerta 1?", "is there a food court": "¿Hay un patio de comidas?" },
        french: { "where is the restroom": "Où sont les toilettes?", "how do i get to gate 1": "Comment aller à la porte 1?", "is there a food court": "Y a-t-il une aire de restauration?" },
        hindi: { "where is the restroom": "शौचालय कहाँ है?", "how do i get to gate 1": "गेट 1 पर कैसे जाएं?", "is there a food court": "क्या यहाँ कोई फूड कोर्ट है?" },
        japanese: { "where is the restroom": "トイレはどこですか？", "how do i get to gate 1": "ゲート1への行き方は？", "is there a food court": "フードコートはありますか？" }
      };
      const cleanPhrase = phrase.trim().toLowerCase().replace(/[?.]/g, '');
      const translated = translations[lang]?.[cleanPhrase] || `[Simulated ${lang.toUpperCase()} translation of "${phrase}"]`;
      responseText = `**AI Translation Assistant:**
      Original (${context.currentLanguage || 'English'}): "${phrase}"
      Translated (${lang.charAt(0).toUpperCase() + lang.slice(1)}): **"${translated}"**`;
    } else {
      responseText = "To translate a phrase, please use the format: **Translate \"[phrase]\" to [Language]**.";
    }
  }
  else {
    // Default system response
    responseText = `Hello! I am the DC AI Assistant, your AI Venue Operations Guide. I am currently monitoring:
    - Crowd levels: Gate 3 is currently the busiest entry point.
    - Weather: Outdoor operations are running smoothly.
    - Security Status: All gates green.
    
    Feel free to ask me about concessions, schedules, restrooms, or directions, or trigger different scenarios in the **Settings** panel to see how I dynamically adapt operations.`;
  }

  // Simulate streaming text chunks
  const words = responseText.split(" ");
  let wordIndex = 0;
  
  const timer = setInterval(() => {
    if (wordIndex < words.length) {
      // Send a few words at a time for realism
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
    "es": { "Hello, how can I help you?": "Hola, ¿cómo puedo ayudarte?", "Where is your ticket?": "¿Dónde está tu boleto?", "The match is starting now.": "El partido está comenzando ahora.", "Please follow this path to Gate 3.": "Por favor, siga este camino hacia la Puerta 3." },
    "fr": { "Hello, how can I help you?": "Bonjour, comment puis-je vous aider?", "Where is your ticket?": "Où est votre billet?", "The match is starting now.": "Le match commence maintenant.", "Please follow this path to Gate 3.": "Veuillez suivre ce chemin vers la porte 3." },
    "hi": { "Hello, how can I help you?": "नमस्ते, मैं आपकी क्या मदद कर सकता हूँ?", "Where is your ticket?": "आपका टिकट कहाँ है?", "The match is starting now.": "मैच अभी शुरू हो रहा है।", "Please follow this path to Gate 3.": "कृपया गेट 3 के लिए इस मार्ग का अनुसरण करें।" },
    "ja": { "Hello, how can I help you?": "こんにちは、何かお手伝いできますか？", "Where is your ticket?": "チケットはどこですか？", "The match is starting now.": "試合が今始まります。", "Please follow this path to Gate 3.": "ゲート3へはこの道を歩んでください。" }
  };

  const cleanText = text.trim();
  return mockTranslations[targetLang]?.[cleanText] || `[Simulated Translation to ${targetLang.toUpperCase()}]: "${cleanText}"`;
}

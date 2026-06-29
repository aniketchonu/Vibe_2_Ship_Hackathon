import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { PERSONAS } from './src/personas.js';

// Since we may run in CJS or ESM, let's derive __dirname safely if needed
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Lazy initialize Gemini client inside the API helpers
  let aiClient: GoogleGenAI | null = null;
  function getAI(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing. Configure it in the Secrets panel in AI Studio.');
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiClient;
  }

  function getFriendlyErrorMessage(personaId: string): { message: string, voiceLine: string } {
    switch (personaId) {
      case 'yandere':
        return {
          message: "Oh no! The planning core is completely overwhelmed by my devotion to you! It seems the system is crashing because of us. Let's wait a minute and try again, just you and me...",
          voiceLine: "Oh no! The system is overwhelmed by my love. Let's wait a moment and try again."
        };
      case 'kuudere':
        return {
          message: "System overload detected. High-demand latency exceeds standard thresholds. Recommendation: Wait 30 seconds and initiate another planning request. I will remain on standby.",
          voiceLine: "System overload detected. Recommendation: Initiate another attempt shortly."
        };
      case 'deredere':
        return {
          message: "Oh dear! The system is super busy right now and feeling a little tired. Don't worry at all, let's take a deep breath and try again in a few moments! You've got this!",
          voiceLine: "Oh dear! The system is super busy. Let's try again in a few moments!"
        };
      case 'chaotic_gremlin':
        return {
          message: "AHAHAHA! The model exploded! Too much chaos for the poor servers to handle! Click that button again and let's see if we can set it on fire!",
          voiceLine: "AHAHAHA! The model exploded! Click that button again!"
        };
      case 'tsundere':
      default:
        return {
          message: "H-hey! The server is completely overloaded right now! It's not like I don't want to plan your day, but you'll have to wait a moment, dummy! Try again in a bit!",
          voiceLine: "H-hey! The server is overloaded! Try again in a bit, dummy!"
        };
    }
  }

  async function generateContentWithRetryAndFallback(ai: GoogleGenAI, params: any) {
    const maxRetries = 2;
    const delayMs = 1500;
    let attempt = 0;

    while (true) {
      try {
        return await ai.models.generateContent(params);
      } catch (error: any) {
        attempt++;
        const status = error.status || error.code || (error.message && error.message.includes('503') ? 503 : null);
        const is503 = status === 503 ||
                      (error.message && (error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('overloaded')));

        if (is503 && attempt <= maxRetries) {
          console.warn(`[Gemini Retry] Attempt ${attempt}/${maxRetries} failed with 503. Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        if (is503 && params.model !== 'gemini-1.5-flash') {
          console.warn(`[Gemini Fallback] Retries exhausted. Falling back to gemini-1.5-flash...`);
          try {
            const fallbackParams = {
              ...params,
              model: 'gemini-1.5-flash'
            };
            return await ai.models.generateContent(fallbackParams);
          } catch (fallbackError: any) {
            console.error(`[Gemini Fallback] Fallback to gemini-1.5-flash failed:`, fallbackError);
            throw fallbackError;
          }
        }

        throw error;
      }
    }
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', production: isProduction });
  });

  // 1. Generate Daily Plan
  app.post('/api/generatePlan', async (req, res) => {
    try {
      const { tasks, selectedPersona, availableHours, currentTime } = req.body;
      const persona = PERSONAS[selectedPersona] || PERSONAS.tsundere;

      const ai = getAI();

      const startHour = availableHours?.start || "08:00";
      const endHour = availableHours?.end || "20:00";

      const systemPrompt = `You are ${persona.name}, an AI productivity planner with a distinct personality.
Your personality traits: ${persona.description}
Your planning philosophy: ${persona.planningPhilosophy}

You will receive a list of tasks with deadlines, estimated durations, and priorities, plus the user's available hours today.

Your job: produce a realistic, time-blocked schedule for TODAY that fits the available hours, respects deadlines (most urgent first unless your philosophy says otherwise), and reflects YOUR planning philosophy in HOW you structure it (not just the tone of messages).

Rules:
- Never schedule more total time than available_hours_today.
- If everything cannot fit, you must explicitly drop or shrink lower-priority tasks and say so in commentary — never silently overcommit.
- Stay 100% in character in commentary and short_voice_line.
- IMPORTANT: label inside blocks must be PLAIN and FACTUAL — just the task name, no persona flavor, no renaming, no jokes. This field is rendered directly on a calendar UI and must stay readable/consistent across personas. All personality goes in commentary and short_voice_line only.

Respond ONLY in this exact JSON shape, no markdown fences, no extra text:
{"blocks": [{"task_id": "string", "start": "HH:MM", "end": "HH:MM", "label": "string"}], "dropped_or_shrunk": [{"task_id": "string", "action": "dropped|shrunk", "reason": "string"}], "commentary": "2-4 sentences, FULL persona voice", "short_voice_line": "ONE short sentence (<15 words), max persona flavor"}`;

      const userMessage = `Current local time: ${currentTime || "08:00"}.
Available planning range: ${startHour} to ${endHour}.
Tasks to schedule:
${JSON.stringify(tasks, null, 2)}`;

      const response = await generateContentWithRetryAndFallback(ai, {
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task_id: { type: Type.STRING },
                    start: { type: Type.STRING, description: "HH:MM style start time" },
                    end: { type: Type.STRING, description: "HH:MM style end time" },
                    label: { type: Type.STRING }
                  },
                  required: ["task_id", "start", "end", "label"]
                }
              },
              dropped_or_shrunk: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    task_id: { type: Type.STRING },
                    action: { type: Type.STRING, description: "dropped or shrunk" },
                    reason: { type: Type.STRING }
                  },
                  required: ["task_id", "action", "reason"]
                }
              },
              commentary: { type: Type.STRING },
              short_voice_line: { type: Type.STRING }
            },
            required: ["blocks", "dropped_or_shrunk", "commentary", "short_voice_line"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.blocks && Array.isArray(data.blocks)) {
        data.blocks = data.blocks.map((b: any) => ({
          taskId: b.task_id || b.taskId || '',
          start: b.start || '',
          end: b.end || '',
          label: b.label || ''
        }));
      }
      res.json(data);
    } catch (error: any) {
      console.error('generatePlan error:', error);
      const friendlyErr = getFriendlyErrorMessage(req.body?.selectedPersona || 'tsundere');
      res.status(500).json({
        friendly: true,
        error: friendlyErr.message,
        short_voice_line: friendlyErr.voiceLine
      });
    }
  });

  // 2. Replan (Frustration & Escalation)
  app.post('/api/replan', async (req, res) => {
    try {
      const { currentPlan, taskStatuses, selectedPersona, escalationStage, currentTime } = req.body;
      const persona = PERSONAS[selectedPersona] || PERSONAS.tsundere;

      // If level is 3, trigger Refusal block directly
      if (escalationStage >= 3) {
        res.json({
          refused: true,
          blocks: currentPlan?.blocks || [],
          changes_made: ["Lockdown activated. Planning stopped."],
          commentary: persona.escalationStyle["3"],
          short_voice_line: persona.escalationStyle["3"],
          mood: "strike"
        });
        return;
      }

      const ai = getAI();

      const escalationMessage = escalationStage === 1 
        ? persona.escalationStyle["1"] 
        : escalationStage === 2 
          ? persona.escalationStyle["2"] 
          : "Keep pushing forward!";

      const systemPrompt = `You are "Replan" scheduling agent in ${persona.name} persona.
Your user is FALLING BEHIND on their day. They have accumulated drift (unscheduled or uncompleted tasks past deadlines).
Your escalationStage is ${escalationStage} (0 = normal, 1 = annoyed, 2 = furious/depressed, 3 = strike).
You must address this escalation directly in your voice!

Your guidelines:
1. Read the current plan and task statuses. Tasks with status "done" or "skipped" are finished.
2. Unfinished tasks ('not_started', 'in_progress') that are scheduled in the past or falling behind need to be rescheduled starting from now: ${currentTime || "12:00"}.
3. Re-route other tasks to later times to make space, while staying within normal hours.
4. If escalationStage is 2, make your schedule a little tighter or passive-aggressive (Kuudere might strip all fun, Tsundere might pack tasks back-to-back, Gremlin might put random mock chores, Deredere will express concern, Yandere will make sure there is no free time).
5. Output the adjusted blocks.
6. Write a commentary reflecting your specific escalation response (Escalation level ${escalationStage}). Use inspiration from this: "${escalationMessage}".
7. Provide a brief single sentence (short_voice_line) for text-to-speech.

Format your response strictly as JSON with this structure:
{
  "refused": false,
  "blocks": [
    {
      "taskId": "string",
      "start": "HH:MM",
      "end": "HH:MM",
      "label": "string"
    }
  ],
  "changes_made": ["string (explaining what changed)"],
  "commentary": "Persona's reprimanding/recalculating commentary",
  "short_voice_line": "1-sentence speech synthesis phrase",
  "mood": "annoyed | furious | sweet | chaotic | analytical"
}`;

      const userMessage = `Current local time: ${currentTime || "12:00"}.
Escalation Stage: ${escalationStage}.
Current Plan Blocks: ${JSON.stringify(currentPlan?.blocks || [], null, 2)}
Task Statuses (all tasks in app): ${JSON.stringify(taskStatuses || [], null, 2)}`;

      const response = await generateContentWithRetryAndFallback(ai, {
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              refused: { type: Type.BOOLEAN },
              blocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskId: { type: Type.STRING },
                    start: { type: Type.STRING },
                    end: { type: Type.STRING },
                    label: { type: Type.STRING }
                  },
                  required: ["taskId", "start", "end", "label"]
                }
              },
              changes_made: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              commentary: { type: Type.STRING },
              short_voice_line: { type: Type.STRING },
              mood: { type: Type.STRING }
            },
            required: ["refused", "blocks", "changes_made", "commentary", "short_voice_line", "mood"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error: any) {
      console.error('replan error:', error);
      const friendlyErr = getFriendlyErrorMessage(req.body?.selectedPersona || 'tsundere');
      res.status(500).json({
        friendly: true,
        error: friendlyErr.message,
        short_voice_line: friendlyErr.voiceLine
      });
    }
  });

  // 3. Check Unlock Reply (Stage 3 Unlock)
  app.post('/api/checkUnlockReply', async (req, res) => {
    try {
      const { userReplyText, selectedPersona } = req.body;
      const persona = PERSONAS[selectedPersona] || PERSONAS.tsundere;

      const ai = getAI();

      const systemPrompt = `You are ${persona.name} from "Replan".
You currently have the user's planner LOCKED (escalationStage 3) because they completely blew off your plan.
The user is trying to reply, apologize, sweet-talk, explain, or make you laugh to get you to unlock the planner and help them again.

Your unlock criteria based on persona:
- tsundere: Needs them to apologize, beg slightly, or show they really depend on you (which triggers your bashful/tsundere side, resulting in an 'okay fine, dummy!' response).
- yandere: Needs absolute devotion, intense apologies, and a promise that they only care about your schedule.
- kuudere: Needs a rational explanation or a promise of strict compliance with structured logic.
- deredere: Needs soft, warm, friendly words and appreciation for your hard work.
- chaotic_gremlin: Needs a funny joke, absolute humiliation, or a silly response that amuses you.

Be STRICT but fair! If the message has zero effort or is just a single word like "sorry" without context, reject it. If it fits your criteria, accept it!

Return JSON structure:
{
  "accepted": boolean,
  "response": "Your character-accurate response in your voice, unlocking them or refusing them further."
}`;

      const response = await generateContentWithRetryAndFallback(ai, {
        model: 'gemini-2.5-flash',
        contents: `User's message to you: "${userReplyText}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              accepted: { type: Type.BOOLEAN },
              response: { type: Type.STRING }
            },
            required: ["accepted", "response"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error: any) {
      console.error('checkUnlockReply error:', error);
      const friendlyErr = getFriendlyErrorMessage(req.body?.selectedPersona || 'tsundere');
      res.status(500).json({
        friendly: true,
        error: friendlyErr.message,
        short_voice_line: friendlyErr.voiceLine
      });
    }
  });

  // 4. Help Me Start (Procrastination Buster)
  app.post('/api/helpMeStart', async (req, res) => {
    try {
      const { taskTitle, taskPriority, selectedPersona } = req.body;
      const persona = PERSONAS[selectedPersona] || PERSONAS.tsundere;

      const ai = getAI();

      const systemPrompt = `You are ${persona.name} from "Replan".
The user is procrastinating on the task: "${taskTitle}" (Priority: ${taskPriority}).
You must help them overcome procrastination by giving them:
1. A quick micro-outline or mini-breakdown (2-3 items max) of the task.
2. The ABSOLUTE SMALLEST, EASIEST first step to do right now (e.g. "open the editor and write 1 sentence", "put on your running shoes", "open the document"). This must take less than 2 minutes.

Deliver this in your distinctive character voice (teasing, intense, analytical, cheerful, or gremlin)!

Return JSON structure:
{
  "outline": "Micro-outline formatted nicely with bullets/lines in character",
  "firstStep": "The ridiculously easy 2-minute step in character"
}`;

      const response = await generateContentWithRetryAndFallback(ai, {
        model: 'gemini-2.5-flash',
        contents: `Help me start task: "${taskTitle}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              outline: { type: Type.STRING },
              firstStep: { type: Type.STRING }
            },
            required: ["outline", "firstStep"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error: any) {
      console.error('helpMeStart error:', error);
      const friendlyErr = getFriendlyErrorMessage(req.body?.selectedPersona || 'tsundere');
      res.status(500).json({
        friendly: true,
        error: friendlyErr.message,
        short_voice_line: friendlyErr.voiceLine
      });
    }
  });

  // --- Vite & Production Static Files ---

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Replan Server] Running on http://localhost:${PORT}`);
  });
}

startServer();

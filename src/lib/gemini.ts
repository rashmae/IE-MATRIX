import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_GROQ_MODEL = "llama3-8b-8192";
export const DEFAULT_OPENROUTER_MODEL = "mistralai/mistral-7b-instruct:free";

// RULE 1: NEVER use process.env in Vite — it does not exist in the browser
// RULE 2: NEVER initialize GoogleGenAI at module load time — it crashes if key is missing
// RULE 3: Always lazy-initialize with a singleton pattern
// RULE 4: Always return null gracefully — never throw from getGeminiClient()

let _geminiClient: GoogleGenAI | null = null;

function getEnvKey(keyName: string): string | null {
  let apiKey: string | null = null;
  try {
    if (typeof import.meta !== 'undefined' && (import.meta.env as any)?.[keyName]) {
      apiKey = (import.meta.env as any)[keyName];
    }
    if (!apiKey && typeof process !== 'undefined') {
      apiKey = (process as any)?.env?.[keyName.replace('VITE_', '')] || (process as any)?.env?.[keyName];
    }
    if (!apiKey && typeof window !== 'undefined') {
      apiKey = (window as any)[`__${keyName}__`];
    }
  } catch (err) {
    // ignore
  }
  return !apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey === '' ? null : apiKey;
}

export function getGeminiClient(): GoogleGenAI | null {
  if (_geminiClient) return _geminiClient;
  const apiKey = getEnvKey('VITE_GEMINI_API_KEY');
  if (!apiKey) return null;
  
  try {
    _geminiClient = new GoogleGenAI({ apiKey });
    return _geminiClient;
  } catch {
    return null;
  }
}

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | null;

export function getActiveProvider(): AIProvider {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ie_matrix_ai_provider') as AIProvider;
    if (saved === 'gemini') return 'gemini';
    if (saved === 'groq' && getEnvKey('VITE_GROQ_API_KEY')) return 'groq';
    if (saved === 'openrouter' && getEnvKey('VITE_OPENROUTER_API_KEY')) return 'openrouter';
  }

  // Default to gemini as it is usually available via server proxy
  return 'gemini';
}

export function setProviderPreference(provider: AIProvider) {
  if (typeof window !== 'undefined' && provider) {
    localStorage.setItem('ie_matrix_ai_provider', provider);
  }
}

export function getAvailableProviders(): { id: string, name: string, active: boolean }[] {
  const providers = [];
  const active = getActiveProvider();
  
  // Gemini is always listed since we have a server proxy
  providers.push({ id: 'gemini', name: 'Gemini 2.0 Flash', active: active === 'gemini' });
  
  if (getEnvKey('VITE_GROQ_API_KEY')) providers.push({ id: 'groq', name: 'Groq (Llama 3 8B)', active: active === 'groq' });
  if (getEnvKey('VITE_OPENROUTER_API_KEY')) providers.push({ id: 'openrouter', name: 'OpenRouter (Mistral 7B)', active: active === 'openrouter' });
  
  return providers;
}

export function isAIAvailable(): boolean {
  // Always available via Gemini server proxy by default
  return true;
}

async function fetchOpenAICompatible(apiUrl: string, apiKey: string, model: string, prompt: string, jsonMode: boolean, systemInstruction?: string) {
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model,
    messages,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function fetchGroq(prompt: string, jsonMode: boolean, systemInstruction?: string) {
  const apiKey = getEnvKey('VITE_GROQ_API_KEY');
  if (!apiKey) return "";
  return fetchOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", apiKey, DEFAULT_GROQ_MODEL, prompt, jsonMode, systemInstruction);
}

async function fetchOpenRouter(prompt: string, jsonMode: boolean, systemInstruction?: string) {
  const apiKey = getEnvKey('VITE_OPENROUTER_API_KEY');
  if (!apiKey) return "";
  const hdrs: any = {
    "HTTP-Referer": window.location.href, // Required for OpenRouter
    "X-Title": "IE MATRIX" // Optional
  };
  
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model: DEFAULT_OPENROUTER_MODEL,
    messages,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      ...hdrs
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// RULE 5: Every exported async function MUST:
// - Check getActiveProvider() first and return a typed fallback if null
// - Wrap generateContent in try/catch
// - Return a sensible fallback value, NEVER throw to the caller
// - Parse JSON safely with try/catch

async function safeGenerateContent(prompt: string, jsonMode = false, systemInstruction?: string): Promise<string> {
  const provider = getActiveProvider();
  
  if (!provider) return jsonMode ? '[]' : '';

  try {
    if (provider === 'gemini') {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          systemInstruction,
          model: DEFAULT_GEMINI_MODEL,
          responseMimeType: jsonMode ? "application/json" : "text/plain"
        }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let message = errData.error || `Server responded with ${response.status}`;
        if (errData.retryAfter) {
          message += ` (retry after ${errData.retryAfter}s)`;
        }
        const error = new Error(message);
        (error as any).status = response.status;
        (error as any).retryAfter = errData.retryAfter;
        throw error;
      }
      
      const data = await response.json();
      let text = data.text || (jsonMode ? '[]' : '');
      
      if (jsonMode && text.startsWith('```json')) {
        text = text.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      return text;
    } else if (provider === 'groq') {
       const groqPrompt = jsonMode ? `${prompt}\n\nPlease output valid JSON ONLY.` : prompt;
       const response = await fetchGroq(groqPrompt, jsonMode, systemInstruction);
       return response || (jsonMode ? '[]' : '');
    } else if (provider === 'openrouter') {
       const orPrompt = jsonMode ? `${prompt}\n\nPlease output valid JSON ONLY.` : prompt;
       const response = await fetchOpenRouter(orPrompt, jsonMode, systemInstruction);
       return response || (jsonMode ? '[]' : '');
    }
  } catch (error: any) {
    console.error(`[AI ${provider}]`, error?.message || error);
    return handleFallback(prompt, jsonMode, systemInstruction, error);
  }
}

/**
 * High-fidelity curriculum and subject data engine.
 * Solves the Quota Exceeded/429 problem by offering beautifully structured,
 * scientific local mockups for all core Industrial Engineering query modules.
 */
function handleFallback(prompt: string, jsonMode: boolean, systemInstruction: string | undefined, error: any): string {
  const norm = prompt.toLowerCase();

  // 1. Identify study roadmap generator requests
  if (norm.includes("optimized, sequential study roadmap") || norm.includes("study plan") || norm.includes("academic planner")) {
    const studyPlan = [
      {
        title: "Phase 1: Analytical Foundational Science",
        description: "Strengthen high-level analytical skills by focusing on advanced mathematics, basic industrial processes, and computer spreadsheets.",
        subjects: ["MATH-121", "IE-111"],
        difficulty: "medium",
        priority: "high",
        estimatedTime: "Sem 1",
        breakdown: [
          "Master linear equations and calculus-based optimization structures.",
          "Explore plant tours and physical layouts in Industrial Processes.",
          "Accrue proficiency with Excel formulas (VLOOKUP, INDEX-MATCH, Solvers)."
        ]
      },
      {
        title: "Phase 2: Methods Engineering & Work Simulation",
        description: "Transition into time studies, motion optimization, and ergonomics to measure and design human work systems efficiently.",
        subjects: ["IE-211", "IE-212"],
        difficulty: "hard",
        priority: "high",
        estimatedTime: "Sem 2",
        breakdown: [
          "Record processes using Flow Process Charts and assembly blueprints.",
          "Apply standard performance ratings and allowances in time study exercises.",
          "Learn anthropometric rules for workspace layouts."
        ]
      },
      {
        title: "Phase 3: Operations Research & Quantitative Systems",
        description: "Enter the core mathematical engine of Industrial Engineering. Learn how to optimize resources with linear modeling.",
        subjects: ["IE-311", "IE-312"],
        difficulty: "hard",
        priority: "high",
        estimatedTime: "Sem 3",
        breakdown: [
          "Apply the Simplex algorithm to maximize profits under strict constraints.",
          "Study Markov chains, network models, and supply queues.",
          "Practice coding basic solvers in Python or optimization platforms."
        ]
      },
      {
        title: "Phase 4: Statistical Quality & Advanced Operations",
        description: "Deploy control charts and Six Sigma concepts to build resilient, waste-free manufacturing lines.",
        subjects: ["IE-321", "IE-411"],
        difficulty: "medium",
        priority: "high",
        estimatedTime: "Sem 4",
        breakdown: [
          "Analyze process capability indices (Cp and Cpk) for quality metrics.",
          "Design X-bar, R, and p charts to monitor statistical variance.",
          "Master the DMAIC cycle (Define, Measure, Analyze, Improve, Control)."
        ]
      },
      {
        title: "Phase 5: Capstone Project & Strategic Management",
        description: "Synthesize your technical skills with financial constraints to complete your thesis and prepare for certifications.",
        subjects: ["IE-421", "IE-422"],
        difficulty: "hard",
        priority: "high",
        estimatedTime: "Capstone",
        breakdown: [
          "Collaborate with real local industries to execute Method Improvements.",
          "Run physical simulated models of proposed solutions.",
          "Prepare extensive cost-benefit sheets including NPV and IRR."
        ]
      }
    ];
    return JSON.stringify(studyPlan);
  }

  // 2. Identify 5-question multiple choice quizzes
  if (norm.includes("5-question multiple-choice quiz") || norm.includes("quiz")) {
    const matchSubject = prompt.match(/subject:\s*["']([^"']+)["']/i) || prompt.match(/for\s+["']([^"']+)["']/i);
    const subjectName = matchSubject ? matchSubject[1] : "General Industrial Engineering";
    const quizQuestions = getOfflineQuiz(subjectName);
    return JSON.stringify(quizQuestions);
  }

  // 3. Identify flashcards requests
  if (norm.includes("flashcards") || norm.includes("card")) {
    const matchTopic = prompt.match(/topic:\s*["']([^"']+)["']/i) || prompt.match(/for\s+["']([^"']+)["']/i);
    const topic = matchTopic ? matchTopic[1] : "Industrial Engineering Foundations";
    const flashcards = getOfflineFlashcards(topic);
    return JSON.stringify(flashcards);
  }

  // 4. Identify resource recommendation searches
  if (norm.includes("learning resources") || norm.includes("recommend 4")) {
    const matchTopic = prompt.match(/topic:\s*["']([^"']+)["']/i) || prompt.match(/for\s+["']([^"']+)["']/i);
    const topic = matchTopic ? matchTopic[1] : "Operations Research";
    const resources = getOfflineResources(topic);
    return JSON.stringify(resources);
  }

  // 5. Identify curriculum advice requests
  if (norm.includes("analyze progress. provide advice.")) {
    return `🚨 **AI Optimization Engine Syncing** (Using offline CTU Curriculum Advisor): \n\n### IE Expert Guidance \n\n1. **Focus on Mathematics foundations:** These are the bedrock of quantitative modeling and engineering optimization rules. \n2. **Master operations research early:** Understanding scheduling, queues, and Simplex constraints unlocks the primary toolkit of a modern IE practitioner. \n3. **Stay clean with prerequisites:** Leverage our course matrix to navigate subject relationships and protect your graduation pathway!`;
  }

  // 6. Natural chatbot conversation / general advice fallback
  return getOfflineChatResponse(prompt);
}

/**
 * Returns premium local multiple choice questions for quizzes when 429 occur.
 */
function getOfflineQuiz(subjectName: string): any[] {
  const norm = subjectName.toLowerCase();
  
  if (norm.includes("operation") || norm.includes("research") || norm.includes("quantitative") || norm.includes("linear")) {
    return [
      {
        question: "In Linear Programming, what does a 'slack variable' represent?",
        options: [
          "The unused capacity or resource that remains after an optimal solution is reached.",
          "The penalty cost associated with exceeding a constraint.",
          "The rate of change in the objective function per unit increase in a resource.",
          "A parameter that determines structural coefficient bounds."
        ],
        answerIndex: 0,
        explanation: "A slack variable represents the difference between the left-hand side and the right-hand side of a 'less than or equal to' constraint. This indicates unused resource capacity. Shadow price, on the other hand, represents the rate of change of the objective function (option 2)."
      },
      {
        question: "Under what condition does a Linear Programming Problem have 'Multiple Optimal Solutions'?",
        options: [
          "When the objective function line is parallel to one of the binding constraint lines.",
          "When two separate non-binding constraints intersect at the origin.",
          "When the feasible region is unbounded in the direction of optimization.",
          "When the simplex method reports a negative shadow price on a key resource."
        ],
        answerIndex: 0,
        explanation: "When the slope of the objective function matches the slope of an active, binding constraint, there is not just a single optimal corner point, but an infinite number of optimal points along that boundary line segment."
      },
      {
        question: "Which of the following is a core assumption of the basic M/M/1 queuing model?",
        options: [
          "Poisson arrival rate, Exponential service times, single server, infinite queue capacity.",
          "Deterministic arrival rate, Constant service times, single server, finite capacity.",
          "Normal distribution for arrivals, Poisson service times, multiple parallel servers.",
          "Exponential arrival rate, normal service times, infinite servers, LIFO queue discipline."
        ],
        answerIndex: 0,
        explanation: "The standard Kendall notation M/M/1 describes Markovian (Poisson) arrivals, Markovian (Exponential) service times, 1 server, with implicit infinite capacity and FIFO discipline."
      },
      {
        question: "What does a negative value of a decision variable in a simplex solution signify?",
        options: [
          "Nothing, as the non-negativity constraint restricts all variables to be >= 0.",
          "That the constraint boundaries are infeasible.",
          "That the problem is unbounded.",
          "That the objective function value is declining."
        ],
        answerIndex: 0,
        explanation: "Due to the non-negativity constraints (x_i >= 0) in standard LP models, decision variables can never take negative values. Any such state indicates a model structure or sign constraint violation."
      },
      {
        question: "In queuing theory, Little's Law is formulated as:",
        options: [
          "L = λ * W (Average number of items = Arrival rate * Average wait time)",
          "W = L / λ (Average wait time = Inventory / Cost of Carrying)",
          "Q = S - D (Queue size = Supply - Demand)",
          "P = λ / μ (System utilization = Service Rate / Arrival Rate)"
        ],
        answerIndex: 0,
        explanation: "Little's Law, named after John Little, states that the long-term average number of items (L) in a stationary queuing system is equal to the long-term average effective arrival rate (λ) multiplied by the average time (W) that an item spends in the system."
      }
    ];
  }
  
  if (norm.includes("ergonomic") || norm.includes("human") || norm.includes("work") || norm.includes("method") || norm.includes("motion")) {
    return [
      {
        question: "In Work Study, what is a 'Therblig'?",
        options: [
          "One of the 17 fundamental elemental subdivisions of physical work activities.",
          "A unit of energy expenditure measured during metabolic labor.",
          "The safety multiplier applied to lift coordinates in the NIOSH equation.",
          "A standard stopwatch mechanism used in repetitive timing."
        ],
        answerIndex: 0,
        explanation: "Therbligs are a set of 17 fundamental motions used to analyze physical work, developed by Frank and Lillian Gilbreth (e.g., search, find, select, grasp, hold, transport loaded)."
      },
      {
        question: "Under the NIOSH Lifting Equation, what is the Recommended Weight Limit (RWL) based on?",
        options: [
          "A load weight that nearly all healthy workers can perform over a substantial period without risk.",
          "The maximum static load a worker can lift once before risk of muscle tear.",
          "The metabolic limit of oxygen consumption required during constant hauling.",
          "The theoretical physical capacity of standard skeletal linkages."
        ],
        answerIndex: 0,
        explanation: "The RWL is the primary output of the NIOSH equation representing the maximum load that nearly all (99% of male, 75% of female) workforces can lift sequentially without increasing low-back pain risk."
      },
      {
        question: "Which standardized risk assessment tool is best suited for assessing biomechanical loads on the upper body and arms?",
        options: [
          "RULA (Rapid Upper Limb Assessment)",
          "REBA (Rapid Entire Body Assessment)",
          "NIOSH Lift Multiplier",
          "OWAS (Ovako Working Posture Assessment System)"
        ],
        answerIndex: 0,
        explanation: "RULA is specifically engineered to evaluate postural risks, static work burdens, and repetitive motion focus concentrated heavily on the shoulder, arm, wrist, and neck."
      },
      {
        question: "How is 'Standard Time' calculated in traditional Time Studies?",
        options: [
          "Standard Time = (Observed Time * Rating Fraction) + Allowances",
          "Standard Time = Observed Time / Allowance Factor",
          "Standard Time = Basic Time * Rating Factor * 1.5",
          "Standard Time = (Observed Time + Allowance) * Competency Index"
        ],
        answerIndex: 0,
        explanation: "Normal time is calculated by multiplying observed time by the performance rating (e.g., 90%, 110%). Allowances (for fatigue, personal needs, unavoidable delays) are then added to establish standard time."
      },
      {
        question: "What does the 'A' in the DMAIC six sigma framework stand for?",
        options: [
          "Analyze (deep dive on source metrics and root-causes of process variance)",
          "Assess (estimate monetary budget limits)",
          "Actuate (force production line activation)",
          "Allocate (distribute personnel structures)"
        ],
        answerIndex: 0,
        explanation: "The DMAIC sequence is Define, Measure, Analyze, Improve, and Control. The Analyze phase focuses heavily on drilling down to root causes of variance or waste."
      }
    ];
  }

  if (norm.includes("quality") || norm.includes("six sigma") || norm.includes("control") || norm.includes("statistical") || norm.includes("statistic")) {
    return [
      {
        question: "What does a process capability index of Cp = 1.33 indicate?",
        options: [
          "The natural process spread fits comfortably inside the upper and lower design specification limits.",
          "The process mean has shifted significantly to the right of nominal target coordinates.",
          "The process variance is unstable and out of statistical control limits.",
          "The defect level is exactly 3.4 parts per million opportunities."
        ],
        answerIndex: 0,
        explanation: "A Cp value of 1.0 means the natural process width (6 sigma) exactly equals the specification width. A Cp of 1.33 means the specification width is 4/3 wider than the process width, signifying standard capable performance."
      },
      {
        question: "In Statistical Quality Control, what is the primary purpose of an R-Chart (Range Chart)?",
        options: [
          "To monitor the dispersion or variability of the process.",
          "To identify shifts in the process average or mean.",
          "To count the exact frequency of discrete non-conformities.",
          "To establish customer design tolerances directly."
        ],
        answerIndex: 0,
        explanation: "An R-chart tracks sub-group ranges to monitor the absolute dispersion (variability) of a process over time. The X-bar chart, conversely, tracks process centrality (the mean)."
      },
      {
        question: "What is the difference between Common Cause Variation and Special Cause Variation?",
        options: [
          "Common cause is noise inherent in the system; Special cause is due to specific, assignable errors.",
          "Common cause occurs on weekends; Special cause occurs during peak operational shift loads.",
          "Common cause violates specification limits; Special cause violates control limits.",
          "Common cause cannot be estimated using normal distributions."
        ],
        answerIndex: 0,
        explanation: "Common causes represent normal, random ambient noise built into the equipment/process architecture. Special causes represent assignable, identifiable errors such as batch defects, tool wear, or operator mistakes."
      },
      {
        question: "Which Kaizen tool uses a visual layout diagram to map physical movements of materials or operators?",
        options: [
          "Spaghetti Diagram (spaghetti chart)",
          "Pareto Distribution",
          "Kanban Signal System",
          "Value Stream Map"
        ],
        answerIndex: 0,
        explanation: "A Spaghetti Diagram tracks motion pathways within physical coordinates to make congestion, redundant walking, or layout inefficiencies highly obvious."
      },
      {
        question: "A Six Sigma quality process yields how many defects per million opportunities (DPMO)?",
        options: [
          "3.4 defects",
          "6.0 defects",
          "66,807 defects",
          "0.02 defects"
        ],
        answerIndex: 0,
        explanation: "Under standard 1.5-sigma dynamic mean shift assumptions, a Six Sigma process guarantees a defect rate of no more than 3.4 DPMO."
      }
    ];
  }

  if (norm.includes("logistics") || norm.includes("supply") || norm.includes("inventory") || norm.includes("production") || norm.includes("order") || norm.includes("planning")) {
    return [
      {
        question: "The Economic Order Quantity (EOQ) formula seeks to minimize:",
        options: [
          "The sum of holding costs (carrying costs) and ordering costs (setup costs).",
          "The physical storage footprint inside modern distribution networks.",
          "The absolute unit purchase cost of bulk material assemblies.",
          "The lead time associated with overseas supplier transports."
        ],
        answerIndex: 0,
        explanation: "The basic EOQ model operates at the intersection of ordering costs and holding costs to find the batch size that minimizes that overall total variable cost curves."
      },
      {
        question: "In project management, what defines the 'Critical Path'?",
        options: [
          "The sequence of dependent tasks that represents the absolute longest path through the network, determining project duration.",
          "The path containing tasks with the highest budget allocations.",
          "The route that poses the biggest risk of catastrophic structural engineering failure.",
          "The logical order of tasks that have positive total slack times."
        ],
        answerIndex: 0,
        explanation: "The Critical Path represents the longest chain of sequential, non-slack tasks. Any delay in critical tasks directly shifts the project end date."
      },
      {
        question: "What is the primary role of safety stock in retail and manufacturing logistics?",
        options: [
          "To buffer against variances in customer demand or supplier lead times.",
          "To leverage bulk price tier margins offered on massive container shipping weights.",
          "To replace dead inventory that has expired or gone out of design spec.",
          "To simplify the physical layout auditing cycle inside large holding centers."
        ],
        answerIndex: 0,
        explanation: "Safety stocks are buffer quantities kept to manage statistical variability in demand orders or delivery transit delays, preventing stockout conditions."
      },
      {
        question: "Which classification divides inventory items into three tiers based on annual value volume usage?",
        options: [
          "ABC Classification (Pareto-based focus analysis)",
          "FIFO and LIFO Financial ledger categories",
          "S&OP Coordination matrix levels",
          "MRP and ERP structural clusters"
        ],
        answerIndex: 0,
        explanation: "ABC Analysis segments inventory where Class A represents high-value low-volume (80% value, 20% count), Class B contains moderate, and Class C represents low-value high-volume items."
      },
      {
        question: "In Kanban manufacturing, standard pulling triggers occur when:",
        options: [
          "Downstream consumption pulls items, signaling upstream workstations to produce replacements.",
          "The central schedule pushes daily forecast allotments directly onto assembly lines.",
          "Inventory levels in raw materials drop below critical safety boundaries.",
          "Engineering specs undergo minor structural adjustments."
        ],
        answerIndex: 0,
        explanation: "Kanban is a pure pull replenishment mechanism. Signals cascade backward from consumer steps, authorizing predecessor steps to build cards or assemblies only when consumed."
      }
    ];
  }

  // Fallback default IE general quiz
  return [
    {
      question: "Which classic Industrial Engineering pioneer is known as the 'Father of Scientific Management'?",
      options: [
        "Frederick Winslow Taylor",
        "Frank Gilbreth",
        "Henry Gantt",
        "Lillian Gilbreth"
      ],
      answerIndex: 0,
      explanation: "Frederick Winslow Taylor initiated the high-efficiency Scientific Management model at Midvale Steel, introducing time studies and specialized task planning rules (often called Taylorism)."
    },
    {
      question: "What is the main objective of 'Line Balancing' in assembly operations?",
      options: [
        "To distribute task times evenly across all successive workstations to minimize idle times.",
        "To weigh each physical product assembly to guarantee identical material weights.",
        "To rotate assembly workers across tasks to prevent repetitive muscle stress.",
        "To ensure shipping containers are geometrically packed for transit."
      ],
      answerIndex: 0,
      explanation: "Line balancing attempts to distribute operational tasks across workstations so that the cumulative work content at each station equals the cycle time (or takt), minimizing idle waste."
    },
    {
      question: "In lean operations, which term corresponds directly to 'Waste'?",
      options: [
        "Muda",
        "Mura",
        "Muri",
        "Kaizen"
      ],
      answerIndex: 0,
      explanation: "Muda is the Japanese term for waste (transport, inventory, motion, waiting, overproduction, overprocessing, defects). Mura represents unevenness, and Muri represents overburden / stress."
    },
    {
      question: "Under standard ergonomics rules, what is the optimal seated elbow-height angle relative to a work desk?",
      options: [
        "90 degrees (neutral posture with relaxed upper arms hanging vertically)",
        "135 degrees (extended arms supporting active body weights)",
        "45 degrees (flexed posture minimizing lateral keyboard movement space)",
        "0 degrees (completely outstretched locked elbow joints)"
      ],
      answerIndex: 0,
      explanation: "Neutral posture dictates elbows resting comfortably bent at about 90 to 100 degrees, keeping wrists aligned straight horizontally with the keyboard or workstation interface."
    },
    {
      question: "In Engineering Economics, what does Net Present Value (NPV) evaluate?",
      options: [
        "The current worth of all future positive and negative cash streams discounted to the present day.",
        "The simple difference between total cash inflow and initial equity investment.",
        "The internal rate of interest at which cash assets appreciate exponentially.",
        "The dynamic market valuation of production tooling assets during disposal audits."
      ],
      answerIndex: 0,
      explanation: "Net Present Value aggregates the discounted present worth of all costs and revenues throughout a project lifetime. A positive NPV indicates a project yields profits exceeding the discount rate."
    }
  ];
}

/**
 * Returns dynamic flashcard arrays locally when quota/network thresholds fail.
 */
function getOfflineFlashcards(topic: string): any[] {
  const norm = topic.toLowerCase();
  
  if (norm.includes("operation") || norm.includes("research") || norm.includes("simplex") || norm.includes("linear")) {
    return [
      { front: "Simplex Method", back: "An algebraic algorithm that searches corner-point feasible solutions of a linear programming problem to find the optimal objective value.", hint: "corner-point progression" },
      { front: "Shadow Price", back: "The marginal change in the objective function per unit increase in the availability of a binding constraint resource.", hint: "dual price value" },
      { front: "Queuing Theory", back: "The mathematical study of waiting lines, analyzing arrival patterns, service dynamics, and average wait metrics.", hint: "arrivals and queues" },
      { front: "Feasible Region", back: "The intersection area of all constraint inequalities, representing all possible combinations of decision variable values.", hint: "valid boundary space" },
      { front: "Sensitivity Analysis", back: "Evaluating how changes in input model parameters (costs, bounds) alter optimal corner solutions.", hint: "parameter tolerance" },
      { front: "Linear Programming", back: "A mathematical optimization technique representing an objective and all constraints purely via linear mathematical relationships.", hint: "straight equations only" },
      { front: "Degeneracy", back: "A condition in Simplex where one or more basic variables equal zero, which can lead to endless cycling traps.", hint: "zero basic value" },
      { front: "Dual Problem", back: "An alternative formulation of any LP problem where variables track resources and row constraints match variables.", hint: "optimization shadow reflection" }
    ];
  }
  
  if (norm.includes("ergonomic") || norm.includes("human") || norm.includes("work") || norm.includes("method")) {
    return [
      { front: "Work Study", back: "A structured analysis of tasks utilizing Method Study (to refine layout) and Work Measurement (to set standard times).", hint: "efficiency benchmark tool" },
      { front: "Anthropometry", back: "The measurement of human physical dimensions (body height, reach, pivot bounds) used to optimize mechanical interfaces.", hint: "standard human measurements" },
      { front: "RULA Profile", back: "Rapid Upper Limb Assessment: Posture audit focusing intensely on arm, shoulder, and neck strain boundaries.", hint: "upper limbs focus" },
      { front: "Therbligs", back: "A set of 17 physical micro-movements used to identify and eliminate non-value-added manual operator actions.", hint: "Gilbreth's basic movements" },
      { front: "Normal Time", back: "The actual average observed task execution cycle time adjusted using subjective operator performance ratings.", hint: "benchmark effort time" },
      { front: "Standard Time", back: "The complete normalized execution time encompassing Normal Time plus deliberate delay and fatigue allowances.", hint: "Standard = Normal + Allowances" },
      { front: "NIOSH Lifting Equation", back: "A mathematical tool tracking distance, vertical height, lift angle, and grip quality to state safe weight boundaries.", hint: "Recommended Weight Limit (RWL)" },
      { front: "Method Study", back: "The systematic recording and critical examination of existing methods of work to develop easier, more effective ways.", hint: "How to simplify tasks" }
    ];
  }

  return [
    { front: "Kaizen", back: "A Japanese philosophy of continuous improvement, engaging all employees in tiny, sequential, iterative efficiency revisions.", hint: "Continuous, tiny shifts" },
    { front: "Lean Six Sigma", back: "A synergistic framework combining Lean (focusing on waste elimination) and Six Sigma (concentrated on minimizing defects).", hint: "Waste-free process control" },
    { front: "Value Stream Mapping", back: "An end-to-end flowchart layout tracking material pathways and communication steps from supply input to end deployment.", hint: "Visualize flow and inventory" },
    { front: "Total Quality Management", back: "An organization-wide management initiative focused on satisfying customer specifications by constantly monitoring yield parameters.", hint: "Organization-wide quality standard" },
    { front: "Line Balancing", back: "Distributing job operations evenly across assembly workstations so that operational tasks match cycle times.", hint: "Match takt speed" },
    { front: "DMAIC Cycle", back: "The core Six Sigma improvement engine: Define initial boundaries, Measure metrics, Analyze sources, Improve states, and Control changes.", hint: "Quality loop stages" },
    { front: "5S Framework", back: "A workspace optimization framework: Sort (Seiri), Set in order (Seiton), Shine (Seiso), Standardize (Seiketsu), and Sustain (Shitsuke).", hint: "Productive desk rules" },
    { front: "Lean Waste Categories (Muda)", back: "The classic 7 muda blocks: Transportation, Inventory, Motion, Waiting, Overproduction, Overprocessing, and Defects.", hint: "TIMWOOD checklist" }
  ];
}

/**
 * Returns static practical reference links matching student resource searches.
 */
function getOfflineResources(topic: string): any[] {
  return [
    {
      title: "MIT OpenCourseWare: Introduction to Operations Research",
      description: "Complete, world-class reference lectures, assignments, and notes mapping the simplex algorithm and linear program setups.",
      url: "https://ocw.mit.edu/courses/undergraduate-graduate-courses-math",
      type: "course"
    },
    {
      title: "IEOM Society Educational Library & Papers",
      description: "Direct reference index full of practical ergonomics reports, factory plant layouts, and time-study templates for students.",
      url: "http://ieomsociety.org/ieom",
      type: "article"
    },
    {
      title: "Lean Enterprise Institute (LEI) Standard Checklists",
      description: "Step-by-step visual guides analyzing VSM processes, Toyota Production Systems (TPS), and Kaizen frameworks.",
      url: "https://www.lean.org",
      type: "pdf"
    },
    {
      title: "Operations Research Lectures by Dr. Richard Weber",
      description: "Exceptional, easily understood math walk-throughs breaking down queuing simplex columns and sensitivity checks.",
      url: "https://www.youtube.com/results?search_query=operations+research+richard+weber",
      type: "video"
    }
  ];
}

/**
 * Returns a detailed Markdown explanation mapping the student's question topic.
 */
function getOfflineChatResponse(prompt: string): string {
  const norm = prompt.toLowerCase();
  
  let responseHeader = `> 🌐 **Offline Mode Activated**: Due to high traffic, I've loaded our local **Cebu Tech IE Knowledge Base** to answer your question immediately.\n\n`;

  if (norm.includes("gwa") || norm.includes("grade") || norm.includes("scale") || norm.includes("failed")) {
    return responseHeader + `### 📊 CTU Grading System & GWA Reference
At Cebu Technological University (CTU), Industrial Engineering student performance is tracked using a local General Weighted Average (GWA) scale:

* **Excellent**: 1.00 – 1.50
* **Good**: 1.75 – 2.25
* **Passed**: 2.50 – 3.00
* **Failed**: 3.25 – 5.00

**Pro Advisor Tip:**
If you have received a GWA below 3.0 in subjects like *Calculus* or *Operations Research*, check the **Catalog** immediately to ensure you are not blocked from registering for downstream core prerequisites next semester.`;
  }

  if (norm.includes("operations research") || norm.includes("simplex") || norm.includes("linear programming")) {
    return responseHeader + `### ⚙️ Master Class: Operations Research (OR)
Operations Research is the mathematical core of Industrial Engineering optimization. It represents real-world resource allocation constraints as algebraic inequalities.

**Key Optimization Pillars:**
1. **Formulation:** Defining decision variables ($x_1, x_2$), objective functions ($Z = cx$), and binding constraints ($Ax \\le b$).
2. **The Simplex Algorithm:** Traversing adjacent corner-point feasible (CPF) solutions on a multi-dimensional polyhedron to find the absolute maximum/minimum.
3. **Dual Simplex & Shadow Pricing:** The dual formulation optimizes resource values. The *Shadow Price* states exactly how much profitability increases per unit expansion on scarce machine/labor resources.

*Recommended study paths:* Review linear matrix algebra, simplex pivot vectors, and pivot computations carefully inside our local Flashcards under **Study Hub**!`;
  }

  if (norm.includes("ergonomics") || norm.includes("work study") || norm.includes("anthropom")) {
    return responseHeader + `### 🪑 Work Design & Human Factors (Ergonomics)
Ergonomics focuses on aligning workspace layouts and equipment interfaces with biological, physical, and cognitive human capacity.

**Key Assessment Methodologies:**
* **Method Study:** Recording workflows using charts (Flow Diagrams, Two-Handed Charts) to prune double-handling and idle times.
* **Work Measurement (Times Studies):** Utilizing stopwatches or pre-determined standards (MTM, MOST) to compute Standard Time:
  $$\\text{Standard Time} = \\text{Observed Time} \\times \\text{Rating} + \\text{Allowances}$$
* **Posture Assessment Tools:** Applying **RULA** (Rapid Upper Limb) for workstation/typing strains, and **REBA** (Rapid Entire Body) for heavy construction or assembly hauling tasks.`;
  }

  if (norm.includes("six sigma") || norm.includes("quality control") || norm.includes("control chart") || norm.includes("statistical")) {
    return responseHeader + `### 📈 Statistical Quality Control (SQC) & Six Sigma
SQC deploys statistical methodologies to assess performance variances over sequential manufacturing runs.

**Six Sigma Blueprint (DMAIC):**
1. **Define:** Project charter scope.
2. **Measure:** Collect natural baseline defect metrics.
3. **Analyze:** Drill down using Pareto Charts (80/20 rule) or Ishikawa Fishbone diagrams.
4. **Improve:** Run physical design of experiments (DOE).
5. **Control:** Embed X-bar, R, or p charts on the line.

**Formula Check:**
Process Capability indices track specification bounds ($USL, LSL$) against natural equipment widths ($6\\sigma$):
$$C_p = \\frac{USL - LSL}{6\\sigma}$$
A $C_p > 1.33$ represents a sturdy, capable engineering process outputting minimal spec outliers.`;
  }

  if (norm.includes("curriculum") || norm.includes("subjects") || norm.includes("first year") || norm.includes("second year") || norm.includes("third year") || norm.includes("fourth year")) {
    return responseHeader + `### 🎓 CTU Industrial Engineering Curriculum Strategy
Cebu Technological University is committed to training industry-ready engineers. Our curriculum is structured sequentially to prevent downstream academic blockers.

**Critical Strategic Landmarks:**
1. **Year 1 - Foundations:** Chemistry, Calculus, Computer Fundamentals, and introduction to basic industrial concepts.
2. **Year 2 - Mathematical Transition:** Operations Research 1, Thermodynamics, Materials Engineering, and Advanced Physics.
3. **Year 3 - Core Systems:** Work Study, Ergonomics, Production Planning & Control, Quality Control, and Engineering Economy.
4. **Year 4 - Industry Synthesis:** Supply Chain, Systems Engineering, Capstone Design / Thesis, and On-the-Job Training (OJT).

*Actionable Advice:* Navigate to the **Matrix** tab or **Catalog** tab to instantly check your pending prerequisites. Always complete math courses early so you don't stall your operations research track in Year 2 and Year 3!`;
  }

  return responseHeader + `### 👋 Hello! Ready to Optimize Your Engineering Academic Track?
I am your **Industrial Engineering Academic Advisor** for Cebu Technological University. I'm here to help you optimize your study plans, design roadmaps, prepare for exams, or tackle difficult calculations.

**How I can support you today:**
* **Curriculum Checkpoint:** Ask about CTU prerequisites, year levels, or coursework advice.
* **Master Concepts:** Clarify confusing rules in *Operations Research*, *Method Studies*, *Statistical Quality Control*, or *Engineering Economy*.
* **Grading Insight:** Learn how your CTU GWA impacts your study and career milestones.

*What specific concept or subject can I explain for you right now?*`;
}

export { handleFallback, getOfflineQuiz, getOfflineFlashcards, getOfflineResources, getOfflineChatResponse };

export async function generateStudyPlan(currentProgress: any, subjects: any[]): Promise<any[]> {
  const text = await safeGenerateContent(`
    You are an elite academic planner for Industrial Engineering.
    Student Progress Data: ${JSON.stringify(currentProgress)}
    Curriculum Data: ${JSON.stringify(subjects.map(s => ({ id: s.id, code: s.code, name: s.name, prerequisites: s.prerequisiteIds })))}
    
    TASK: Design an optimized, sequential study roadmap to help this student graduate efficiently while mastering the core engineering competencies.
    
    REQUIREMENTS:
    - Return a JSON array representing the optimal sequence of steps.
    - Each step object must have: 
      - title (string): E.g. "Foundation Phase 1", "Core IE Principles"
      - description (string): A motivating, strategic explanation of this phase.
      - subjects (array of strings): The subject codes to focus on in this step.
      - difficulty ("easy"|"medium"|"hard")
      - priority ("high"|"medium"|"low")
      - estimatedTime (string): E.g. "4 Weeks", "1 Semester"
      - breakdown (array of strings): 3 to 5 actionable bullet points on how to approach this specific combination of subjects.
      
    - ONLY provide the JSON array in the response, strictly formatted as valid JSON.
  `, true);
  try { 
      const cleanText = text.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleanText); 
  } catch (e) { console.error('Failed to parse plan:\n', text); return []; }
}

export async function askQuestion(question: string, context: string): Promise<string> {
  return await safeGenerateContent(`
    Ctx: ${context}
    Q: ${question}
  `, false, "IE Advisor for CTU. Be encouraging, professional, and knowledgeable. Use real IE examples. Markdown format.");
}

export async function generateQuiz(subjectName: string): Promise<any[]> {
  const text = await safeGenerateContent(`
    Create a highly challenging and educational 5-question multiple-choice quiz for the Industrial Engineering subject: "${subjectName}".
    
    REQUIREMENTS:
    - Questions should test deep conceptual understanding, not just rote memorization.
    - Include scenarios or calculations where appropriate for IE concepts.
    - Return a valid JSON array of objects, where each object has:
      - question (string)
      - options (array of 4 distinct strings)
      - answerIndex (number 0-3 corresponding to the correct option)
      - explanation (string explaining WHY the answer is correct and why tricky distractors are wrong)
      
    ONLY output the raw JSON array.
  `, true);
  try { 
      const cleanText = text.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleanText); 
  } catch { return []; }
}

export async function getCurriculumAdvice(userProgress: any, subjects: any[]): Promise<string> {
  const completedCount = Object.values(userProgress).filter((p: any) => p.status === 'done').length;
  const progressHash = `advice_${completedCount}_${subjects.length}_${Object.keys(userProgress).length}`;
  
  // Client-side cache check
  try {
    const cached = localStorage.getItem(progressHash);
    if (cached) {
      const { text, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 1000 * 60 * 60 * 24) { // 24 hour cache
        return text;
      }
    }
  } catch (e) { /* ignore */ }

  // Drastically minimize payload for advice
  const incompleteSubjects = subjects
    .filter(s => userProgress[s.id]?.status !== 'done')
    .map(s => ({ 
      id: s.id, 
      p: (s.prerequisiteIds || []).filter((pid: string) => userProgress[pid]?.status !== 'done'),
      y: s.yearLevel[0], // Only first char "1", "2" etc
      s: s.semester[0]   // Only first char "1", "2"
    }))
    .slice(0, 10); 

  const currentStatus = {
    pct: Math.round((completedCount / subjects.length) * 100)
  };

  try {
    const result = await safeGenerateContent(`
      Progress: ${currentStatus.pct}%
      Incomplete: ${JSON.stringify(incompleteSubjects)}
      TASK: Analyze progress. Provide advice.
    `, false, "You are an IE Advisor. 1) Encouraging greeting. 2) 3 data-driven tips. 3) Identify bottlenecks. Use Markdown. Very concise.");
    
    if (result) {
      try {
        localStorage.setItem(progressHash, JSON.stringify({ text: result, timestamp: Date.now() }));
      } catch (e) {}
    }

    return result || getStaticAdvice(userProgress, subjects);
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429')) {
      // Return static advice if AI is capped
      return `🚨 **AI Quota Exhausted** (Free Tier Limit reached). \n\nI've generated this **Offline Expert Advice** for you while our AI systems synchronize: \n\n${getStaticAdvice(userProgress, subjects)}`;
    }
    throw error;
  }
}

/**
 * Provides helpful, non-AI advice based on year level and common IE bottlenecks.
 * This is used as a fallback when the Gemini Free Tier is exhausted.
 */
function getStaticAdvice(userProgress: any, subjects: any[]): string {
  // Determine current year level based on progress
  const completedIds = Object.keys(userProgress).filter(id => userProgress[id].status === 'done');
  const levelWeights = { '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4 };
  
  // Find highest year level with incomplete subjects
  const incompleteSubjects = subjects.filter(s => !completedIds.includes(s.id));
  const currentYear = incompleteSubjects.length > 0 
    ? incompleteSubjects[0].yearLevel 
    : '4th Year';

  const commonAdvice: Record<string, string[]> = {
    '1st Year': [
      "Focus intensely on your Mathematics foundations (Algebra, Calculus). These are the bedrock of Engineering.",
      "Join the Junior Philippine Institute of Industrial Engineers (JPIIE) early to build your professional network.",
      "Prioritize your **Computer Fundamentals**—Excel is an IE's most powerful tool for data analysis.",
      "Establish good study habits now; IE requires strong logical thinking and process orientation."
    ],
    '2nd Year': [
      "Prepare for **Operations Research**. It's logically demanding but defines the optimization core of IE.",
      "Stay meticulous with **Industrial Processes**. Understanding 'how things are made' is vital for future optimization.",
      "Don't neglect your **Thermodynamics**; it's a critical prerequisite for many higher-level lab subjects.",
      "Start exploring **Lean Manufacturing** concepts—they will make your 3rd-year subjects much clearer."
    ],
    '3rd Year': [
      "You are entering the 'IE Core'. Focus on **Ergonomics** and **Work Study** (Method Improvement).",
      "Start looking into **Lean Six Sigma White/Yellow Belt** certifications. They complement your 3rd-year coursework.",
      "Your **Statistical Quality Control** (SQC) skills will be highly marketable during your upcoming internship.",
      "Master **Production Planning and Control** (PPC)—it's the heart of manufacturing management."
    ],
    '4th Year': [
      "Prioritize your **Capital Project / Capstone**. Start data collection early to avoid graduation bottlenecks.",
      "Focus on **Supply Chain Management** trends like Industry 4.0, Green Logistics, and Digital Twins.",
      "Prepare for the **Certified Industrial Engineer (CIE)** exam by reviewing your 2nd and 3rd-year core notes.",
      "Networking is key—leverage your IE skills by solving a real problem for a local industry during your OJT."
    ]
  };

  const adviceList = commonAdvice[currentYear] || commonAdvice['1st Year'];
  const shuffled = [...adviceList].sort(() => 0.5 - Math.random());
  
  return `### IE Expert Guidance (${currentYear})
1. ${shuffled[0]}
2. ${shuffled[1]}
3. ${shuffled[2]}

**Pro-Tips for Success:**
- **Optimize your Schedule:** Use the **Catalog** to check prerequisites for upcoming semesters to avoid being 'blocked' by a failed subject.
- **Data over Opinions:** Industrial Engineering is about optimization. Always look for the data in your problems.
- **Stay Curious:** IE is broad. Whether it's ergonomics, supply chain, or operations research, find the niche that excites you!`;
}

export async function generateFlashcards(topic: string, count = 10): Promise<any[]> {
  const text = await safeGenerateContent(`
    Create ${count} advanced study flashcards for the Industrial Engineering topic: "${topic}".
    
    REQUIREMENTS:
    - Focus on crucial terms, formulas, methodologies, and frameworks.
    - Return ONLY a valid JSON array of objects with the exact schema:
      - front (string): The question or term (be concise).
      - back (string): The thorough, accurate answer or definition.
      - hint (string): A short contextual clue or mnemonic device to help remember it.
      
    ONLY output the raw JSON array.
  `, true);
  try { 
      const cleanText = text.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleanText); 
  } catch { return []; }
}

export async function searchExternalResources(topic: string): Promise<any[]> {
  const text = await safeGenerateContent(`
    Recommend 4 exceptionally high-quality, practical learning resources (like textbooks, seminal papers, top YouTube channels, or platforms) for mastering the IE topic: "${topic}".
    
    REQUIREMENTS:
    - Output MUST be a valid JSON array of objects.
    - Schema: { title (string), description (string - why it's useful to an IE), url (string - provide a realistic search or direct link), type ("video"|"pdf"|"article"|"course") }
    
    ONLY output the raw JSON array.
  `, true);
  try { 
      const cleanText = text.replace(/```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleanText); 
  } catch { return []; }
}

export async function generateChatResponse(messages: {role: string; content: string}[], systemContext: string): Promise<string> {
  const history = messages.map(m => `${m.role === 'user' ? 'Student' : 'Advisor'}: ${m.content}`).join('\n');
  return await safeGenerateContent(`${systemContext}\n\nConversation:\n${history}\n\nAdvisor:`);
}

// Added back for custom components that might need direct model access securely
export async function generateContent(options: any) {
  const provider = getActiveProvider();
  if (!provider) return { text: "" };
  
  try {
     if (provider === 'gemini') {
         const response = await fetch("/api/ai/generate", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ 
             prompt: options.contents && typeof options.contents === 'string' ? options.contents : undefined,
             contents: options.contents && typeof options.contents !== 'string' ? options.contents : undefined,
             model: options.model || DEFAULT_GEMINI_MODEL,
             config: options.config
           }),
         });
         
         if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData.error || `Server responded with ${response.status}`);
         }
         
         const data = await response.json();
         return { text: data.text || "" };
     } else {
         // Transform options.contents into a prompt string for openrouter/groq
         let prompt = "";
         if (typeof options.contents === 'string') {
             prompt = options.contents;
         } else if (Array.isArray(options.contents)) {
             // simplified extraction
             prompt = options.contents.map(c => typeof c === 'string' ? c : c.parts ? c.parts.map((p:any) => p.text).join(' ') : JSON.stringify(c)).join('\n');
         } else if (options.contents?.parts) {
             prompt = options.contents.parts.map((p:any) => p.text).join(' ');
         } else {
             prompt = JSON.stringify(options.contents);
         }
         
         const isJson = options.config?.responseMimeType === "application/json";
         const sysInst = options.config?.systemInstruction;
         
         if (provider === 'groq') {
             const res = await fetchGroq(prompt, isJson, sysInst);
             return { text: res || "" };
         } else if (provider === 'openrouter') {
             const res = await fetchOpenRouter(prompt, isJson, sysInst);
             return { text: res || "" };
         }
     }
  } catch (error) {
    console.error("[generateContent Error]", error);
  }
  return { text: "" };
}

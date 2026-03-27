import { sql } from "../db/client";

export type ExerciseLibraryItem = {
  key: string;
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  image: string;
  videoUrl?: string | null;
  accent: string;
  glyph: string;
  pose?: ExercisePose;
  id?: number;
  imageUrl?: string | null;
  isCustom?: boolean;
  source?: "static" | "custom";
};

export type ExerciseGuide = {
  overview: string;
  steps: string[];
  tips: string[];
  commonMistakes: string[];
};

type ExercisePose =
  | "default"
  | "squat"
  | "hinge"
  | "press"
  | "bench"
  | "pull"
  | "row"
  | "hang"
  | "core"
  | "plank"
  | "twist"
  | "cardio"
  | "jump"
  | "mobility"
  | "lunge"
  | "bridge"
  | "raise"
  | "swing";

function getExercisePose(item: Pick<ExerciseLibraryItem, "key" | "category" | "muscle" | "equipment">): ExercisePose {
  const key = item.key.toLowerCase();

  if (key.includes("lateral_raise") || key.includes("rear_delt_fly") || key.includes("face_down_y_raise")) return "raise";
  if (key.includes("bench_press") || key.includes("incline_press") || key.includes("decline_bench_press") || key.includes("machine_chest_press") || key.includes("push_up") || key.includes("dips") || key.includes("fly")) return "bench";
  if (key.includes("squat") || key.includes("leg_press") || key.includes("hack_squat") || key.includes("sissy_squat")) return "squat";
  if (key.includes("lunge") || key.includes("split_squat") || key.includes("step_up") || key.includes("cossack")) return "lunge";
  if (key.includes("hip_thrust") || key.includes("glute_bridge")) return "bridge";
  if (key.includes("deadlift") || key.includes("good_morning") || key.includes("back_extension") || key.includes("reverse_hyperextension") || key.includes("rdl") || key.includes("romanian")) return "hinge";
  if (key.includes("kettlebell_swing")) return "swing";
  if (item.category === "Push" || key.includes("press") || key.includes("overhead") || key.includes("arnold") || key.includes("push_press")) return key.includes("bench") ? "bench" : "press";
  if (item.category === "Pull" || key.includes("row") || key.includes("pull_up") || key.includes("pulldown") || key.includes("face_pull") || key.includes("pullover") || key.includes("chin_up") || key.includes("assisted_pull_up")) return key.includes("row") ? "row" : key.includes("pull_up") || key.includes("chin_up") || key.includes("pulldown") ? "hang" : "pull";
  if (item.category === "Core" || key.includes("plank") || key.includes("crunch") || key.includes("dead_bug")) return key.includes("plank") ? "plank" : key.includes("twist") || key.includes("woodchop") ? "twist" : "core";
  if (item.category === "Cardio") return key.includes("burpee") || key.includes("jump") || key.includes("rope") || key.includes("mountain_climber") ? "jump" : "cardio";
  if (item.category === "Movilidad") return "mobility";

  return "default";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeArtwork(name: string, accent: string, glyph: string, pose: ExercisePose = "default", seed = name) {
  const poseLabels: Record<ExercisePose, string> = {
    default: "Rutina",
    squat: "Sentadilla",
    press: "Press",
    bench: "Banca",
    pull: "Pull",
    row: "Remo",
    hang: "Barra",
    hinge: "Hinge",
    bridge: "Puente",
    lunge: "Zancada",
    core: "Core",
    plank: "Plancha",
    twist: "Rotacion",
    cardio: "Cardio",
    jump: "Salto",
    mobility: "Movilidad",
    raise: "Elevacion",
    swing: "Swing",
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" fill="none"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.04"/></linearGradient></defs><rect width="1200" height="800" rx="56" fill="url(#bg)"/><circle cx="1040" cy="160" r="180" fill="#ffffff" fill-opacity="0.10"/><circle cx="170" cy="680" r="220" fill="#000000" fill-opacity="0.10"/><rect x="96" y="96" width="1008" height="608" rx="44" fill="url(#panel)" stroke="#ffffff" stroke-opacity="0.12"/><g transform="translate(160 200)"><circle cx="120" cy="120" r="88" fill="#ffffff" fill-opacity="0.18"/><path d="M60 132c28-66 100-98 168-84 18 4 36 12 52 22l-32 52c-20-10-42-14-64-12-40 4-76 28-94 66l-30-44Z" fill="#ffffff" fill-opacity="0.78"/><path d="M210 114h92l-20 52h-72z" fill="#ffffff" fill-opacity="0.28"/><text x="0" y="340" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="90" font-weight="800">${glyph}</text><text x="0" y="408" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600">${poseLabels[pose]} · ${name}</text></g></svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const predefinedExercises: Omit<ExerciseLibraryItem, "image" | "source" | "id" | "imageUrl" | "isCustom" | "pose">[] = [
  { key: "squat", name: "Sentadilla", category: "Fuerza", muscle: "Piernas", equipment: "Barra", accent: "#f97316", glyph: "SQ" },
  { key: "front_squat", name: "Sentadilla frontal", category: "Fuerza", muscle: "Piernas", equipment: "Barra", accent: "#fb923c", glyph: "FS" },
  { key: "bench_press", name: "Press banca", category: "Push", muscle: "Pecho", equipment: "Barra", accent: "#22c55e", glyph: "BP" },
  { key: "incline_press", name: "Press inclinado", category: "Push", muscle: "Pecho", equipment: "Mancuernas", accent: "#4ade80", glyph: "IP" },
  { key: "deadlift", name: "Peso muerto", category: "Fuerza", muscle: "Espalda", equipment: "Barra", accent: "#06b6d4", glyph: "DL" },
  { key: "romanian_deadlift", name: "Peso muerto rumano", category: "Posterior", muscle: "Isquios", equipment: "Barra", accent: "#0ea5e9", glyph: "RD" },
  { key: "overhead_press", name: "Press militar", category: "Push", muscle: "Hombros", equipment: "Barra", accent: "#a855f7", glyph: "MP" },
  { key: "lateral_raise", name: "Elevaciones laterales", category: "Accesorio", muscle: "Hombros", equipment: "Mancuernas", accent: "#c084fc", glyph: "LR" },
  { key: "row", name: "Remo con barra", category: "Pull", muscle: "Espalda", equipment: "Barra", accent: "#f43f5e", glyph: "RW" },
  { key: "seated_row", name: "Remo sentado", category: "Pull", muscle: "Espalda", equipment: "Polea", accent: "#fb7185", glyph: "SR" },
  { key: "pull_up", name: "Dominadas", category: "Pull", muscle: "Espalda", equipment: "Barra fija", accent: "#14b8a6", glyph: "PU" },
  { key: "lat_pulldown", name: "Jalón al pecho", category: "Pull", muscle: "Espalda", equipment: "Polea", accent: "#2dd4bf", glyph: "LP" },
  { key: "hip_thrust", name: "Hip thrust", category: "Pierna", muscle: "Glúteos", equipment: "Barra", accent: "#eab308", glyph: "HT" },
  { key: "lunges", name: "Zancadas", category: "Pierna", muscle: "Piernas", equipment: "Mancuernas", accent: "#3b82f6", glyph: "LG" },
  { key: "bulgarian_split_squat", name: "Búlgaras", category: "Pierna", muscle: "Piernas", equipment: "Mancuernas", accent: "#60a5fa", glyph: "BS" },
  { key: "leg_press", name: "Prensa", category: "Pierna", muscle: "Piernas", equipment: "Máquina", accent: "#f59e0b", glyph: "LP" },
  { key: "biceps_curl", name: "Curl bíceps", category: "Accesorio", muscle: "Brazos", equipment: "Mancuernas", accent: "#ef4444", glyph: "CB" },
  { key: "triceps_pushdown", name: "Pushdown tríceps", category: "Accesorio", muscle: "Brazos", equipment: "Polea", accent: "#dc2626", glyph: "TP" },
  { key: "dips", name: "Fondos", category: "Push", muscle: "Pecho", equipment: "Barras", accent: "#f87171", glyph: "DP" },
  { key: "chest_fly", name: "Aperturas", category: "Accesorio", muscle: "Pecho", equipment: "Mancuernas", accent: "#fb7185", glyph: "AF" },
  { key: "cable_fly", name: "Cruce de poleas", category: "Accesorio", muscle: "Pecho", equipment: "Polea", accent: "#f472b6", glyph: "CF" },
  { key: "leg_extension", name: "Extensión de cuádriceps", category: "Pierna", muscle: "Cuádriceps", equipment: "Máquina", accent: "#f59e0b", glyph: "LE" },
  { key: "leg_curl", name: "Curl femoral", category: "Pierna", muscle: "Isquios", equipment: "Máquina", accent: "#d97706", glyph: "LC" },
  { key: "calf_raise", name: "Elevación de gemelos", category: "Pierna", muscle: "Pantorrillas", equipment: "Máquina", accent: "#84cc16", glyph: "CR" },
  { key: "step_up", name: "Step up", category: "Pierna", muscle: "Piernas", equipment: "Banco", accent: "#38bdf8", glyph: "SU" },
  { key: "good_morning", name: "Buenos días", category: "Posterior", muscle: "Espalda baja", equipment: "Barra", accent: "#0f766e", glyph: "GM" },
  { key: "kettlebell_swing", name: "Kettlebell swing", category: "Cardio", muscle: "Full body", equipment: "Kettlebell", accent: "#14b8a6", glyph: "KS" },
  { key: "farmers_walk", name: "Farmer walk", category: "Core", muscle: "Agarre", equipment: "Mancuernas", accent: "#64748b", glyph: "FW" },
  { key: "dead_bug", name: "Dead bug", category: "Core", muscle: "Core", equipment: "Peso corporal", accent: "#22c55e", glyph: "DB" },
  { key: "russian_twist", name: "Russian twist", category: "Core", muscle: "Oblicuos", equipment: "Peso corporal", accent: "#16a34a", glyph: "RT" },
  { key: "bike", name: "Bicicleta", category: "Cardio", muscle: "Cardio", equipment: "Máquina", accent: "#38bdf8", glyph: "BK" },
  { key: "battle_ropes", name: "Battle ropes", category: "Cardio", muscle: "Cardio", equipment: "Cuerdas", accent: "#0284c7", glyph: "BR" },
  { key: "arnold_press", name: "Press Arnold", category: "Push", muscle: "Hombros", equipment: "Mancuernas", accent: "#8b5cf6", glyph: "AP" },
  { key: "machine_shoulder_press", name: "Press hombros máquina", category: "Push", muscle: "Hombros", equipment: "Máquina", accent: "#a855f7", glyph: "MS" },
  { key: "incline_row", name: "Remo inclinado", category: "Pull", muscle: "Espalda", equipment: "Mancuernas", accent: "#ec4899", glyph: "IR" },
  { key: "stretch_flow", name: "Movilidad", category: "Movilidad", muscle: "General", equipment: "Sin equipo", accent: "#06b6d4", glyph: "MV" },
  { key: "plank", name: "Plancha", category: "Core", muscle: "Core", equipment: "Peso corporal", accent: "#10b981", glyph: "PL" },
  { key: "crunch", name: "Crunch", category: "Core", muscle: "Core", equipment: "Peso corporal", accent: "#34d399", glyph: "CR" },
  { key: "mountain_climbers", name: "Mountain climbers", category: "Cardio", muscle: "Core", equipment: "Peso corporal", accent: "#0891b2", glyph: "MC" },
  { key: "burpees", name: "Burpees", category: "Cardio", muscle: "Full body", equipment: "Peso corporal", accent: "#0284c7", glyph: "BU" },
  { key: "glute_bridge", name: "Puente glúteo", category: "Pierna", muscle: "Glúteos", equipment: "Peso corporal", accent: "#facc15", glyph: "GB" },
  { key: "push_up", name: "Flexiones", category: "Push", muscle: "Pecho", equipment: "Peso corporal", accent: "#16a34a", glyph: "PU" },
  { key: "walk", name: "Caminata", category: "Cardio", muscle: "General", equipment: "Sin equipo", accent: "#22c55e", glyph: "WK" },
  { key: "incline_bench_press", name: "Press inclinado barra", category: "Push", muscle: "Pecho", equipment: "Barra", accent: "#34d399", glyph: "IB" },
  { key: "decline_bench_press", name: "Press declinado", category: "Push", muscle: "Pecho", equipment: "Barra", accent: "#22c55e", glyph: "DB" },
  { key: "close_grip_bench_press", name: "Press agarre cerrado", category: "Push", muscle: "Tríceps", equipment: "Barra", accent: "#84cc16", glyph: "CG" },
  { key: "machine_chest_press", name: "Press pecho máquina", category: "Push", muscle: "Pecho", equipment: "Máquina", accent: "#10b981", glyph: "CP" },
  { key: "push_press", name: "Push press", category: "Push", muscle: "Hombros", equipment: "Barra", accent: "#8b5cf6", glyph: "PP" },
  { key: "seated_dumbbell_press", name: "Press hombros sentado", category: "Push", muscle: "Hombros", equipment: "Mancuernas", accent: "#7c3aed", glyph: "SD" },
  { key: "cable_lateral_raise", name: "Elevación lateral en polea", category: "Accesorio", muscle: "Hombros", equipment: "Polea", accent: "#8b5cf6", glyph: "CL" },
  { key: "pec_deck", name: "Pec deck", category: "Accesorio", muscle: "Pecho", equipment: "Máquina", accent: "#ec4899", glyph: "PD" },
  { key: "machine_row", name: "Remo máquina", category: "Pull", muscle: "Espalda", equipment: "Máquina", accent: "#0ea5e9", glyph: "MR" },
  { key: "chest_supported_row", name: "Remo con pecho apoyado", category: "Pull", muscle: "Espalda", equipment: "Mancuernas", accent: "#38bdf8", glyph: "CR" },
  { key: "hammer_curl", name: "Curl martillo", category: "Accesorio", muscle: "Brazos", equipment: "Mancuernas", accent: "#ef4444", glyph: "HC" },
  { key: "skull_crusher", name: "Skull crusher", category: "Accesorio", muscle: "Tríceps", equipment: "Barra", accent: "#b91c1c", glyph: "SC" },
  { key: "ab_wheel", name: "Ab wheel", category: "Core", muscle: "Abdominales", equipment: "Rueda", accent: "#14b8a6", glyph: "AW" },
  { key: "hollow_hold", name: "Hollow hold", category: "Core", muscle: "Core", equipment: "Peso corporal", accent: "#06b6d4", glyph: "HH" },
  { key: "glute_bridge_march", name: "Puente glúteo march", category: "Pierna", muscle: "Glúteos", equipment: "Peso corporal", accent: "#facc15", glyph: "GM" },
  { key: "hip_thrust_machine", name: "Hip thrust máquina", category: "Pierna", muscle: "Glúteos", equipment: "Máquina", accent: "#eab308", glyph: "HM" },
  { key: "assisted_dip", name: "Fondos asistidos", category: "Push", muscle: "Pecho", equipment: "Máquina", accent: "#fb7185", glyph: "AD" },
  { key: "reverse_fly", name: "Aperturas inversas", category: "Pull", muscle: "Hombros", equipment: "Mancuernas", accent: "#38bdf8", glyph: "RF" },
  { key: "standing_calf_raise", name: "Gemelo de pie", category: "Pierna", muscle: "Pantorrillas", equipment: "Máquina", accent: "#84cc16", glyph: "SR" },
  { key: "pendlay_row", name: "Pendlay row", category: "Pull", muscle: "Espalda", equipment: "Barra", accent: "#0284c7", glyph: "PR" },
  { key: "upright_row", name: "Remo al mentón", category: "Pull", muscle: "Hombros", equipment: "Barra", accent: "#a855f7", glyph: "UR" },
  { key: "face_pull", name: "Face pull", category: "Pull", muscle: "Hombros", equipment: "Polea", accent: "#06b6d4", glyph: "FP" },
  { key: "rear_delt_fly", name: "Pájaros", category: "Pull", muscle: "Hombros", equipment: "Mancuernas", accent: "#38bdf8", glyph: "RD" },
  { key: "one_arm_row", name: "Remo a una mano", category: "Pull", muscle: "Espalda", equipment: "Mancuernas", accent: "#0ea5e9", glyph: "1R" },
  { key: "t_bar_row", name: "Remo T-bar", category: "Pull", muscle: "Espalda", equipment: "Máquina", accent: "#0284c7", glyph: "TB" },
  { key: "seal_row", name: "Seal row", category: "Pull", muscle: "Espalda", equipment: "Banco", accent: "#0369a1", glyph: "SR" },
  { key: "pullover", name: "Pullover", category: "Pull", muscle: "Espalda", equipment: "Mancuerna", accent: "#14b8a6", glyph: "PL" },
  { key: "chin_up", name: "Chin up", category: "Pull", muscle: "Espalda", equipment: "Barra fija", accent: "#2dd4bf", glyph: "CU" },
  { key: "assisted_pull_up", name: "Dominada asistida", category: "Pull", muscle: "Espalda", equipment: "Máquina", accent: "#0f766e", glyph: "AU" },
  { key: "back_squat", name: "Sentadilla trasera", category: "Pierna", muscle: "Piernas", equipment: "Barra", accent: "#fb923c", glyph: "BS" },
  { key: "goblet_squat", name: "Sentadilla goblet", category: "Pierna", muscle: "Piernas", equipment: "Mancuerna", accent: "#f97316", glyph: "GS" },
  { key: "hack_squat", name: "Hack squat", category: "Pierna", muscle: "Cuádriceps", equipment: "Máquina", accent: "#f59e0b", glyph: "HS" },
  { key: "sissy_squat", name: "Sissy squat", category: "Pierna", muscle: "Cuádriceps", equipment: "Peso corporal", accent: "#facc15", glyph: "SS" },
  { key: "sumo_deadlift", name: "Peso muerto sumo", category: "Pierna", muscle: "Glúteos", equipment: "Barra", accent: "#22c55e", glyph: "SD" },
  { key: "single_leg_rdl", name: "RDL a una pierna", category: "Pierna", muscle: "Isquios", equipment: "Mancuernas", accent: "#16a34a", glyph: "1R" },
  { key: "walking_lunge", name: "Zancada caminando", category: "Pierna", muscle: "Piernas", equipment: "Mancuernas", accent: "#4ade80", glyph: "WL" },
  { key: "reverse_lunge", name: "Zancada inversa", category: "Pierna", muscle: "Piernas", equipment: "Mancuernas", accent: "#86efac", glyph: "RL" },
  { key: "curtsy_lunge", name: "Zancada cruzada", category: "Pierna", muscle: "Glúteos", equipment: "Mancuernas", accent: "#10b981", glyph: "CL" },
  { key: "hip_abduction", name: "Abducción de cadera", category: "Pierna", muscle: "Glúteos", equipment: "Máquina", accent: "#84cc16", glyph: "HA" },
  { key: "hip_adduction", name: "Aducción de cadera", category: "Pierna", muscle: "Aductores", equipment: "Máquina", accent: "#65a30d", glyph: "HD" },
  { key: "glute_kickback", name: "Patada de glúteo", category: "Pierna", muscle: "Glúteos", equipment: "Polea", accent: "#f59e0b", glyph: "GK" },
  { key: "donkey_kicks", name: "Donkey kicks", category: "Pierna", muscle: "Glúteos", equipment: "Peso corporal", accent: "#f97316", glyph: "DK" },
  { key: "donkey_calf_raise", name: "Gemelo en máquina", category: "Pierna", muscle: "Pantorrillas", equipment: "Máquina", accent: "#a3e635", glyph: "GC" },
  { key: "seated_calf_raise", name: "Gemelo sentado", category: "Pierna", muscle: "Pantorrillas", equipment: "Máquina", accent: "#84cc16", glyph: "SC" },
  { key: "abs_crunch_machine", name: "Crunch máquina", category: "Core", muscle: "Core", equipment: "Máquina", accent: "#38bdf8", glyph: "AC" },
  { key: "hanging_knee_raise", name: "Elevación rodillas", category: "Core", muscle: "Abdominales", equipment: "Barra fija", accent: "#0ea5e9", glyph: "HR" },
  { key: "leg_raise", name: "Elevación piernas", category: "Core", muscle: "Abdominales", equipment: "Peso corporal", accent: "#0284c7", glyph: "LR" },
  { key: "side_plank", name: "Plancha lateral", category: "Core", muscle: "Oblicuos", equipment: "Peso corporal", accent: "#06b6d4", glyph: "SP" },
  { key: "pallof_press", name: "Pallof press", category: "Core", muscle: "Core", equipment: "Polea", accent: "#14b8a6", glyph: "PP" },
  { key: "cable_crunch", name: "Crunch en polea", category: "Core", muscle: "Core", equipment: "Polea", accent: "#10b981", glyph: "CC" },
  { key: "rope_jump", name: "Saltar cuerda", category: "Cardio", muscle: "Cardio", equipment: "Cuerda", accent: "#f43f5e", glyph: "RJ" },
  { key: "running", name: "Correr", category: "Cardio", muscle: "Cardio", equipment: "Sin equipo", accent: "#fb7185", glyph: "RN" },
  { key: "incline_walk", name: "Caminata inclinada", category: "Cardio", muscle: "Cardio", equipment: "Cinta", accent: "#f97316", glyph: "IW" },
  { key: "rowing_machine", name: "Remo ergómetro", category: "Cardio", muscle: "Cardio", equipment: "Máquina", accent: "#0f766e", glyph: "RM" },
  { key: "elliptical", name: "Elíptica", category: "Cardio", muscle: "Cardio", equipment: "Máquina", accent: "#14b8a6", glyph: "EL" },
  { key: "sled_push", name: "Empuje de trineo", category: "Cardio", muscle: "Full body", equipment: "Trineo", accent: "#64748b", glyph: "SP" },
  { key: "sled_pull", name: "Arrastre de trineo", category: "Cardio", muscle: "Full body", equipment: "Trineo", accent: "#475569", glyph: "AP" },
  { key: "jump_squat", name: "Sentadilla con salto", category: "Cardio", muscle: "Piernas", equipment: "Peso corporal", accent: "#f59e0b", glyph: "JS" },
  { key: "box_jump", name: "Salto al cajón", category: "Cardio", muscle: "Piernas", equipment: "Cajón", accent: "#eab308", glyph: "BJ" },
  { key: "medicine_ball_slam", name: "Slam ball", category: "Cardio", muscle: "Full body", equipment: "Balón", accent: "#dc2626", glyph: "SB" },
  { key: "thruster", name: "Thruster", category: "Full body", muscle: "Full body", equipment: "Mancuernas", accent: "#8b5cf6", glyph: "TH" },
  { key: "clean_press", name: "Clean & press", category: "Full body", muscle: "Full body", equipment: "Barra", accent: "#a855f7", glyph: "CP" },
  { key: "burpee_box_jump", name: "Burpee con salto", category: "Cardio", muscle: "Full body", equipment: "Peso corporal", accent: "#ec4899", glyph: "BB" },
  { key: "mountain_climber_twist", name: "Mountain climber twist", category: "Core", muscle: "Core", equipment: "Peso corporal", accent: "#06b6d4", glyph: "MT" },
  { key: "woodchop", name: "Woodchop", category: "Core", muscle: "Oblicuos", equipment: "Polea", accent: "#0ea5e9", glyph: "WC" },
  { key: "farmer_carry", name: "Farmer carry", category: "Core", muscle: "Agarre", equipment: "Mancuernas", accent: "#64748b", glyph: "FC" },
  { key: "suitcase_carry", name: "Suitcase carry", category: "Core", muscle: "Core", equipment: "Mancuerna", accent: "#475569", glyph: "SC" },
  { key: "face_down_y_raise", name: "Y raise", category: "Accesorio", muscle: "Hombros", equipment: "Mancuernas", accent: "#14b8a6", glyph: "YR" },
  { key: "shrug", name: "Encogimientos", category: "Accesorio", muscle: "Trapecio", equipment: "Mancuernas", accent: "#0f766e", glyph: "SH" },
  { key: "wrist_curl", name: "Curl de muñeca", category: "Accesorio", muscle: "Antebrazo", equipment: "Mancuernas", accent: "#475569", glyph: "WC" },
  { key: "reverse_wrist_curl", name: "Curl de muñeca inverso", category: "Accesorio", muscle: "Antebrazo", equipment: "Mancuernas", accent: "#334155", glyph: "RW" },
  { key: "back_extension", name: "Extensión lumbar", category: "Posterior", muscle: "Espalda baja", equipment: "Banco", accent: "#22c55e", glyph: "BE" },
  { key: "reverse_hyperextension", name: "Reverse hyperextension", category: "Posterior", muscle: "Espalda baja", equipment: "Máquina", accent: "#16a34a", glyph: "RH" },
  { key: "bird_dog", name: "Bird dog", category: "Core", muscle: "Core", equipment: "Peso corporal", accent: "#38bdf8", glyph: "BD" },
  { key: "hip_airplane", name: "Hip airplane", category: "Movilidad", muscle: "Glúteos", equipment: "Peso corporal", accent: "#0ea5e9", glyph: "HA" },
  { key: "cossack_squat", name: "Cossack squat", category: "Movilidad", muscle: "Piernas", equipment: "Peso corporal", accent: "#f97316", glyph: "CS" },
  { key: "ankle_mobility", name: "Movilidad tobillo", category: "Movilidad", muscle: "Movilidad", equipment: "Sin equipo", accent: "#06b6d4", glyph: "AT" },
  { key: "thoracic_rotation", name: "Rotación torácica", category: "Movilidad", muscle: "Movilidad", equipment: "Sin equipo", accent: "#14b8a6", glyph: "TR" },
  { key: "shoulder_dislocates", name: "Dislocaciones hombro", category: "Movilidad", muscle: "Hombros", equipment: "Banda", accent: "#8b5cf6", glyph: "SD" },
  { key: "band_pull_apart", name: "Band pull apart", category: "Accesorio", muscle: "Espalda", equipment: "Banda", accent: "#a855f7", glyph: "BP" },
  { key: "resistance_band_row", name: "Remo con banda", category: "Pull", muscle: "Espalda", equipment: "Banda", accent: "#22d3ee", glyph: "RB" },
  { key: "resistance_band_press", name: "Press con banda", category: "Push", muscle: "Pecho", equipment: "Banda", accent: "#4ade80", glyph: "PB" },
  { key: "resistance_band_squat", name: "Sentadilla con banda", category: "Pierna", muscle: "Piernas", equipment: "Banda", accent: "#84cc16", glyph: "BS" },
];

export const exerciseLibrary: ExerciseLibraryItem[] = predefinedExercises.map((exercise) => ({
  ...exercise,
  pose: getExercisePose(exercise),
  image: makeArtwork(exercise.name, exercise.accent, exercise.glyph, getExercisePose(exercise), exercise.key),
}));

export const exerciseFallbackImage = makeArtwork("Ejercicio", "#475569", "FX");

export async function ensureExerciseSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS exercise_library_items (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      muscle TEXT NOT NULL,
      equipment TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      accent TEXT NOT NULL,
      glyph TEXT NOT NULL,
      is_custom BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE exercise_library_items ADD COLUMN IF NOT EXISTS video_url TEXT`;
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "exercise";
}

function renderImage(name: string, accent: string, glyph: string, imageUrl?: string | null) {
  return isLikelyImageUrl(imageUrl) ? imageUrl!.trim() : makeArtwork(name, accent, glyph);
}

export function isLikelyImageUrl(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("data:image/")) {
    return true;
  }

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    if (host.includes("source.unsplash.com") || host.includes("images.unsplash.com")) {
      return true;
    }

    return /\.(png|jpe?g|gif|webp|avif|svg)$/.test(path);
  } catch {
    return false;
  }
}

export function generateExerciseKey(name: string) {
  return normalizeKey(name);
}

export function createExerciseImageData(name: string, accent: string, glyph: string) {
  return makeArtwork(name, accent, glyph);
}

export function getExercisePoseForExercise(item: Pick<ExerciseLibraryItem, "key" | "category" | "muscle" | "equipment">) {
  return getExercisePose(item);
}

export async function getExerciseCatalog() {
  await ensureExerciseSchema();

  const rows = await sql`
    SELECT id, key, name, category, muscle, equipment, image_url, accent, glyph, is_custom
    FROM exercise_library_items
    ORDER BY created_at DESC, id DESC
  ` as unknown as Array<{
    id: number;
    key: string;
    name: string;
    category: string;
    muscle: string;
    equipment: string;
    image_url: string | null;
    video_url: string | null;
    accent: string;
    glyph: string;
    is_custom: boolean;
  }>; 

  const customItems: ExerciseLibraryItem[] = rows.map((item) => ({
    id: item.id,
    key: item.key,
    name: item.name,
    category: item.category,
    muscle: item.muscle,
    equipment: item.equipment,
    imageUrl: isLikelyImageUrl(item.image_url) ? item.image_url : null,
    videoUrl: item.video_url,
    image: renderImage(item.name, item.accent, item.glyph, item.image_url),
    accent: item.accent,
    glyph: item.glyph,
    isCustom: item.is_custom,
    source: "custom",
  }));

  const staticItems = exerciseLibrary.map((item) => ({
    ...item,
    source: "static" as const,
  }));

  return [...customItems, ...staticItems];
}

export async function getExerciseByKey(keyOrName: string | null | undefined) {
  if (!keyOrName) return null;

  const normalized = keyOrName.trim().toLowerCase();
  const catalog = await getExerciseCatalog();

  return catalog.find((item) => item.key === normalized || item.name.toLowerCase() === normalized) ?? null;
}

export function getExerciseLibraryItem(keyOrName: string | null | undefined) {
  if (!keyOrName) {
    return null;
  }

  const normalized = keyOrName.trim().toLowerCase();

  return (
    exerciseLibrary.find(
      (item) => item.key === normalized || item.name.toLowerCase() === normalized,
    ) ?? null
  );
}

function buildGenericGuide(item: Pick<ExerciseLibraryItem, "name" | "category" | "muscle" | "equipment">): ExerciseGuide {
  const baseSteps = [
    `Colócate con ${item.equipment.toLowerCase()} y ajusta la postura antes de empezar.`,
    `Empuja o tira de forma controlada hasta completar el recorrido de ${item.name.toLowerCase()}.`,
    `Mantén el abdomen firme y vuelve despacio a la posición inicial.`,
  ];

  const categorySteps: Record<string, string[]> = {
    Push: [
      "Alinea hombros, codos y muñecas antes de la primera repetición.",
      "Desciende con control y empuja manteniendo el pecho estable.",
      "No bloquees el movimiento si pierdes la técnica.",
    ],
    Pull: [
      "Inicia el tirón con la espalda, no con los brazos.",
      "Lleva el peso hacia tu torso sin balancear el cuerpo.",
      "Controla la vuelta y estira bien la musculatura trabajada.",
    ],
    Pierna: [
      "Apoya bien todo el pie y mantén la rodilla alineada.",
      "Baja con control hasta tu rango cómodo.",
      "Sube empujando el suelo y manteniendo el tronco firme.",
    ],
    Core: [
      "Evita arquear la zona lumbar y aprieta el abdomen.",
      "Respira de forma controlada durante cada repetición.",
      "Prioriza calidad antes que velocidad.",
    ],
    Cardio: [
      "Encuentra un ritmo sostenible desde el inicio.",
      "Mantén una respiración constante.",
      "Ajusta la intensidad para completar el tiempo previsto.",
    ],
    Movilidad: [
      "Muévete suave y sin rebotes bruscos.",
      "Busca amplitud con comodidad.",
      "Mantén cada posición unos segundos antes de cambiar.",
    ],
    Posterior: [
      "Empuja la cadera hacia atrás para cargar la cadena posterior.",
      "No redondees la espalda durante el recorrido.",
      "Aprieta glúteos e isquios al volver arriba.",
    ],
    Accesorio: [
      "Usa cargas más controladas y repeticiones limpias.",
      "No sacrifiques técnica por peso.",
      "Busca una sensación muscular clara en cada serie.",
    ],
    Fuerza: [
      "Calienta la articulación antes de cargar pesado.",
      "Trabaja con trayectoria estable y sin rebotes.",
      "Descansa lo suficiente entre series.",
    ],
  };

  const tips = [
    `Concéntrate en sentir ${item.muscle.toLowerCase()} en cada repetición.`,
    `Haz la fase negativa lenta para mejorar el control.`,
    `Si no mantienes la técnica, baja el peso.`,
  ];

  const commonMistakes = [
    "Mover el peso con impulso.",
    "Acortar demasiado el rango.",
    "Perder la postura en la fase final.",
  ];

  return {
    overview: `Guía rápida para ${item.name.toLowerCase()}.`,
    steps: categorySteps[item.category] ?? baseSteps,
    tips,
    commonMistakes,
  };
}

export function getExerciseGuide(item: Pick<ExerciseLibraryItem, "name" | "category" | "muscle" | "equipment">): ExerciseGuide {
  return buildGenericGuide(item);
}

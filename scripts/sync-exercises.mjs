import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const sql = postgres(connectionString, { ssl: false });
const WGER_API_BASE = 'https://wger.de/api/v2';

const accentByCategory = {
  Fuerza: '#0f172a',
  Push: '#22c55e',
  Pull: '#f43f5e',
  Pierna: '#f59e0b',
  Core: '#14b8a6',
  Cardio: '#38bdf8',
  Accesorio: '#a855f7',
  Posterior: '#06b6d4',
  Movilidad: '#10b981',
  'Full body': '#64748b',
};

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildGlyph(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'FX';
}

function buildSpanishDescription(name, category, muscle, equipment) {
  const safeName = String(name || 'Ejercicio');
  const safeMuscle = String(muscle || 'general').toLowerCase();
  const safeEquipment = String(equipment || 'sin equipo').toLowerCase();

  switch (category) {
    case 'Cardio':
      return [
        `${safeName} es un ejercicio cardiovascular para mejorar la resistencia, elevar el pulso y aumentar el gasto calórico.`,
        `Posición inicial: colócate estable, activa el abdomen y prepara el cuerpo antes de empezar.`,
        `Ejecución: realiza el movimiento con un ritmo constante, sin perder la técnica ni rebotar en cada repetición.`,
        `Consejo: respira de forma controlada y mantén una intensidad que puedas sostener durante toda la serie.`,
      ].join('\n\n');
    case 'Movilidad':
      return [
        `${safeName} es un ejercicio de movilidad pensado para preparar articulaciones, ganar rango de movimiento y dejar el cuerpo listo para el trabajo principal.`,
        `Posición inicial: entra en la postura con calma, sin tensión innecesaria y con respiración fluida.`,
        `Ejecución: mueve la articulación de forma suave, controlada y progresiva, evitando rebotes o tirones.`,
        `Consejo: busca amplitud sin dolor y prioriza la calidad del gesto sobre la velocidad.`,
      ].join('\n\n');
    case 'Push':
      return [
        `${safeName} es un movimiento de empuje que trabaja principalmente ${safeMuscle}.`,
        `Posición inicial: coloca ${safeEquipment === 'sin equipo' ? 'el cuerpo' : `el ${safeEquipment}`} de forma estable y mantén el tronco firme.`,
        `Ejecución: empuja con control, sin arquear la espalda y sin perder la alineación de hombros, codos y muñecas.`,
        `Consejo: baja con calma, sube con intención y evita acelerar la repetición para no perder tensión muscular.`,
      ].join('\n\n');
    case 'Pull':
      return [
        `${safeName} es un movimiento de tracción que activa sobre todo ${safeMuscle}.`,
        `Posición inicial: ajusta el agarre, abre el pecho y deja los hombros en una posición estable antes de iniciar.`,
        `Ejecución: tira con control y acerca la carga al cuerpo sin balancearte ni usar impulso de la espalda baja.`,
        `Consejo: pausa un instante al final del recorrido para sentir la contracción y volver sin perder tensión.`,
      ].join('\n\n');
    case 'Pierna':
      return [
        `${safeName} es un ejercicio de tren inferior enfocado en ${safeMuscle}.`,
        `Posición inicial: coloca los pies con una base estable y activa el abdomen antes de moverte.`,
        `Ejecución: controla la bajada y la subida, cuidando que rodillas y cadera mantengan una buena alineación.`,
        `Consejo: empuja el suelo con firmeza y evita perder estabilidad en la parte final del movimiento.`,
      ].join('\n\n');
    case 'Posterior':
      return [
        `${safeName} trabaja la cadena posterior, con foco en ${safeMuscle}.`,
        `Posición inicial: lleva la cadera hacia atrás, mantén la espalda neutra y prepara el abdomen para sostener la postura.`,
        `Ejecución: realiza la bisagra de cadera o el gesto principal con control, sin redondear la espalda ni perder tensión.`,
        `Consejo: siente el trabajo en glúteos e isquios y evita compensar con la zona lumbar.`,
      ].join('\n\n');
    case 'Core':
      return [
        `${safeName} fortalece la zona media y ayuda a estabilizar el tronco.`,
        `Posición inicial: coloca la pelvis y la caja torácica en una postura neutra antes de empezar.`,
        `Ejecución: mantén el abdomen activo durante todo el movimiento y evita que la espalda se arquee o se hunda.`,
        `Consejo: mueve solo lo necesario y prioriza el control sobre la rapidez.`,
      ].join('\n\n');
    case 'Accesorio':
      return [
        `${safeName} complementa la rutina y apoya el trabajo de ${safeMuscle}.`,
        `Posición inicial: busca una postura cómoda y estable que te permita concentrarte en el músculo objetivo.`,
        `Ejecución: haz el gesto con amplitud controlada y sin usar impulso innecesario.`,
        `Consejo: usa este ejercicio para sumar volumen de trabajo sin sacrificar la técnica.`,
      ].join('\n\n');
    default:
      return [
        `${safeName} es un ejercicio orientado a ${safeMuscle}.`,
        `Posición inicial: adopta una postura estable y prepara el cuerpo antes de iniciar la repetición.`,
        `Ejecución: controla el recorrido completo y cuida la técnica en cada fase del movimiento.`,
        `Consejo: si el ejercicio usa ${safeEquipment}, úsalo como apoyo para mantener calidad y seguridad.`,
      ].join('\n\n');
  }
}

function buildGenericArtwork(name, accent, glyph) {
  const safeName = String(name || 'Ejercicio');
  const safeGlyph = String(glyph || 'FX');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" fill="none"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0.04"/></linearGradient></defs><rect width="1200" height="800" rx="56" fill="url(#bg)"/><circle cx="1040" cy="160" r="180" fill="#ffffff" fill-opacity="0.10"/><circle cx="170" cy="680" r="220" fill="#000000" fill-opacity="0.10"/><rect x="96" y="96" width="1008" height="608" rx="44" fill="url(#panel)" stroke="#ffffff" stroke-opacity="0.12"/><text x="110" y="645" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="120" font-weight="800">${safeGlyph}</text><text x="110" y="700" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="600">${safeName}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeLabel(value) {
  return value.toLowerCase();
}

function classifyWgerExercise(name, categoryName, muscleName, equipmentName) {
  const haystack = normalizeLabel(`${name} ${categoryName} ${muscleName} ${equipmentName}`);

  let category = 'Accesorio';

  if (/cardio|aerobic|run|bike|rower|burpee|jump|rope|sled|elliptical|mountain/.test(haystack)) {
    category = 'Cardio';
  } else if (/mobility|stretch|stretching|flex|rotation|warm up|warmup|yoga|ankle|shoulder dislocate/.test(haystack)) {
    category = 'Movilidad';
  } else if (/bench|press|push|chest|dip|tricep|triceps|shoulder|overhead|arnold|fly|pec/.test(haystack)) {
    category = 'Push';
  } else if (/pull|row|lat|pulldown|chin|pull up|pull-up|back|reverse fly|face pull|pullover|rear delt/.test(haystack)) {
    category = 'Pull';
  } else if (/squat|lunge|leg press|leg extension|leg curl|deadlift|hinge|hip thrust|glute|calf|split squat|step up|hamstring|quad|quadri/.test(haystack)) {
    category = /deadlift|hip thrust|glute|hamstring/.test(haystack) ? 'Posterior' : 'Pierna';
  } else if (/core|abs|abdominal|plank|crunch|oblique|twist|woodchop|bird dog|dead bug|carry|ab wheel|hollow/.test(haystack)) {
    category = 'Core';
  } else if (/biceps|curl|hammer|shrug|wrist|forearm|calf|adduction|abduction|kickback|lateral raise|rear delt|y raise/.test(haystack)) {
    category = 'Accesorio';
  }

  const accent = accentByCategory[category] ?? '#334155';
  return { category, accent };
}

async function fetchAllPages(path, params = {}) {
  const results = [];
  let nextUrl = `${WGER_API_BASE}${path}?${new URLSearchParams(params).toString()}`;

  while (nextUrl) {
    const response = await fetch(nextUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`WGER request failed: ${response.status}`);
    }

    const payload = await response.json();
    results.push(...payload.results);
    nextUrl = payload.next;
  }

  return results;
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS exercise_library_items (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      muscle TEXT NOT NULL,
      equipment TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      accent TEXT NOT NULL,
      glyph TEXT NOT NULL,
      is_custom BOOLEAN NOT NULL DEFAULT TRUE,
      source TEXT NOT NULL DEFAULT 'custom',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE exercise_library_items ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE exercise_library_items ADD COLUMN IF NOT EXISTS video_url TEXT`;
  await sql`ALTER TABLE exercise_library_items ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'custom'`;

  await sql`
    CREATE TABLE IF NOT EXISTS exercise_library_sync_state (
      id INTEGER PRIMARY KEY,
      last_synced_at TIMESTAMP,
      remote_count INTEGER NOT NULL DEFAULT 0
    )
  `;

  const exercises = await fetchAllPages('/exerciseinfo/', { language: '4', limit: '100' });
  console.log(`Fetched ${exercises.length} exercises from WGER`);

  await sql.begin(async (tx) => {
    for (const exercise of exercises) {
      const translation = exercise.translations.find((item) => item.language === 4) ?? exercise.translations[0];
      const displayName = translation?.name ?? `Ejercicio ${exercise.id}`;
      const categoryName = exercise.category?.name ?? 'General';
      const muscleName = exercise.muscles?.[0]?.name_en || exercise.muscles?.[0]?.name || exercise.muscles_secondary?.[0]?.name_en || exercise.muscles_secondary?.[0]?.name || 'General';
      const equipmentName = exercise.equipment?.[0]?.name ?? 'Sin equipo';
      const classification = classifyWgerExercise(displayName, categoryName, muscleName, equipmentName);
      const referenceImage = exercise.images?.find((item) => item.is_main)?.image ?? exercise.images?.[0]?.image ?? null;
      const imageUrl = referenceImage ? (referenceImage.startsWith('http') ? referenceImage : `https://wger.de${referenceImage}`) : buildGenericArtwork(displayName, classification.accent, buildGlyph(displayName));
      const description = buildSpanishDescription(displayName, classification.category, classification.muscle, classification.equipment);
      const key = `wger-${exercise.id}`;

      await tx`
        INSERT INTO exercise_library_items (
          key,
          name,
          description,
          category,
          muscle,
          equipment,
          image_url,
          video_url,
          accent,
          glyph,
          is_custom,
          source
        )
        VALUES (
          ${key},
          ${displayName},
          ${description},
          ${classification.category},
          ${muscleName},
          ${equipmentName},
          ${imageUrl},
          ${exercise.videos?.[0]?.video ?? null},
          ${classification.accent},
          ${buildGlyph(displayName)},
          FALSE,
          'wger'
        )
        ON CONFLICT (key)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          muscle = EXCLUDED.muscle,
          equipment = EXCLUDED.equipment,
          image_url = EXCLUDED.image_url,
          video_url = EXCLUDED.video_url,
          accent = EXCLUDED.accent,
          glyph = EXCLUDED.glyph,
          is_custom = FALSE,
          source = 'wger',
          updated_at = NOW()
      `;
    }

    await tx`
      INSERT INTO exercise_library_sync_state (id, last_synced_at, remote_count)
      VALUES (1, NOW(), ${exercises.length})
      ON CONFLICT (id)
      DO UPDATE SET
        last_synced_at = EXCLUDED.last_synced_at,
        remote_count = EXCLUDED.remote_count
    `;
  });

  console.log('Sync complete');
}

main()
  .then(async () => {
    await sql.end({ timeout: 5 });
  })
  .catch(async (error) => {
    console.error(error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  });

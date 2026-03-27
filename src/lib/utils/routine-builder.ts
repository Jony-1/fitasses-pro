type LibraryPreset = {
  key: string;
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  imageUrl: string;
};

function getDayCards() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-day-card]"));
}

export function initRoutineBuilder() {
  const daysContainer = document.getElementById("days-container") as HTMLDivElement | null;
  const dayTemplate = document.getElementById("day-template") as HTMLTemplateElement | null;
  const addDayButton = document.getElementById("add-day") as HTMLButtonElement | null;
  const libraryButtons = document.querySelectorAll<HTMLElement>("[data-library-exercise]");
  const customLibraryButton = document.querySelector("[data-library-custom]") as HTMLButtonElement | null;
  const searchInput = document.querySelector<HTMLInputElement>("[data-library-search]");
  const typeFilterButtons = document.querySelectorAll<HTMLButtonElement>("[data-library-type-filter]");
  const muscleFilter = document.querySelector<HTMLSelectElement>("[data-exercise-muscle-filter]");
  const equipmentFilter = document.querySelector<HTMLSelectElement>("[data-exercise-equipment-filter]");
  const autoExerciseElement = document.querySelector<HTMLElement>("[data-auto-exercise]");
  const exercisePickCards = document.querySelectorAll<HTMLElement>("[data-pick-exercise]");
  const addSelectedButton = document.querySelector<HTMLButtonElement>("[data-add-selected-exercises]");
  const clearSelectedButton = document.querySelector<HTMLButtonElement>("[data-clear-selected-exercises]");
  const selectedCountLabel = document.querySelector<HTMLElement>("[data-selected-count]");

  if (!daysContainer || !dayTemplate) return;

  let dayIndex = 0;
  let selectedDayCard: HTMLElement | null = null;
  let activeTypeFilter = "all";
  const selectedExerciseKeys = new Set<string>();

  const normalize = (value: string) => value.trim().toLowerCase();

  const renumberDays = () => {
    getDayCards().forEach((dayCard: HTMLElement, index: number) => {
      const label = dayCard.querySelector(".day-label");
      const title = dayCard.querySelector("h3");

      if (label) label.textContent = `Día ${index + 1}`;
      if (title) title.textContent = dayCard.dataset.title || `Día ${index + 1}`;
    });
  };

  const setSelectedDay = (dayCard: HTMLElement | null) => {
    selectedDayCard = dayCard;
    getDayCards().forEach((card: HTMLElement) => {
      card.classList.remove("ring-2", "ring-emerald-400", "ring-emerald-400/40", "shadow-xl", "border-emerald-300", "border-emerald-500/30");
    });
    if (selectedDayCard) {
      selectedDayCard.classList.add("ring-2", "ring-emerald-400", "ring-emerald-400/40", "shadow-xl", "border-emerald-300", "border-emerald-500/30");
    }
  };

  const refreshExerciseLabels = (dayCard: HTMLElement) => {
    dayCard.querySelectorAll<HTMLElement>("[data-exercise-card]").forEach((exerciseCard: HTMLElement, index: number) => {
      const label = exerciseCard.querySelector(".exercise-label");
      const title = exerciseCard.querySelector("[data-exercise-title]");
      const summary = exerciseCard.querySelector("[data-exercise-summary]");

      if (label) label.textContent = `Ejercicio ${index + 1}`;
      if (title) title.textContent = exerciseCard.dataset.exerciseName || `Ejercicio ${index + 1}`;

      if (summary) {
        const sets = exerciseCard.querySelector<HTMLInputElement>('input[data-exercise-field="sets"]')?.value;
        const reps = exerciseCard.querySelector<HTMLInputElement>('input[data-exercise-field="reps"]')?.value;
        const rest = exerciseCard.querySelector<HTMLInputElement>('input[data-exercise-field="rest_seconds"]')?.value;
        const parts = [sets ? `${sets} series` : "Series libre", reps ? `${reps} reps` : null, rest ? `${rest}s descanso` : null].filter(Boolean);
        summary.textContent = parts.join(" · ");
      }
    });
  };

  const applyLibraryFilters = () => {
    const term = normalize(searchInput?.value ?? "");
    const selectedMuscle = muscleFilter?.value ?? "Todos";
    const selectedEquipment = equipmentFilter?.value ?? "Todos";

    libraryButtons.forEach((button) => {
      const category = button.dataset.exerciseCategory ?? "";
      const muscle = button.dataset.exerciseMuscle ?? "";
      const equipment = button.dataset.exerciseEquipment ?? "";
      const haystack = `${button.dataset.exerciseName ?? ""} ${muscle} ${equipment} ${button.dataset.exerciseCategory ?? ""}`.toLowerCase();
      const matchesType = activeTypeFilter === "all" || category === activeTypeFilter;
      const matchesMuscle = selectedMuscle === "Todos" || muscle === selectedMuscle;
      const matchesEquipment = selectedEquipment === "Todos" || equipment === selectedEquipment;
      const matchesTerm = !term || haystack.includes(term);

      button.classList.toggle("hidden", !(matchesType && matchesMuscle && matchesEquipment && matchesTerm));
    });
  };

  const updateSelectedCount = () => {
    if (selectedCountLabel) {
      selectedCountLabel.textContent = String(selectedExerciseKeys.size);
    }
  };

  const syncSelectedCardState = () => {
    exercisePickCards.forEach((card) => {
      const key = card.dataset.exerciseKey ?? "";
      const selected = selectedExerciseKeys.has(key);
      card.dataset.selected = selected ? "true" : "false";
      card.classList.toggle("ring-2", selected);
      card.classList.toggle("ring-emerald-400", selected);
      card.classList.toggle("ring-emerald-400/40", selected);
      card.classList.toggle("border-emerald-300", selected);
      card.classList.toggle("border-emerald-500/30", selected);
      card.classList.toggle("bg-emerald-50", selected);
      card.classList.toggle("dark:bg-emerald-500/10", selected);
    });

    updateSelectedCount();
  };

  const fillExerciseCard = (exerciseCard: HTMLElement, preset: LibraryPreset | null) => {
    const preview = exerciseCard.querySelector<HTMLImageElement>("[data-exercise-preview]");
    const title = exerciseCard.querySelector<HTMLElement>("[data-exercise-title]");
    const summary = exerciseCard.querySelector<HTMLElement>("[data-exercise-summary]");
    const muscle = exerciseCard.querySelector<HTMLElement>("[data-exercise-muscle]");
    const equipment = exerciseCard.querySelector<HTMLElement>("[data-exercise-equipment]");
    const keyInput = exerciseCard.querySelector<HTMLInputElement>('input[data-exercise-field="exercise_key"]');
    const imageUrlInput = exerciseCard.querySelector<HTMLInputElement>('input[data-exercise-field="image_url"]');
    const nameInput = exerciseCard.querySelector<HTMLInputElement>('input[data-exercise-field="name"]');

    if (preset) {
      if (preview) preview.src = preset.imageUrl;
      if (title) title.textContent = preset.name;
      if (summary) summary.textContent = "Tarjeta visual predefinida";
      if (muscle) muscle.textContent = preset.muscle;
      if (equipment) equipment.textContent = preset.equipment;
      if (keyInput) keyInput.value = preset.key;
      if (imageUrlInput) imageUrlInput.value = preset.imageUrl;
      if (nameInput && !nameInput.value) nameInput.value = preset.name;
      exerciseCard.dataset.exerciseName = preset.name;
      exerciseCard.dataset.exerciseCategory = preset.category;
    } else {
      if (preview) preview.src = "/favicon.png";
      if (title) title.textContent = "Ejercicio personalizado";
      if (summary) summary.textContent = "Edita nombre, series y reps";
      if (muscle) muscle.textContent = "Personalizado";
      if (equipment) equipment.textContent = "Libre";
      if (keyInput) keyInput.value = "";
      if (imageUrlInput) imageUrlInput.value = "";
      exerciseCard.dataset.exerciseName = "Ejercicio personalizado";
      exerciseCard.dataset.exerciseCategory = "Personalizado";
    }

    const updateName = () => {
      exerciseCard.dataset.exerciseName = nameInput?.value.trim() || (preset?.name ?? "Ejercicio personalizado");
      if (title) title.textContent = exerciseCard.dataset.exerciseName;
      refreshExerciseLabels(exerciseCard);
    };

    nameInput?.addEventListener("input", updateName);

    exerciseCard
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[data-exercise-field], textarea[data-exercise-field]')
      .forEach((field) => {
        field.addEventListener("input", () => refreshExerciseLabels(exerciseCard));
      });
  };

  const addExercise = (dayCard: HTMLElement, preset: LibraryPreset | null = null) => {
    const exerciseTemplate = dayCard.querySelector("[data-exercise-template]");
    const exercisesContainer = dayCard.querySelector("[data-exercises]");

    if (!(exerciseTemplate instanceof HTMLTemplateElement) || !exercisesContainer) return;

    const exerciseIndex = exercisesContainer.children.length;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = exerciseTemplate.innerHTML
      .replaceAll("__DAY_INDEX__", dayCard.dataset.dayIndex || "0")
      .replaceAll("__EXERCISE_INDEX__", String(exerciseIndex));

    const exerciseCard = wrapper.firstElementChild;
    if (!(exerciseCard instanceof HTMLElement)) return;

    exerciseCard.dataset.exerciseCard = "true";
    exerciseCard.dataset.exerciseName = preset?.name ?? "Ejercicio personalizado";
    exerciseCard.dataset.exerciseCategory = preset?.category ?? "Personalizado";
    exercisesContainer.appendChild(exerciseCard);
    fillExerciseCard(exerciseCard, preset);
    refreshExerciseLabels(dayCard);
  };

  const addSelectedExercises = () => {
    let targetDay = selectedDayCard ?? getDayCards()[0] ?? null;

    if (!targetDay) {
      addDay();
      targetDay = selectedDayCard ?? getDayCards()[0] ?? null;
    }

    if (!targetDay) {
      return;
    }

    exercisePickCards.forEach((card) => {
      const key = card.dataset.exerciseKey ?? "";
      if (!selectedExerciseKeys.has(key)) {
        return;
      }

      addExercise(targetDay as HTMLElement, {
        key,
        name: card.dataset.exerciseName ?? "Ejercicio",
        category: card.dataset.exerciseCategory ?? "",
        muscle: card.dataset.exerciseMuscle ?? "",
        equipment: card.dataset.exerciseEquipment ?? "",
        imageUrl: card.dataset.exerciseImage ?? "",
      });
    });

    selectedExerciseKeys.clear();
    syncSelectedCardState();
  };

  const addDay = () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = dayTemplate.innerHTML.replaceAll("__DAY_INDEX__", String(dayIndex));

    const dayCard = wrapper.firstElementChild;
    if (!(dayCard instanceof HTMLElement)) return;

    dayCard.dataset.dayIndex = String(dayIndex);
    dayCard.dataset.title = `Día ${dayIndex + 1}`;
    daysContainer.appendChild(dayCard);
    addExercise(dayCard);
    dayIndex += 1;
    renumberDays();
    setSelectedDay(dayCard);
  };

  const getAutoExercise = (): LibraryPreset | null => {
    if (!autoExerciseElement) {
      return null;
    }

    const key = autoExerciseElement.dataset.exerciseKey ?? "";
    const name = autoExerciseElement.dataset.exerciseName ?? "Ejercicio";
    const category = autoExerciseElement.dataset.exerciseCategory ?? "";
    const muscle = autoExerciseElement.dataset.exerciseMuscle ?? "";
    const equipment = autoExerciseElement.dataset.exerciseEquipment ?? "";
    const image = autoExerciseElement.dataset.exerciseImage ?? "";

    return { key, name, category, muscle, equipment, imageUrl: image };
  };

  daysContainer.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest("[data-library-details]")) return;

    const dayCard = target.closest("[data-day-card]");
    if (!(dayCard instanceof HTMLElement)) return;

    setSelectedDay(dayCard);

    if (target.closest("[data-add-exercise]")) {
      addExercise(dayCard);
    }

    if (target.closest("[data-remove-day]")) {
      dayCard.remove();
      renumberDays();
      setSelectedDay(getDayCards()[0] ?? null);
    }

    if (target.closest("[data-remove-exercise]")) {
      const exerciseCard = target.closest("[data-exercise-card]");
      exerciseCard?.remove();
      refreshExerciseLabels(dayCard);
    }
  });

  libraryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetDay = selectedDayCard ?? getDayCards()[0] ?? null;
      if (!targetDay) {
        addDay();
        return;
      }

      addExercise(targetDay, {
        key: button.dataset.exerciseKey ?? "",
        name: button.dataset.exerciseName ?? "Ejercicio",
        category: button.dataset.exerciseCategory ?? "",
        muscle: button.dataset.exerciseMuscle ?? "",
        equipment: button.dataset.exerciseEquipment ?? "",
        imageUrl: button.dataset.exerciseImage ?? "",
      });

      targetDay.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  exercisePickCards.forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.exerciseKey ?? "";

      if (!key) {
        return;
      }

      if (selectedExerciseKeys.has(key)) {
        selectedExerciseKeys.delete(key);
      } else {
        selectedExerciseKeys.add(key);
      }

      syncSelectedCardState();
    });
  });

  addSelectedButton?.addEventListener("click", addSelectedExercises);
  clearSelectedButton?.addEventListener("click", () => {
    selectedExerciseKeys.clear();
    syncSelectedCardState();
  });

  searchInput?.addEventListener("input", applyLibraryFilters);
  muscleFilter?.addEventListener("change", applyLibraryFilters);
  equipmentFilter?.addEventListener("change", applyLibraryFilters);

  typeFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTypeFilter = button.dataset.libraryTypeFilter ?? "all";

      typeFilterButtons.forEach((chip) => {
        chip.classList.remove("bg-slate-900", "text-white", "border-slate-900", "dark:bg-slate-100", "dark:text-slate-950", "dark:border-slate-100");
        chip.classList.add("bg-white", "text-slate-700", "border-slate-300", "dark:bg-slate-950/80", "dark:text-slate-200", "dark:border-slate-700");
      });

      button.classList.add("bg-slate-900", "text-white", "border-slate-900", "dark:bg-slate-100", "dark:text-slate-950", "dark:border-slate-100");
      button.classList.remove("bg-white", "text-slate-700", "border-slate-300", "dark:bg-slate-950/80", "dark:text-slate-200", "dark:border-slate-700");
      applyLibraryFilters();
    });
  });

  customLibraryButton?.addEventListener("click", () => {
    const targetDay = selectedDayCard ?? getDayCards()[0] ?? null;
    if (!targetDay) {
      addDay();
      return;
    }

    addExercise(targetDay);
    targetDay.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  addDayButton?.addEventListener("click", () => {
    addDay();
  });

  if (getDayCards().length === 0) {
    addDay();
  } else {
    renumberDays();
    setSelectedDay(getDayCards()[0] ?? null);
  }

  const autoExercise = getAutoExercise();
  if (autoExercise) {
    const targetDay = getDayCards()[0] ?? null;
    if (targetDay) {
      const exercisesContainer = targetDay.querySelector("[data-exercises]");
      if (exercisesContainer) {
        exercisesContainer.innerHTML = "";
      }
      addExercise(targetDay, autoExercise);
    }
  }
  applyLibraryFilters();
}

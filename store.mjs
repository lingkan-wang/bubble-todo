// Pure, framework-free state for the bubble to-do app.
// No DOM, no Electron, no Date/Math — all nondeterministic inputs are passed in.

export function initialState() {
  return { girl: { x: null, y: null }, draft: '', todos: [] };
}

export function withDraft(state, text) {
  return { ...state, draft: text };
}

// pos: { x, y, createdAt }. id + createdAt are supplied by the caller (testable/pure).
export function addTodo(state, id, pos) {
  const text = state.draft.trim();
  if (!text) return state; // guard: never create an empty bubble
  const todo = { id, text, x: pos.x, y: pos.y, createdAt: pos.createdAt };
  return { ...state, draft: '', todos: [...state.todos, todo] };
}

export function removeTodo(state, id) {
  return { ...state, todos: state.todos.filter(t => t.id !== id) };
}

export function moveTodo(state, id, x, y) {
  return { ...state, todos: state.todos.map(t => (t.id === id ? { ...t, x, y } : t)) };
}

export function moveGirl(state, x, y) {
  return { ...state, girl: { x, y } };
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  try {
    const s = JSON.parse(json);
    if (!s || typeof s !== 'object') return initialState();
    return {
      girl: s.girl && typeof s.girl === 'object'
        ? { x: s.girl.x ?? null, y: s.girl.y ?? null }
        : { x: null, y: null },
      draft: typeof s.draft === 'string' ? s.draft : '',
      todos: Array.isArray(s.todos) ? s.todos : []
    };
  } catch {
    return initialState();
  }
}

// Auto-mock for supabaseClient (CommonJS — Jest mock system uses CJS)
// jest is a global in Jest; do NOT import it

let __dbCalls = [];
let __selectResult = null;

function makeChain(table, method, args) {
  __dbCalls.push({ table, method, args });
  const terminal = { data: __selectResult?.[table]?.[method] ?? [], error: null };
  const chain = {
    select: jest.fn((...a) => {
      __dbCalls.push({ table, method: 'select', args: a });
      return chain;
    }),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(async () => ({
      data: __selectResult?.[table]?.single ??
        (table === 'resumes' ? {
          id: 'r-new', name: 'X', created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z', template_id: 'modern',
          ats_score: null, status: 'draft', current_step: 1,
          last_exported_at: null, target_job_title: null,
          target_industry: null, seniority_level: null,
          job_description_text: null, job_description_url: null,
          resume_format: null, resume_length: null,
        } : {}),
      error: null,
    })),
    maybeSingle: jest.fn(async () => ({
      data: __selectResult?.[table]?.maybeSingle ?? null, error: null,
    })),
    then: (resolve) => Promise.resolve(terminal).then(resolve),
  };
  return chain;
}

const supabase = {
  auth: {
    getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })),
  },
  from: jest.fn((table) => ({
    select: jest.fn((...args) => makeChain(table, 'select', args)),
    insert: jest.fn((...args) => makeChain(table, 'insert', args)),
    update: jest.fn((...args) => makeChain(table, 'update', args)),
    delete: jest.fn((...args) => makeChain(table, 'delete', args)),
    upsert: jest.fn((...args) => makeChain(table, 'upsert', args)),
  })),
};

function __resetMock() {
  __dbCalls = [];
  __selectResult = null;
  supabase.from.mockClear();
  supabase.auth.getUser.mockClear();
}

function __setSelectResult(result) {
  __selectResult = result;
}

function __getDbCalls() {
  return __dbCalls;
}

function __addDbCall(call) {
  __dbCalls.push(call);
}

module.exports = { supabase, __resetMock, __setSelectResult, __getDbCalls, __addDbCall };

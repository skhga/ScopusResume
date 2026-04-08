import { supabase } from '../lib/supabaseClient';
import { emptyResume } from '../constants/resumeFields';

/**
 * Flatten a Supabase row into the resume shape the app expects.
 * Supabase stores top-level metadata (id, name, timestamps) separately from
 * the resume content (data JSONB). This merges them back into one object.
 */
function rowToResume(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...row.data,
  };
}

const resumeService = {
  async getResumes() {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, name, created_at, updated_at, data')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(rowToResume);
  },

  async getResumeById(id) {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, name, created_at, updated_at, data')
      .eq('id', id)
      .single();

    if (error) return null;
    return rowToResume(data);
  },

  async createResume(name = 'Untitled Resume') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Strip id/timestamps from emptyResume — Supabase generates those
    const { id: _id, name: _n, createdAt: _c, updatedAt: _u, ...resumeData } = emptyResume;

    const { data, error } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, name, data: resumeData })
      .select('id, name, created_at, updated_at, data')
      .single();

    if (error) throw new Error(error.message);
    return rowToResume(data);
  },

  async updateResume(id, updates) {
    // Separate Supabase columns from the resume data payload
    const { id: _id, name, createdAt: _c, updatedAt: _u, ...resumeData } = updates;

    const patch = { data: resumeData };
    if (name !== undefined) patch.name = name;

    const { data, error } = await supabase
      .from('resumes')
      .update(patch)
      .eq('id', id)
      .select('id, name, created_at, updated_at, data')
      .single();

    if (error) throw new Error(error.message);
    return rowToResume(data);
  },

  async deleteResume(id) {
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

export default resumeService;

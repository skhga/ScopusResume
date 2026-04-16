import { supabase } from '../lib/supabaseClient';
import { emptyResume } from '../constants/resumeFields';

/**
 * Flatten a Supabase row into the resume shape the app expects.
 * Top-level metadata columns are merged alongside the JSONB data blob.
 */
function rowToResume(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Metadata columns (top-level on the resumes table)
    templateId: row.template_id ?? 'modern',
    atsScore: row.ats_score ?? null,
    status: row.status ?? 'draft',
    currentStep: row.current_step ?? 1,
    lastExportedAt: row.last_exported_at ?? null,
    // Resume content (JSONB data column)
    ...row.data,
  };
}

const RESUME_SELECT = 'id, name, created_at, updated_at, data, template_id, ats_score, status, current_step, last_exported_at';

const resumeService = {
  async getResumes() {
    const { data, error } = await supabase
      .from('resumes')
      .select(RESUME_SELECT)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(rowToResume);
  },

  async getResumeById(id) {
    const { data, error } = await supabase
      .from('resumes')
      .select(RESUME_SELECT)
      .eq('id', id)
      .single();

    if (error) return null;
    return rowToResume(data);
  },

  async createResume(name = 'Untitled Resume') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Strip top-level metadata from emptyResume — stored as separate columns
    const { id: _id, name: _n, createdAt: _c, updatedAt: _u,
            templateId: _tid, atsScore: _as, status: _st,
            currentStep: _cs, lastExportedAt: _le, ...resumeData } = emptyResume;

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        name,
        data: resumeData,
        template_id: 'modern',
        status: 'draft',
        current_step: 1,
      })
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return rowToResume(data);
  },

  async updateResume(id, updates) {
    // Pull out top-level metadata from updates — they go into dedicated columns
    const {
      id: _id, name, createdAt: _c, updatedAt: _u,
      templateId, atsScore, status, currentStep, lastExportedAt,
      ...resumeData
    } = updates;

    const patch = { data: resumeData };
    if (name !== undefined)           patch.name = name;
    if (templateId !== undefined)     patch.template_id = templateId;
    if (atsScore !== undefined)       patch.ats_score = atsScore;
    if (status !== undefined)         patch.status = status;
    if (currentStep !== undefined)    patch.current_step = currentStep;
    if (lastExportedAt !== undefined) patch.last_exported_at = lastExportedAt;

    const { data, error } = await supabase
      .from('resumes')
      .update(patch)
      .eq('id', id)
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return rowToResume(data);
  },

  async deleteResume(id) {
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async duplicateResume(id) {
    const original = await this.getResumeById(id);
    if (!original) throw new Error('Resume not found');

    const { id: _id, name, createdAt: _c, updatedAt: _u,
            templateId, atsScore: _as, status: _st,
            currentStep: _cs, lastExportedAt: _le, ...resumeData } = original;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        name: `${name} (Copy)`,
        data: resumeData,
        template_id: templateId ?? 'modern',
        status: 'draft',
        current_step: 1,
      })
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return rowToResume(data);
  },

  // ─── ATS Scores ───────────────────────────────────────────

  async saveATSScore(resumeId, scoreData) {
    const { data, error } = await supabase
      .from('ats_scores')
      .insert({
        resume_id: resumeId,
        job_description_hash: scoreData.jdHash,
        overall_score: scoreData.overall,
        keyword_score: scoreData.keyword,
        format_score: scoreData.format,
        impact_score: scoreData.impact,
        completeness_score: scoreData.completeness,
        missing_keywords: scoreData.missingKeywords ?? [],
        suggestions: scoreData.suggestions ?? [],
      });
    if (error) throw new Error(error.message);

    // Mirror the score onto the resume row for quick dashboard display
    await supabase
      .from('resumes')
      .update({ ats_score: scoreData.overall })
      .eq('id', resumeId);

    return data;
  },

  async getLatestATSScore(resumeId) {
    const { data, error } = await supabase
      .from('ats_scores')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  // ─── Export History ───────────────────────────────────────

  async saveExportRecord(resumeId, { format, templateId = 'modern', language = 'en', fileSizeBytes }) {
    const { data, error } = await supabase
      .from('export_history')
      .insert({
        resume_id: resumeId,
        format,
        template_id: templateId,
        language,
        file_size_bytes: fileSizeBytes ?? null,
      });
    if (error) throw new Error(error.message);

    // Update last_exported_at on the resume row
    await supabase
      .from('resumes')
      .update({ last_exported_at: new Date().toISOString() })
      .eq('id', resumeId);

    return data;
  },

  async getExportHistory(resumeId) {
    const { data, error } = await supabase
      .from('export_history')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  // ─── Job Analyses ─────────────────────────────────────────

  async saveJobAnalysis(resumeId, analysisData) {
    const { data, error } = await supabase
      .from('job_analyses')
      .insert({
        resume_id: resumeId,
        job_description_text: analysisData.jobDescriptionText,
        job_title: analysisData.jobTitle,
        seniority_level: analysisData.seniorityLevel,
        required_skills: analysisData.requiredSkills ?? [],
        preferred_skills: analysisData.preferredSkills ?? [],
        keywords: analysisData.keywords ?? [],
        culture_signals: analysisData.cultureSignals ?? [],
      });
    if (error) throw new Error(error.message);
    return data;
  },

  async getJobAnalyses(resumeId) {
    const { data, error } = await supabase
      .from('job_analyses')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

export default resumeService;

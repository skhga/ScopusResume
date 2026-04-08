import { supabase } from '../lib/supabaseClient';

const resumeVersionService = {
  /**
   * Save a point-in-time snapshot of a resume after AI tailoring.
   * @param {string} resumeId
   * @param {object} snapshot - full resume object before diffs were applied
   * @param {string} jobDescription - the JD text used for tailoring
   * @param {Array} tailoredDiffs - [{section, original, tailored, reason}]
   */
  async saveVersion(resumeId, snapshot, jobDescription, tailoredDiffs) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('resume_versions')
      .insert({
        resume_id: resumeId,
        user_id: user.id,
        snapshot,
        job_description: jobDescription,
        tailored_diffs: tailoredDiffs,
      })
      .select('id, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Fetch all versions for a resume, newest first.
   * @param {string} resumeId
   */
  async getVersions(resumeId) {
    const { data, error } = await supabase
      .from('resume_versions')
      .select('id, created_at, job_description, tailored_diffs')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },
};

export default resumeVersionService;

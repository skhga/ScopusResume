import { supabase } from '../lib/supabaseClient';

const authService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  async register({ name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async forgotPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { message: 'Reset email sent' };
  },

  async updateProfile(data) {
    const updates = {};
    if (data.name) updates.data = { full_name: data.name };
    if (data.email) updates.email = data.email;

    const { data: updated, error } = await supabase.auth.updateUser(updates);
    if (error) throw new Error(error.message);
    return updated.user;
  },

  async deleteAccount() {
    // Full delete requires a service-role Edge Function (Sprint 4 TODO).
    // For now, sign out to protect data.
    await supabase.auth.signOut();
  },
};

export default authService;

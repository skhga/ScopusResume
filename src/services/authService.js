const delay = (ms) => new Promise(r => setTimeout(r, ms));

const authService = {
  async login(email, password) {
    await delay(800);
    const user = { id: '1', name: 'Demo User', email };
    localStorage.setItem('scopus_token', 'mock_jwt_token');
    localStorage.setItem('scopus_user', JSON.stringify(user));
    return { user, token: 'mock_jwt_token' };
  },
  async register(data) {
    await delay(800);
    const user = { id: '1', name: data.name, email: data.email };
    localStorage.setItem('scopus_token', 'mock_jwt_token');
    localStorage.setItem('scopus_user', JSON.stringify(user));
    return { user, token: 'mock_jwt_token' };
  },
  async logout() {
    localStorage.removeItem('scopus_token');
    localStorage.removeItem('scopus_user');
  },
  async forgotPassword(email) {
    await delay(800);
    return { message: 'Reset email sent' };
  },
  async updateProfile(data) {
    await delay(500);
    const user = { ...JSON.parse(localStorage.getItem('scopus_user') || '{}'), ...data };
    localStorage.setItem('scopus_user', JSON.stringify(user));
    return user;
  },
  async deleteAccount() {
    await delay(500);
    localStorage.clear();
  },
};
export default authService;

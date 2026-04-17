import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, BarChart3, Send, Trash2, Sparkles, Search, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function DashboardPage() {
  const { user } = useAuth();
  const { resumes, createResume, deleteResume, duplicateResume, setCurrentResume } = useResume();
  const navigate = useNavigate();

  const scored = resumes.filter(r => r.atsScore != null);
  const avgAts = scored.length > 0
    ? Math.round(scored.reduce((sum, r) => sum + r.atsScore, 0) / scored.length)
    : '—';

  const handleNew = async () => {
    const r = await createResume('Untitled Resume');
    navigate(`/app/builder/${r.id}`);
  };

  const handleEdit = (id) => { setCurrentResume(id); navigate(`/app/builder/${id}`); };
  const handlePreview = (id) => { setCurrentResume(id); navigate(`/app/preview/${id}`); };
  const handleDuplicate = async (id) => {
    try {
      const copy = await duplicateResume(id);
      navigate(`/app/builder/${copy.id}`);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}</h1><p className="text-gray-600 mt-1">Manage your resumes and track your progress.</p></div>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Create New Resume</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: FileText, label: 'Total Resumes', value: resumes.length, color: 'text-brand-600 bg-brand-100' },
          { icon: BarChart3, label: 'Avg ATS Score', value: avgAts, color: 'text-green-600 bg-green-100' },
          { icon: Send, label: 'Applications', value: '0', color: 'text-purple-600 bg-purple-100' },
        ].map(s => (
          <Card key={s.label}>
            <div className="flex items-center"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}><s.icon className="h-5 w-5" /></div><div className="ml-4"><p className="text-sm text-gray-500">{s.label}</p><p className="text-2xl font-bold text-gray-900">{s.value}</p></div></div>
          </Card>
        ))}
      </div>

      {/* Resumes */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Resumes</h2>
        {resumes.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
            <p className="text-gray-500 mb-6">Your first resume takes about 8 minutes. Start with your most recent job.</p>
            <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Create Resume</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map(r => (
              <Card key={r.id}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{r.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Updated {new Date(r.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {/* Status badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === 'complete'
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'complete' ? 'Complete' : 'Draft'}
                    </span>
                    {/* ATS badge */}
                    {r.atsScore != null ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.atsScore >= 75 ? 'bg-green-100 text-green-700' :
                        r.atsScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                           'bg-red-100 text-red-700'
                      }`}>
                        ATS {Math.round(r.atsScore)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">
                        Not scored
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(r.id)}
                    className="flex-1 text-xs py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePreview(r.id)}
                    className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleDuplicate(r.id)}
                    className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => navigate(`/app/export/${r.id}`)}
                    className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => window.confirm('Delete this resume? This cannot be undone.') && deleteResume(r.id)}
                    className="text-xs py-1.5 px-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, label: 'Optimize with AI', desc: 'Let AI improve your bullet points', to: '/app/builder' },
            { icon: Search, label: 'Analyze Job Description', desc: 'Match your resume to any job', to: '/app/jd-analyzer' },
            { icon: Download, label: 'Export Resume', desc: 'Download as PDF or plain text', to: resumes.length > 0 ? `/app/export/${resumes[0].id}` : '/app/builder' },
          ].map(a => (
            <Link key={a.to} to={a.to} className="p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-brand-200 transition group">
              <a.icon className="h-6 w-6 text-brand-600 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-gray-900">{a.label}</h3>
              <p className="text-sm text-gray-500">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

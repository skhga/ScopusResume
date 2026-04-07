import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, BarChart3, Send, Eye, Pencil, Trash2, Sparkles, Search, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useResume } from '../../hooks/useResume';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function DashboardPage() {
  const { user } = useAuth();
  const { resumes, createResume, deleteResume, setCurrentResume } = useResume();
  const navigate = useNavigate();

  const handleNew = () => {
    const r = createResume('Untitled Resume');
    setCurrentResume(r.id);
    navigate('/app/builder');
  };

  const handleEdit = (id) => { setCurrentResume(id); navigate(`/app/builder/${id}`); };
  const handlePreview = (id) => { setCurrentResume(id); navigate(`/app/preview/${id}`); };

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
          { icon: BarChart3, label: 'Avg ATS Score', value: resumes.length > 0 ? '—' : '—', color: 'text-green-600 bg-green-100' },
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
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-semibold text-gray-900">{r.name}</h3><p className="text-xs text-gray-500 mt-0.5">Last updated {new Date(r.updatedAt).toLocaleDateString()}</p></div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Not scanned</span>
                </div>
                <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                  <button onClick={() => handleEdit(r.id)} className="flex items-center text-sm text-gray-600 hover:text-brand-600"><Pencil className="h-3.5 w-3.5 mr-1" />Edit</button>
                  <button onClick={() => handlePreview(r.id)} className="flex items-center text-sm text-gray-600 hover:text-brand-600"><Eye className="h-3.5 w-3.5 mr-1" />Preview</button>
                  <button onClick={() => deleteResume(r.id)} className="flex items-center text-sm text-gray-600 hover:text-red-600 ml-auto"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</button>
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
            { icon: Download, label: 'Export Resume', desc: 'Download as PDF, DOCX, or TXT', to: '/app/builder' },
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

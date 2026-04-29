import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileType } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { EXPORT_FORMATS, LANGUAGES } from '../../utils/constants';
import { TEMPLATES } from '../../constants/templates';
import { resumeToText } from '../../utils/resumeToText';
import { translateResume } from '../../services/aiService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ResumeTemplate from '../../components/resume/ResumeTemplate';
import toast from 'react-hot-toast';

export default function ExportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resumes, updateResume } = useResume();
  const resume = resumes.find(r => r.id === id);

  const [format, setFormat] = useState('pdf');
  const [template, setTemplate] = useState(resume?.templateId || 'modern');
  const [fontSize, setFontSize] = useState('medium');
  const [colorAccent, setColorAccent] = useState('#0abab5');
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);
  const [targetLang, setTargetLang] = useState('en');
  const [translating, setTranslating] = useState(false);
  const [translatedResume, setTranslatedResume] = useState(null);
  const displayResume = translatedResume || resume;

  if (!resume) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500 mb-4">Resume not found.</p>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const handleExport = async () => {
    setExporting(true);
    const safeName = (resume.name || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    try {
      if (format === 'txt') {
        const text = resumeToText(resume);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf()
          .set({
            margin: 10,
            filename: `${safeName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(previewRef.current)
          .save();
      } else {
        // docx — placeholder; requires a server-side generator
        alert('DOCX export requires a server-side component. PDF and TXT are available now.');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleTemplateChange = async (templateId) => {
    setTemplate(templateId);
    if (resume?.id) {
      try {
        await updateResume(resume.id, { ...resume, templateId });
      } catch (err) {
        console.error('Failed to save template:', err);
      }
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const translated = await translateResume(resume, targetLang);
      setTranslatedResume(translated);
      toast.success('Resume translated');
    } catch (err) {
      toast.error(err.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const colors = ['#0abab5', '#059669', '#7c3aed', '#dc2626', '#ea580c', '#334155'];

  return (
    <div className="page-container max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Export Resume</h1>
      <p className="text-gray-500 mb-6">Configure and download your resume.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Options */}
        <div className="space-y-5">
          {/* Format */}
          <Card title="Export Format">
            <div className="space-y-2">
              {EXPORT_FORMATS.map(f => (
                <label key={f.value} className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${format === f.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="format" value={f.value} checked={format === f.value} onChange={() => setFormat(f.value)} className="sr-only" />
                  <FileType className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{f.label}</div>
                    <div className="text-xs text-gray-500">{f.value === 'pdf' ? 'Best for applications' : f.value === 'docx' ? 'Editable format' : 'Plain text'}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          {/* Template */}
          <Card title="Template">
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateChange(t.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    template === t.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  <p className="text-xs text-brand-600 mt-1">Best for: {t.bestFor}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Font Size */}
          <Card title="Font Size">
            <div className="flex gap-2">
              {['small', 'medium', 'large'].map(s => (
                <label key={s} className={`flex-1 p-2 border rounded-lg cursor-pointer text-center text-sm capitalize transition ${fontSize === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="fontSize" value={s} checked={fontSize === s} onChange={() => setFontSize(s)} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </Card>

          {/* Color Accent */}
          <Card title="Accent Color">
            <div className="flex gap-2">
              {colors.map(c => (
                <button key={c} onClick={() => setColorAccent(c)}
                  className={`w-8 h-8 rounded-full border-2 transition ${colorAccent === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Card>

          <Card title="Translation">
            <div className="space-y-3">
              <div className="flex gap-2">
                <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="input-field flex-1">
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <Button variant="secondary" size="sm" onClick={handleTranslate} loading={translating} disabled={targetLang === 'en'}>
                  Translate
                </Button>
              </div>
              {translatedResume && (
                <p className="text-xs text-green-600">Translated to {LANGUAGES.find(l => l.value === targetLang)?.label}</p>
              )}
            </div>
          </Card>

          <Button onClick={handleExport} loading={exporting} className="w-full">
            <Download className="h-4 w-4 mr-2" />Download {format.toUpperCase()}
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div ref={previewRef} className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 min-h-[600px] sticky top-6">
            <ResumeTemplate resume={displayResume} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
}

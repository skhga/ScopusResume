import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Download, Wand2 } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import Button from '../../components/common/Button';
import ResumeTemplate from '../../components/resume/ResumeTemplate';
import ATSScorePanel from '../../components/resume/ATSScorePanel';

export default function ResumePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resumes, loadingResumes } = useResume();
  const resume = resumes.find(r => r.id === id);
  const [showATS, setShowATS] = useState(true);

  if (loadingResumes) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500">Loading resume...</p>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500 mb-4">Resume not found.</p>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="page-container max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resume Preview</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/app/builder/${id}`)}>
            <Edit3 className="h-4 w-4 mr-1" />Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/app/optimize/${id}`)}>
            <Wand2 className="h-4 w-4 mr-1" />Optimize
          </Button>
          <Button size="sm" onClick={() => navigate(`/app/export/${id}`)}>
            <Download className="h-4 w-4 mr-1" />Export
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Resume */}
        <div className={showATS ? 'w-3/5' : 'w-full'}>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 min-h-[800px]">
            <ResumeTemplate resume={resume} />
          </div>
        </div>

        {/* ATS Panel */}
        {showATS && (
          <div className="w-2/5">
            <ATSScorePanel score={72} breakdown={[
              { category: 'Keywords', score: 65, maxScore: 100, suggestions: ['Add more industry-specific keywords'] },
              { category: 'Formatting', score: 85, maxScore: 100 },
              { category: 'Impact', score: 60, maxScore: 100, suggestions: ['Quantify achievements with numbers'] },
              { category: 'Readability', score: 78, maxScore: 100 },
            ]} />
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <button onClick={() => setShowATS(!showATS)} className="text-sm text-brand-600 hover:underline">
          {showATS ? 'Hide' : 'Show'} ATS Score Panel
        </button>
      </div>
    </div>
  );
}

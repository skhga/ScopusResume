import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { PROFICIENCY_LEVELS } from '../../utils/constants';

const PROGRAMMING_SUGGESTIONS = [
  'JavaScript','TypeScript','Python','Java','C++','C#','Go','Rust','Swift','Kotlin',
  'PHP','Ruby','Scala','R','MATLAB','Dart','Elixir','Haskell','Lua','Perl',
];

const TOOLS_SUGGESTIONS = [
  'Docker','Kubernetes','AWS','Azure','GCP','Git','GitHub','GitLab','Jira','Confluence',
  'Figma','Sketch','VS Code','IntelliJ','Postman','Terraform','Jenkins','CircleCI',
  'GitHub Actions','Slack','Notion','Linear','Datadog','Sentry','PostgreSQL','MySQL',
  'MongoDB','Redis','Elasticsearch','GraphQL','REST API',
];

function TagInput({ label, tags, onChange, placeholder, listId, suggestions }) {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };
  const remove = (i) => onChange(tags.filter((_, idx) => idx !== i));
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center bg-brand-50 text-brand-700 text-sm px-2.5 py-1 rounded-full">
            {t}
            <button type="button" onClick={() => remove(i)} className="ml-1 hover:text-brand-900"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          list={listId}
          className="input-field flex-1"
          placeholder={placeholder}
          autoComplete="off"
        />
        {listId && suggestions && (
          <datalist id={listId}>
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        <button type="button" onClick={add} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SkillsStep({ data, onChange }) {
  const v = data || { technicalSkills: [], programmingLanguages: [], toolsSoftware: [], languageSkills: [], domainSpecificSkills: [] };
  const u = (field, val) => onChange({ ...v, [field]: val });

  const addLang = () => u('languageSkills', [...v.languageSkills, { name: '', proficiency: 'professional' }]);
  const updateLang = (i, field, val) => { const n = [...v.languageSkills]; n[i] = { ...n[i], [field]: val }; u('languageSkills', n); };
  const removeLang = (i) => u('languageSkills', v.languageSkills.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
        <p className="text-sm text-gray-500 mt-1">Add your skills - type and press Enter.</p>
      </div>
      <TagInput label="Technical Skills" tags={v.technicalSkills} onChange={val => u('technicalSkills', val)} placeholder="e.g. React, Node.js" />
      <TagInput
        label="Programming Languages"
        tags={v.programmingLanguages}
        onChange={val => u('programmingLanguages', val)}
        placeholder="e.g. JavaScript, Python"
        listId="prog-lang-suggestions"
        suggestions={PROGRAMMING_SUGGESTIONS}
      />
      <TagInput
        label="Tools & Software"
        tags={v.toolsSoftware}
        onChange={val => u('toolsSoftware', val)}
        placeholder="e.g. Docker, AWS, Figma"
        listId="tools-suggestions"
        suggestions={TOOLS_SUGGESTIONS}
      />
      <TagInput label="Domain-Specific Skills" tags={v.domainSpecificSkills} onChange={val => u('domainSpecificSkills', val)} placeholder="e.g. Machine Learning, Agile" />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Language Skills</label>
        {v.languageSkills.map((l, i) => (
          <div key={i} className="flex items-center gap-3 mb-2">
            <input
              value={l.name}
              onChange={e => updateLang(i, 'name', e.target.value)}
              className="input-field flex-1"
              placeholder="Language"
            />
            <select
              value={l.proficiency}
              onChange={e => updateLang(i, 'proficiency', e.target.value)}
              className="input-field w-44 bg-white"
            >
              {PROFICIENCY_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button type="button" onClick={() => removeLang(i)} className="p-2 text-gray-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addLang} className="text-sm text-brand-600 hover:underline flex items-center">
          <Plus className="h-3 w-3 mr-1" />Add language
        </button>
      </div>
    </div>
  );
}

# ScopusResume

## Project Overview
AI-powered resume builder that helps job seekers create ATS-optimized resumes. Built with React 19, TailwindCSS, React Router, React Hook Form + Zod validation.

## Tech Stack
- **Framework**: React 19 (Create React App)
- **Styling**: TailwindCSS 3.4 with custom "brand" color palette (teal/turquoise)
- **Routing**: React Router 7
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **HTTP**: Axios
- **Notifications**: React Hot Toast

## Commands
- `npm start` — Start dev server (port 3000)
- `npm run build` — Production build
- `npm test` — Run tests (Jest + Testing Library)

## Project Structure
```
src/
├── components/
│   ├── common/       # Reusable UI (Button, Card, Input, Modal, ProgressBar, ScoreGauge, StepIndicator)
│   ├── forms/        # FormField, RepeatableSection
│   ├── layout/       # AppLayout, AuthLayout, Footer, Navbar, Sidebar
│   └── resume/       # ATSScorePanel, ResumeTemplate
├── pages/
│   ├── auth/         # SignIn, SignUp, PasswordReset, AccountSettings
│   ├── dashboard/    # Dashboard
│   ├── landing/      # Landing page
│   ├── optimizer/    # AIOptimization, ATSOptimizer, JDAnalyzer
│   ├── preview/      # Resume preview
│   ├── resume-builder/  # 8-step builder (PersonalInfo, Education, WorkExperience, Skills, Projects, Certifications, CareerObjective, Summary)
│   └── export/       # Export/download
├── context/          # AuthContext, ResumeContext
├── hooks/            # useAuth, useResume, useATSScore
├── services/         # aiService, authService, resumeService, api
├── utils/            # constants, formatters, validators
├── constants/        # resumeFields, templates
└── assets/           # Images and templates
```

## Code Conventions
- Functional components with hooks
- TailwindCSS utility classes for styling
- React Context for global state (auth, resume data)
- Zod schemas for form validation
- Services layer for API calls and business logic

## Working Directory
Always run commands from: `/Users/sk_hga/ScopusResume/scopus`

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

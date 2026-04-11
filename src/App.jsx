import React, { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WelcomeScreen from './components/WelcomeScreen.jsx'
import AssessmentForm from './components/AssessmentForm.jsx'
import ResultsPage from './components/ResultsPage.jsx'
import SchoolDetailPage from './components/SchoolDetailPage.jsx'
import BrowseSchools from './components/BrowseSchools.jsx'
import schoolsData from '../data/mba_schools_data.json'

// ---------------------------------------------------------------------------
// Default form state — reset to this when the user clicks "Retake"
// ---------------------------------------------------------------------------

const INITIAL_FORM_DATA = {
  // Section A — Background
  currentRegion: '',
  yearsExperience: '',
  currentIndustry: '',
  currentFunction: '',

  // Section B — Goals
  postMBAGoal: '',
  targetGeography: '',

  // Section C — Priority ratings (1–5, all default to 3 = neutral)
  priorities: {
    prestige: 3,
    industryPlacement: 3,
    locationLifestyle: 3,
    affordability: 3,
    scholarship: 3,
    internationalSupport: 3,
    collaborativeCulture: 3,
  },

  // Section D — Constraints
  gmatScore: '',
  budgetSensitivity: '',
  scholarshipImportance: '',
  additionalNotes: '',
}

// ---------------------------------------------------------------------------
// App — step-based state machine
//
//  0 = Welcome screen
//  1–4 = Assessment form sections
//  5 = Results page
// ---------------------------------------------------------------------------

export default function App() {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)

  // User clicks "Start My Assessment"
  const handleStart = () => setStep(1)

  // AssessmentForm calls this when the user finishes section 4
  const handleFormComplete = data => {
    setFormData(data)
    setStep(5)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // User clicks "Retake the assessment" — full state reset
  const handleRetake = () => {
    setFormData(INITIAL_FORM_DATA)
    setStep(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const schools = schoolsData.schools

  function AssessmentFlow() {
    if (step === 0) {
      return <WelcomeScreen onStart={handleStart} />
    }

    if (step === 5) {
      return (
        <ResultsPage
          schools={schools}
          formData={formData}
          onRetake={handleRetake}
        />
      )
    }

    return (
      <AssessmentForm
        formData={formData}
        setFormData={setFormData}
        currentStep={step}
        setStep={setStep}
        onComplete={handleFormComplete}
      />
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/schools"           element={<BrowseSchools />} />
        <Route path="/schools/:schoolId" element={<SchoolDetailPage />} />
        <Route path="*"                  element={<AssessmentFlow />} />
      </Routes>
    </BrowserRouter>
  )
}

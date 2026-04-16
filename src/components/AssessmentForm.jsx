import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import {
  REGIONS,
  INDUSTRIES,
  FUNCTIONS,
  POST_MBA_GOALS,
  CAMPUS_ENV_OPTIONS,
  EXAM_TYPE_OPTIONS,
  CAREER_SWITCH_INDUSTRIES,
  PRIORITIES,
  BUDGET_SENSITIVITY_OPTIONS,
  SCHOLARSHIP_OPTIONS,
} from '../utils/constants.js'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StarRating({ value, onChange, label }) {
  const [hovered, setHovered] = useState(null)
  const display = hovered ?? value

  return (
    <div className="flex gap-1" role="group" aria-label={`Rating for ${label}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          className={`text-2xl leading-none transition-colors select-none ${
            star <= display ? 'text-indigo-500' : 'text-slate-200'
          } hover:text-indigo-400`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="text-red-400 text-xs mt-1.5">{message}</p>
}

function SelectField({ label, id, value, onChange, options, error, required }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1" aria-hidden>*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full border rounded-lg px-3 py-2.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200'
        }`}
      >
        <option value="">Select…</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  )
}

function RadioGroup({ label, name, value, onChange, options, error, required }) {
  return (
    <div>
      <p className="block text-sm font-medium text-slate-700 mb-3">
        {label}
        {required && <span className="text-red-400 ml-1" aria-hidden>*</span>}
      </p>
      <div className="space-y-2">
        {options.map(o => (
          <label
            key={o.value}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              value === o.value
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="text-indigo-600 accent-indigo-600"
            />
            <span className="text-slate-700 text-sm">{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function SectionA({ formData, updateField, errors }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1 tracking-tight">Your Background</h2>
      <p className="text-slate-500 mb-8 leading-relaxed">Help us understand where you're coming from.</p>

      <div className="space-y-6">
        <SelectField
          label="Current region"
          id="region"
          value={formData.currentRegion}
          onChange={v => updateField('currentRegion', v)}
          options={REGIONS}
          error={errors.currentRegion}
          required
        />

        <div>
          <label htmlFor="experience" className="block text-sm font-medium text-slate-700 mb-1.5">
            Years of full-time work experience
            <span className="text-red-400 ml-1" aria-hidden>*</span>
          </label>
          <input
            id="experience"
            type="number"
            min="0"
            max="20"
            value={formData.yearsExperience}
            onChange={e => updateField('yearsExperience', e.target.value)}
            placeholder="e.g. 4"
            className={`w-full border rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
              errors.yearsExperience ? 'border-red-400 bg-red-50' : 'border-slate-200'
            }`}
          />
          <FieldError message={errors.yearsExperience} />
        </div>

        <SelectField
          label="Current industry"
          id="industry"
          value={formData.currentIndustry}
          onChange={v => updateField('currentIndustry', v)}
          options={INDUSTRIES}
          error={errors.currentIndustry}
          required
        />

        {formData.currentIndustry === 'other' && (
          <div>
            <label htmlFor="industryOther" className="block text-sm font-medium text-slate-700 mb-1.5">
              Please describe your industry
              <span className="text-red-400 ml-1" aria-hidden>*</span>
            </label>
            <input
              id="industryOther"
              type="text"
              maxLength={80}
              value={formData.currentIndustryOther}
              onChange={e => updateField('currentIndustryOther', e.target.value)}
              placeholder="e.g. Aerospace, Agriculture, Education..."
              className={`w-full border rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                errors.currentIndustryOther ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            <FieldError message={errors.currentIndustryOther} />
          </div>
        )}

        <SelectField
          label="Current function"
          id="function"
          value={formData.currentFunction}
          onChange={v => updateField('currentFunction', v)}
          options={FUNCTIONS}
          error={errors.currentFunction}
          required
        />

        {formData.currentFunction === 'other' && (
          <div>
            <label htmlFor="functionOther" className="block text-sm font-medium text-slate-700 mb-1.5">
              Please describe your function
              <span className="text-red-400 ml-1" aria-hidden>*</span>
            </label>
            <input
              id="functionOther"
              type="text"
              maxLength={80}
              value={formData.currentFunctionOther}
              onChange={e => updateField('currentFunctionOther', e.target.value)}
              placeholder="e.g. Data Science, Legal, Communications..."
              className={`w-full border rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                errors.currentFunctionOther ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            <FieldError message={errors.currentFunctionOther} />
          </div>
        )}
      </div>
    </div>
  )
}

function SectionB({ formData, updateField, errors }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1 tracking-tight">Your Goals</h2>
      <p className="text-slate-500 mb-8 leading-relaxed">Tell us where you want to go with your MBA.</p>

      <div className="space-y-6">
        <SelectField
          label="Post-MBA target role"
          id="goal"
          value={formData.postMBAGoal}
          onChange={v => updateField('postMBAGoal', v)}
          options={POST_MBA_GOALS}
          error={errors.postMBAGoal}
          required
        />

        {formData.postMBAGoal === 'career-switch' && (
          <SelectField
            label="What industry are you switching into?"
            id="careerSwitchTarget"
            value={formData.careerSwitchTarget}
            onChange={v => updateField('careerSwitchTarget', v)}
            options={CAREER_SWITCH_INDUSTRIES}
            error={errors.careerSwitchTarget}
            required
          />
        )}

        {formData.postMBAGoal === 'other' && (
          <div>
            <label htmlFor="postMBAGoalOther" className="block text-sm font-medium text-slate-700 mb-1.5">
              What are you hoping to do after your MBA?
              <span className="text-red-400 ml-1" aria-hidden>*</span>
            </label>
            <input
              id="postMBAGoalOther"
              type="text"
              maxLength={100}
              value={formData.postMBAGoalOther}
              onChange={e => updateField('postMBAGoalOther', e.target.value)}
              placeholder="e.g. Real estate development, Policy work, Family business..."
              className={`w-full border rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                errors.postMBAGoalOther ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            <FieldError message={errors.postMBAGoalOther} />
          </div>
        )}

        <SelectField
          label="Campus environment preference"
          id="campusEnv"
          value={formData.campusEnv}
          onChange={v => updateField('campusEnv', v)}
          options={CAMPUS_ENV_OPTIONS}
          error={errors.campusEnv}
          required
        />
      </div>
    </div>
  )
}

function SectionC({ formData, updatePriority }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1 tracking-tight">What matters most to you?</h2>
      <p className="text-slate-500 mb-8 leading-relaxed">
        Rate each factor 1–5 stars. Be honest, there are no wrong answers. These weights drive the match.
      </p>

      <div className="space-y-4">
        {PRIORITIES.map(({ key, label }) => {
          const val = formData.priorities[key]
          return (
            <div key={key} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <span className="text-slate-700 text-sm font-medium leading-snug flex-1">{label}</span>
                <StarRating
                  value={val}
                  onChange={v => updatePriority(key, v)}
                  label={label}
                />
              </div>
              {/* Mini fill bar showing current rating */}
              <div className="flex gap-0.5 h-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-colors ${i <= val ? 'bg-indigo-400' : 'bg-slate-100'}`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionD({ formData, updateField, errors }) {
  const selectedExam = EXAM_TYPE_OPTIONS.find(o => o.value === formData.examType)
  const showScoreInput = formData.examType && formData.examType !== 'none'

  const scoreLabel = {
    'gmat-focus':   'GMAT Focus score (205–805)',
    'gmat-classic': 'GMAT Classic score (200–800)',
    'gre':          'GRE total score (260–340)',
  }[formData.examType] || 'Exam score'

  const scorePlaceholder = {
    'gmat-focus':   'e.g. 645',
    'gmat-classic': 'e.g. 720',
    'gre':          'e.g. 320',
  }[formData.examType] || ''

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1 tracking-tight">Constraints & Profile</h2>
      <p className="text-slate-500 mb-8 leading-relaxed">Final details to sharpen your fit score.</p>

      <div className="space-y-7">
        <SelectField
          label="Which exam have you taken or plan to take?"
          id="examType"
          value={formData.examType}
          onChange={v => {
            updateField('examType', v)
            updateField('examScore', '')
          }}
          options={EXAM_TYPE_OPTIONS}
          error={errors.examType}
          required
        />

        {showScoreInput && (
          <div>
            <label htmlFor="examScore" className="block text-sm font-medium text-slate-700 mb-1">
              {scoreLabel}
              <span className="text-red-400 ml-1" aria-hidden>*</span>
            </label>
            <p className="text-xs text-slate-400 mb-1.5">
              Enter your actual score, or your target score if you haven't taken the exam yet.
            </p>
            <input
              id="examScore"
              type="text"
              inputMode="numeric"
              value={formData.examScore}
              onChange={e => updateField('examScore', e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={scorePlaceholder}
              className={`w-full border rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${
                errors.examScore ? 'border-red-400 bg-red-50' : 'border-slate-200'
              }`}
            />
            <FieldError message={errors.examScore} />
          </div>
        )}

        <RadioGroup
          label="Budget sensitivity"
          name="budget"
          value={formData.budgetSensitivity}
          onChange={v => updateField('budgetSensitivity', v)}
          options={BUDGET_SENSITIVITY_OPTIONS}
          error={errors.budgetSensitivity}
          required
        />

        <RadioGroup
          label="Scholarship importance"
          name="scholarship"
          value={formData.scholarshipImportance}
          onChange={v => updateField('scholarshipImportance', v)}
          options={SCHOLARSHIP_OPTIONS}
          error={errors.scholarshipImportance}
          required
        />

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
            Anything else?
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <p className="text-xs text-slate-400 mb-1.5">Any context that might help us match you better.</p>
          <textarea
            id="notes"
            maxLength={200}
            value={formData.additionalNotes}
            onChange={e => updateField('additionalNotes', e.target.value)}
            placeholder="e.g. I'm open to part-time options, or I have a family constraint in Boston…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors h-24 resize-none"
          />
          <p className="text-slate-400 text-xs text-right mt-1">
            {(formData.additionalNotes || '').length} / 200
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AssessmentForm({
  formData,
  setFormData,
  currentStep,
  setStep,
  onComplete,
}) {
  const [errors, setErrors] = useState({})

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const updatePriority = (key, value) => {
    setFormData(prev => ({
      ...prev,
      priorities: { ...prev.priorities, [key]: value },
    }))
  }

  const validateSection = section => {
    const e = {}
    if (section === 1) {
      if (!formData.currentRegion) e.currentRegion = 'Please select your region'
      if (formData.yearsExperience === '' || formData.yearsExperience === undefined)
        e.yearsExperience = 'Please enter your years of experience'
      if (!formData.currentIndustry) e.currentIndustry = 'Please select your industry'
      if (formData.currentIndustry === 'other' && !formData.currentIndustryOther)
        e.currentIndustryOther = 'Please describe your industry'
      if (!formData.currentFunction) e.currentFunction = 'Please select your function'
      if (formData.currentFunction === 'other' && !formData.currentFunctionOther)
        e.currentFunctionOther = 'Please describe your function'
    }
    if (section === 2) {
      if (!formData.postMBAGoal) e.postMBAGoal = 'Please select your post-MBA goal'
      if (formData.postMBAGoal === 'career-switch' && !formData.careerSwitchTarget)
        e.careerSwitchTarget = 'Please select your target industry'
      if (formData.postMBAGoal === 'other' && !formData.postMBAGoalOther)
        e.postMBAGoalOther = 'Please describe your goal'
      if (!formData.campusEnv) e.campusEnv = 'Please select a campus preference'
    }
    // Section 3 (priorities) has defaults — no validation needed
    if (section === 4) {
      if (!formData.examType) e.examType = 'Please select an exam type'
      if (formData.examType && formData.examType !== 'none') {
        if (!formData.examScore) {
          e.examScore = 'Please enter your score, or your target score if not yet taken'
        } else {
          const score = parseInt(formData.examScore)
          const examOpt = EXAM_TYPE_OPTIONS.find(o => o.value === formData.examType)
          if (examOpt && (score < examOpt.min || score > examOpt.max)) {
            e.examScore = `Score must be between ${examOpt.min} and ${examOpt.max} for ${examOpt.label}`
          }
        }
      }
      if (!formData.budgetSensitivity) e.budgetSensitivity = 'Please select an option'
      if (!formData.scholarshipImportance) e.scholarshipImportance = 'Please select an option'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (!validateSection(currentStep)) return
    if (currentStep === 4) {
      onComplete(formData)
    } else {
      setStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const STEP_LABELS = ['Background', 'Goals', 'Priorities', 'Constraints']

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header & progress ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800 text-sm tracking-tight">MBATribe</span>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 mb-2">
            {STEP_LABELS.map((label, idx) => {
              const stepNum = idx + 1
              const isActive = stepNum === currentStep
              const isDone = stepNum < currentStep
              return (
                <React.Fragment key={label}>
                  <div className={`flex items-center gap-1.5 ${isActive ? 'text-indigo-600' : isDone ? 'text-emerald-500' : 'text-slate-300'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                      isActive ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : isDone ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                      : 'border-slate-200 bg-white text-slate-400'
                    }`}>
                      {isDone ? '✓' : stepNum}
                    </div>
                    <span className="text-xs font-medium hidden sm:inline">{label}</span>
                  </div>
                  {idx < 3 && <div className={`flex-1 h-0.5 rounded-full ${isDone ? 'bg-emerald-300' : 'bg-slate-100'}`} />}
                </React.Fragment>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── Form body ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {currentStep === 1 && (
          <SectionA formData={formData} updateField={updateField} errors={errors} />
        )}
        {currentStep === 2 && (
          <SectionB formData={formData} updateField={updateField} errors={errors} />
        )}
        {currentStep === 3 && (
          <SectionC formData={formData} updatePriority={updatePriority} />
        )}
        {currentStep === 4 && (
          <SectionD formData={formData} updateField={updateField} errors={errors} />
        )}

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-slate-100"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            {currentStep === 4 ? 'See My Results' : 'Next'}
            {currentStep < 4 && <ChevronRight size={18} />}
          </button>
        </div>
      </main>

    </div>
  )
}

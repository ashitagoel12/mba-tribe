// SchoolDetailPage.jsx - Example component showing backward-compatible data access
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import schoolsData from '../mba_schools_data.json';

export default function SchoolDetailPage() {
  const { schoolId } = useParams();
  const school = schoolsData.schools.find(s => s.id === schoolId);

  if (!school) {
    return <div className="p-8">School not found</div>;
  }

  // ============================================
  // SAFE DATA ACCESS PATTERN
  // Use optional chaining (?.) and nullish coalescing (??)
  // This prevents errors if new fields don't exist yet
  // ============================================

  const hasDeadlines = school.applicationInfo?.deadlines;
  const hasEssays = school.applicationInfo?.essayQuestions?.length > 0;
  const hasEvents = school.events?.length > 0;
  const hasFinancialAid = school.financialAid?.scholarships?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - Uses existing data */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link to="/results" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Results
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-xl text-gray-600">{school.university}</p>
          <p className="text-gray-500">
            {school.location.city}, {school.location.state}
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            <a href="#overview" className="py-4 border-b-2 border-blue-600 font-medium">Overview</a>
            {hasDeadlines && <a href="#application" className="py-4 hover:border-blue-600 border-b-2 border-transparent">Application</a>}
            {hasEvents && <a href="#events" className="py-4 hover:border-blue-600 border-b-2 border-transparent">Events</a>}
            <a href="#outcomes" className="py-4 hover:border-blue-600 border-b-2 border-transparent">Outcomes</a>
            {hasFinancialAid && <a href="#financial-aid" className="py-4 hover:border-blue-600 border-b-2 border-transparent">Financial Aid</a>}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Overview Section - Uses existing data */}
        <section id="overview" className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Class Profile</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Class Size: {school.classProfile.size}</li>
                <li>Avg Work Experience: {school.classProfile.avgWorkExperience} years</li>
                <li>Avg GMAT: {school.classProfile.avgGMAT}</li>
                <li>International: {school.classProfile.internationalStudentPct}%</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Costs</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Annual Tuition: ${school.costs.annualTuition.toLocaleString()}</li>
                <li>Total Program: ${school.costs.totalProgramCost.toLocaleString()}</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-lg mb-2">Academic Strengths</h3>
            <div className="flex flex-wrap gap-2">
              {school.academicStrengths.map((strength, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {strength}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Application Section - NEW DATA (only shows if available) */}
        {hasDeadlines && (
          <section id="application" className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Application Information</h2>
            
            {/* Deadlines */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">Deadlines</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {school.applicationInfo.deadlines.round1 && (
                  <div className="border rounded-lg p-4">
                    <div className="font-semibold text-blue-600">Round 1</div>
                    <div className="text-sm mt-2">
                      <div>Deadline: {new Date(school.applicationInfo.deadlines.round1.deadline).toLocaleDateString()}</div>
                      <div>Decision: {new Date(school.applicationInfo.deadlines.round1.decisionDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
                
                {school.applicationInfo.deadlines.round2 && (
                  <div className="border rounded-lg p-4">
                    <div className="font-semibold text-blue-600">Round 2</div>
                    <div className="text-sm mt-2">
                      <div>Deadline: {new Date(school.applicationInfo.deadlines.round2.deadline).toLocaleDateString()}</div>
                      <div>Decision: {new Date(school.applicationInfo.deadlines.round2.decisionDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
                
                {school.applicationInfo.deadlines.round3 && (
                  <div className="border rounded-lg p-4">
                    <div className="font-semibold text-blue-600">Round 3</div>
                    <div className="text-sm mt-2">
                      <div>Deadline: {new Date(school.applicationInfo.deadlines.round3.deadline).toLocaleDateString()}</div>
                      <div>Decision: {new Date(school.applicationInfo.deadlines.round3.decisionDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Essay Questions */}
            {hasEssays && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Essay Questions</h3>
                <div className="space-y-4">
                  {school.applicationInfo.essayQuestions.map((essay, idx) => (
                    <div key={idx} className="border-l-4 border-blue-600 pl-4 py-2">
                      <div className="text-sm text-gray-600 mb-1">
                        Essay {essay.id} • {essay.wordLimit} words {essay.optional && '• Optional'}
                      </div>
                      <div className="text-gray-900">{essay.prompt}</div>
                      {essay.notes && <div className="text-sm text-gray-500 mt-1">{essay.notes}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements - Safe access with optional chaining */}
            {school.applicationInfo?.requirements && (
              <div>
                <h3 className="font-semibold text-lg mb-3">Application Requirements</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  
                  {school.applicationInfo.requirements.gmat && (
                    <div>
                      <span className="font-medium">GMAT:</span> {school.applicationInfo.requirements.gmat.required ? 'Required' : 'Optional'} 
                      {school.applicationInfo.requirements.gmat.averageScore && ` • Avg: ${school.applicationInfo.requirements.gmat.averageScore}`}
                      {school.applicationInfo.requirements.gmat.range && ` • Range: ${school.applicationInfo.requirements.gmat.range}`}
                    </div>
                  )}
                  
                  {school.applicationInfo.requirements.workExperience && (
                    <div>
                      <span className="font-medium">Work Experience:</span> {school.applicationInfo.requirements.workExperience.average} years avg
                      {school.applicationInfo.requirements.workExperience.range && ` (${school.applicationInfo.requirements.workExperience.range})`}
                    </div>
                  )}
                  
                  {school.applicationInfo.requirements.recommendations && (
                    <div>
                      <span className="font-medium">Recommendations:</span> {school.applicationInfo.requirements.recommendations.required || school.applicationInfo.requirements.recommendations} required
                    </div>
                  )}
                  
                  {school.applicationInfo.requirements.interviews && (
                    <div>
                      <span className="font-medium">Interview:</span> {school.applicationInfo.requirements.interviews.format}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Events Section - NEW DATA (only shows if available) */}
        {hasEvents && (
          <section id="events" className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              {school.events.slice(0, 5).map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{event.title}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(event.date).toLocaleDateString()} • {event.time}
                      </div>
                      <div className="text-sm text-gray-600">
                        {event.format === 'virtual' ? '🌐 Virtual' : `📍 ${event.location}`}
                      </div>
                      {event.description && (
                        <p className="text-gray-700 mt-2 text-sm">{event.description}</p>
                      )}
                    </div>
                    {event.registrationUrl && (
                      <a 
                        href={event.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm whitespace-nowrap"
                      >
                        Register
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Employment Outcomes - Uses existing data + new detailed data if available */}
        <section id="outcomes" className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Employment Outcomes</h2>
          
          {/* Existing basic employment data */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Quick Stats</h3>
              <ul className="space-y-1 text-gray-700">
                <li>Employment Rate: {school.employment.employmentRate3Months}% (3 months)</li>
                <li>Avg Starting Salary: ${school.employment.avgStartingSalary.toLocaleString()}</li>
                <li>Median Signing Bonus: ${school.employment.medianSigningBonus.toLocaleString()}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Top Industries</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                {school.employment.top3Industries.map((industry, idx) => (
                  <li key={idx}>{industry}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* NEW: Detailed outcomes by industry (if available) */}
          {school.detailedOutcomes?.byIndustry && (
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-3">Employment by Industry</h3>
              <div className="space-y-2">
                {school.detailedOutcomes.byIndustry.map((industry, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className="w-48 font-medium">{industry.industry}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div 
                        className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2 text-white text-sm font-medium"
                        style={{ width: `${industry.percentage}%` }}
                      >
                        {industry.percentage}%
                      </div>
                    </div>
                    {industry.avgSalary && (
                      <div className="w-32 text-right text-sm text-gray-600">
                        ${(industry.avgSalary / 1000).toFixed(0)}K
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Financial Aid Section - NEW DATA (only shows if available) */}
        {hasFinancialAid && (
          <section id="financial-aid" className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4">Financial Aid & Scholarships</h2>
            
            {school.financialAid.averageScholarshipPct && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-lg font-semibold text-blue-900">
                  {school.financialAid.averageScholarshipPct}% of students receive aid
                </div>
                {school.financialAid.averageScholarshipAmount && (
                  <div className="text-sm text-blue-700 mt-1">
                    Average award: ${school.financialAid.averageScholarshipAmount.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {school.financialAid.scholarships.map((scholarship, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{scholarship.name}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium text-blue-600">{scholarship.amount}</span>
                        {scholarship.type && ` • ${scholarship.type.replace('_', ' ')}`}
                      </div>
                      <p className="text-gray-700 mt-2 text-sm">{scholarship.eligibility}</p>
                      {scholarship.notes && (
                        <p className="text-gray-600 mt-1 text-sm italic">{scholarship.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {scholarship.applicationRequired ? '📝 Application required' : '✅ Automatic consideration'}
                    {scholarship.deadline && ` • Deadline: ${scholarship.deadline}`}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <a 
            href={school.programUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Visit Official Website
          </a>
          <button className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium">
            Add to Shortlist
          </button>
          <button className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium">
            Compare
          </button>
        </div>

      </main>
    </div>
  );
}

// ============================================
// KEY PATTERNS FOR BACKWARD COMPATIBILITY:
// ============================================
// 
// 1. Optional Chaining: school.applicationInfo?.deadlines
//    - Returns undefined if applicationInfo doesn't exist
//    - Prevents "Cannot read property 'deadlines' of undefined" errors
//
// 2. Nullish Coalescing: school.events?.length ?? 0
//    - Provides default value if undefined/null
//
// 3. Conditional Rendering: {hasDeadlines && <Section />}
//    - Only shows section if data exists
//
// 4. .map() with empty array fallback: (school.events || []).map(...)
//    - Prevents errors if array doesn't exist
//
// 5. Gradual Enhancement: Show basic data always, enhanced data when available
//    - App works with minimal data, gets better as you add more
// ============================================

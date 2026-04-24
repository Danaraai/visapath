const claude = require('../services/claude');
const redis = require('../services/redis');

async function run(sessionId, profile, strategy, onLog) {
  const log = (msg) => onLog && onLog(msg);

  log('Loading consulate-specific requirements...');
  const consulate = strategy.recommended;

  log(`Generating Schengen application form for ${consulate} consulate...`);

  // Generate cover letter
  log('Drafting cover letter...');
  const coverLetter = await claude.complete(
    'You are a visa document specialist. Write professional, concise visa application documents.',
    `Write a Schengen visa cover letter for the following applicant. Be professional and specific.

Applicant details:
- Nationality: ${profile.nationality}
- Applying at: ${consulate} consulate, ${profile.city}
- Destination: ${profile.destination}
- Travel dates: ${profile.travelDates}
- Employment status: ${profile.employmentStatus}
- Purpose: Tourism

The letter should:
1. State the purpose of travel
2. Describe the itinerary briefly
3. Confirm accommodation arrangements
4. Mention financial means
5. Confirm intent to return
6. Keep it to 3-4 paragraphs, formal tone

Address it to: Visa Section, Consulate General of ${consulate}
Date it: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    { maxTokens: 1000 }
  );

  log('Cover letter complete.');

  // Generate employer letter (if employed)
  let employerLetter = null;
  if (profile.employmentStatus === 'employed') {
    log('Drafting employer verification letter template...');
    employerLetter = await claude.complete(
      'You are a visa document specialist.',
      `Write an employer verification letter template for a Schengen visa application. Use [EMPLOYER_NAME], [EMPLOYER_ADDRESS], [EMPLOYEE_NAME], [JOB_TITLE], [SALARY], [LEAVE_DATES] as placeholders.

The letter must confirm:
1. Employee's position and employment duration
2. Approved leave for the travel dates (${profile.travelDates})
3. Monthly salary/financial stability
4. That the employee will return to work after travel
5. That the company will cover emergency expenses if needed

Make it sound like it comes from an HR department. Professional letterhead format.`,
      { maxTokens: 800 }
    );
    log('Employer letter template complete.');
  }

  // Generate itinerary
  log('Generating travel itinerary...');
  const itinerary = await claude.complete(
    'You are a travel planning assistant.',
    `Create a brief day-by-day travel itinerary for a visa application.

Destination: ${profile.destination}
Dates: ${profile.travelDates}

Create a plausible tourist itinerary covering major attractions. Format as:
Day 1 (Date): City - Activities
Day 2 (Date): City - Activities
etc.

Keep it concise, 2-3 activities per day. This is for a Schengen visa application.`,
    { maxTokens: 600 }
  );

  log('All documents generated.');

  const documents = {
    coverLetter,
    employerLetter,
    itinerary,
    consulate,
    generatedAt: new Date().toISOString(),
    flaggedFields: [
      { id: 'flight_number', label: 'Flight reservation number', instructions: 'Book a refundable/dummy ticket and enter the confirmation number here.' },
      { id: 'hotel_name', label: 'Accommodation details', instructions: 'Enter your hotel booking confirmation or Airbnb address.' },
      { id: 'insurance_policy', label: 'Travel insurance policy number', instructions: 'Purchase Schengen travel insurance (min €30,000 coverage) and enter policy number.' },
      ...(profile.employmentStatus === 'employed' ? [
        { id: 'employer_details', label: 'Employer name and address for letter', instructions: 'Have HR fill in their details in the employer letter template.' },
      ] : []),
    ],
  };

  await redis.set(`session:${sessionId}:documents`, documents);
  return documents;
}

module.exports = { run };

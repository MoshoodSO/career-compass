# Career Compass

Career Copilot — React SPA

Two states: form and results. No paid APIs — fetches go to a URL I will provide.

 

FORM

Header: "Career Copilot" / "Upload your CV, paste the job description and LinkedIn

info — get personalised guidance in seconds."

Three sections:

1. "Your CV (PDF)" — file input accept=".pdf"

2. "Job Description" — generous textarea, placeholder "Paste the full job description here"

3. "LinkedIn Profile" — file input labelled "LinkedIn PDF"

Submit button: "Analyse my profile ->"

 

LOADING

Replace form with loading indicator.

Cycle every 3s: "Reading your story..." -> "Matching your experience..."

-> "Writing your guidance..."

 

RESULTS

Back button: "<- Start over". Title: "Your Career Copilot Report".

Subtitle: "Click any section to expand it. Use the copy button to grab the content."

 

Five accordion cards that expand and collapse when clicked.

Each card has a copy button in the header that copies the section content

to clipboard and shows a checkmark for 2 seconds.

The confidence letter card opens by default. All others start closed.

 

The API response is a JSON object with these exact keys — use them as-is, do not rename:

  confidence_letter        — string

  cv_recommendations       — array of strings

  linkedin_recommendations — array of strings

  transferable_skills      — array of objects with keys: skill (string), explanation (string)

  can_apply                — boolean

  gaps_to_address          — array of strings

  career_fit_explanation   — string

 

Card 1 — Why you can do this

  Source field: confidence_letter

  Render: split on double newline, each chunk as a paragraph tag.

  Slightly larger italic font. Opens by default.

  Copy button copies the full confidence_letter string.

 

Card 2 — Strengthen your CV

  Source field: cv_recommendations

  Render: numbered list.

  Copy button copies all items as a numbered list.

 

Card 3 — Update your LinkedIn

  Source field: linkedin_recommendations

  Render: numbered list.

  Copy button copies all items as a numbered list.

 

Card 4 — Your transferable skills

  Source fields: transferable_skills, can_apply, gaps_to_address

  Render transferable_skills as a grid of mini-cards.

  Each mini-card shows skill in bold and explanation below it.

  Below the grid, one verdict badge:

    Green badge "Apply with confidence" if can_apply is true.

    Amber badge "Apply — but prepare these gaps" if can_apply is false.

  Below the badge, render gaps_to_address as a numbered list

  under the subheading "Prepare for interview:"

  Copy button copies skills, verdict, and gaps all together.

 

Card 5 — How you fit this role

  Source field: career_fit_explanation

  Render: split on double newline, each chunk as a paragraph tag.

  Copy button copies the full career_fit_explanation string.

 

FETCH

On submit, build a FormData object with these exact field names:

  cv           — the CV PDF file

  job_description — the job description textarea text

  linkedin_pdf — the LinkedIn PDF file if uploaded 

POST the FormData to WEBHOOK_URL_PLACEHOLDER.

Do not set Content-Type manually — let the browser set it for FormData.

Parse the JSON response and store it in state.

On any error show: "Something went wrong — please try again."

 

STYLING

Professional, mobile-responsive, 16px+ body text.

Choose your own colour palette, typography and layout.

Five result sections must be visually distinct accordion cards.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/87300381-f19e-4d14-95f7-247b0c7d16e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

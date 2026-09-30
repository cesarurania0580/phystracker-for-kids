# La carrera en barras / The running bar chart

Open `index.html` in a browser, keeping the `assets` folder beside it. Recording, calculating, graphing, and writing explanations work offline and keep work only in the current page session. The optional Get AI feedback action sends the explanation and measurements to the configured AI provider through the backend described below; the nickname is excluded. Reloading or closing the page clears work.

Students can enter 6–10 time and position points or import a `motion_data_*.csv` export from Video Tracker. For a CSV with more than 10 points, the activity selects 6–10 points spread across the full measurement range. Review the selected points before continuing. Video Tracker must be calibrated in meters with its X axis pointing toward the runner's finish line.

The activity asks students to calculate average velocity for each interval, then build a bar chart from their answers. Students can check one calculation or bar at a time, or check all at once. Checking shows a ✓ or retry mark only for the checked rows; editing an answer clears its old mark. The graph uses interval numbers on the X axis and average velocity (m/s) on the Y axis. Colored velocity cards sit below the graph. Students drag the top of each matching bar with a mouse or touch, use arrow keys (Home/End for limits), or enter a height in the card. Checking gives a check mark or a higher/lower hint. The CSV's separate central-difference velocity section is ignored; interval velocity here is `(x₂ − x₁) / (t₂ − t₁)`. The app can be used in Spanish or English.

Calculated differences, velocities, graph ticks, and displayed bar values use two significant figures. Recorded time and position measurements remain as entered or imported. Answer checks compare values at two significant figures.

Teacher suggestion: Have students draw the same graph on paper before checking their bars in the app. The example run demonstrates the flow without a CSV.

Graph placement allows an error of up to 2.5% of the vertical scale, capped at 10% of the target velocity (1% of the scale for a zero target). Calculation checks still use two significant figures. Bars start unplaced, including those whose correct value is zero.

The activity starts in English with a PhysTracker for Kids welcome screen; Spanish remains available. A first name or nickname is optional and used only for brief encouragement messages. Names stay in memory for the current page session and are cleared by a reload. The logo is bundled locally for offline use.

Student help uses one worked example and per-interval hints, without an answer reveal. Calculator answers are based on the rounded position/time differences displayed in the table, avoiding a mismatch with hidden precision. Y-axis ticks and grid lines are spaced every 1 m/s on a taller graph.

The separate `../runner-graph-teacher/index.html` creates printable answer sheets from matching manual measurements or CSV imports. Keep that folder local and outside the student website when publishing.

Moving back and forth between Record, Calculate, and Graph preserves measurements, answers, hints, bar heights, and the selected graph scale for the current page session. Editing a measurement keeps entered work but clears the check marks for its adjacent intervals so they must be checked again. Adding a point keeps existing intervals; removing a point, importing a CSV, loading the example, or starting another run clears calculation and graph work. Reloading or closing the page still clears the session.


## Explain: MYP Year 1 science

The fourth step uses the teacher-provided criterion: **Accurately interpret data and outline results using correct scientific reasoning.** The student sees their graph and prompts to identify patterns, compare intervals using numerical evidence and m/s, and connect average velocity to displacement per unit time. The criterion is used for formative coaching, not official IB grading or an achievement level.

After checking their graph, students receive one strength, five checklist reviews (what changed, pattern and numbers, unusual result, science explanation, and science words), one highest-priority revision step, and one thinking question. Reviews use Clear, Almost there, Add this, or No unusual result visible, with icons and translated labels. The coach writes for an 11-year-old, uses one idea per short sentence, explains necessary science words, and avoids abstract directions. A concise pattern summary with representative values is sufficient; students do not need to list every interval. The coach does not invent unusual results, require unrelated science vocabulary, assign a grade, or write a replacement paragraph. Feedback is marked as applying to an earlier version when the writing, measurements, graph, or language changes. Requests that fail leave the draft intact. The Revise button returns focus to their writing.

A traffic-light progress card summarizes the five checklist statuses using fixed app rules rather than an additional AI judgment. Green means the pattern and science explanation are clear and most other parts are ready; yellow means one focused revision remains; red means key parts still need building. The card always includes an icon and words, is explicitly revision progress rather than a grade, and turns gray when the student edits the response after receiving feedback.

The Explain step shows a smaller, read-only vertical graph built by the same drawing function as the Graph step. It preserves the student's visible bar heights, colors, and interval labels. Its fixed-height preview chooses a separate readable scale from the visible velocities, so a very large hidden result does not force students to scroll past empty graph space. Hidden intervals remain in their original positions as labeled gaps. The graph sits beside the writing on wider screens and above it on narrow screens. Number fields select their existing value on initial focus/click; editing clears the relevant marks immediately without rebuilding the screen when moving to the next field.

In the Graph step, every interval velocity is included by default. Each velocity card has a visible **This bar looks unusual** action. It opens a dialog that explains the value will stay in the results, offers three age-appropriate reason starters, and accepts a short custom reason. The bar cannot be hidden until a reason is selected or entered, so students cannot accidentally reach Explain with an unfinished exclusion. Up to two possible unusual results may be hidden, and at least three velocities must remain visible. A hidden card clearly shows its reason and provides **Change reason** and **Show bar again** actions. The chart keeps a labeled gap, and the Explain preview lists hidden intervals and reasons. AI feedback receives the server-recomputed velocity, its hidden/visible status, and the student's reason, and is instructed not to assume that a hidden result is an error.

## Run with AI feedback

Requires Node.js 22 or later. No packages need installing.

1. Create a general API key from [Z.AI API Keys](https://z.ai/manage-apikey/apikey-list). Confirm your account has general API access and sufficient balance. The Coding Plan is restricted to supported coding tools and is not the endpoint used by this app; see the [Z.AI FAQ](https://docs.z.ai/devpack/faq).
2. In this project folder, use the prepared `.env` (or copy `.env.example` to `.env` if it does not exist). Set:

   ```dotenv
   AI_PROVIDER=zai
   ZAI_API_KEY=your-key-here
   ZAI_MODEL=glm-4.7
   PORT=3000
   HOST=127.0.0.1
   ```

   Keep the key on the server only. Never paste it into HTML, the student interface, chat, or GitHub. `.env` is ignored by Git. This integration uses the [general Chat Completions endpoint](https://docs.z.ai/api-reference/llm/chat-completion) and validates [JSON-mode output](https://docs.z.ai/guides/capabilities/struct-output) on the server. GLM-4.7 is configured with thinking disabled for short feedback responses.
3. Run `npm start` and open `http://127.0.0.1:3000`. Restart the server after changing `.env`.
4. Try the example run, complete and check its graph, select **Explain my graph**, write a fictional interpretation, and select **Get AI feedback**. API calls may incur provider charges.
5. If the app says the connection needs your teacher’s attention, check the key and account access. If the service is busy, check quota/balance and retry later. A generic unavailable message can mean a network timeout or an invalid/incomplete model response. Do not share the key when asking for help.

OpenAI remains available by setting `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL`. Keys are selected only for the named provider; there is no fallback to a different provider or credential.

Opening `index.html` directly still supports the learning activity and writing, but cannot provide AI feedback. GitHub Pages alone cannot run this backend. For classroom deployment, host the Node server and frontend together on an HTTPS service. The default server listens only on this computer; a hosting service can set `HOST=0.0.0.0` and `PORT`. Add school access controls before exposing a paid feedback endpoint publicly. A process-wide limit allows 120 feedback requests per hour with at most eight active requests; multiple server instances need a shared rate limiter. Configure project spending controls in the provider account as well.

The backend validates the submission, recomputes interval velocities from measurements, caps input length and output size, applies timeouts, and serves only the student HTML and logo. It never serves `.env` or server files, stores student submissions, or logs their text. Only language, explanation, and derived measurement evidence go to the provider. The optional nickname is not sent, but anything a student includes in their explanation is sent; the interface asks students to omit personal information.

For Z.AI, this implementation makes no zero-retention guarantee. Confirm the provider’s data handling and suitability for your school’s under-13 students before sending live student work; initially use fictional examples. OpenAI-specific settings and rules below do not establish Z.AI’s practices.

When OpenAI is selected, the integration uses the [Responses API Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and `store: false`. This disables stored response state; it does **not** guarantee zero provider retention. Review [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and your school's requirements before using live student submissions. Because this class includes students under 13, review the [OpenAI under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) before activation. It requires zero data retention before processing personal data of children under 13 (or the applicable age of digital consent); `store: false` alone is not that setting. Use synthetic examples for initial testing and have the school confirm the appropriate provider data controls before live classroom use. Teachers should review feedback quality on representative examples before classroom use. The automated tests use synthetic responses. The Z.AI checklist flow has also been checked with a fictional student paragraph; classroom feedback quality still requires teacher review.

## Checks

Run `npm test`. Tests cover navigation and draft preservation, feedback invalidation, escaped text rendering, failed and concurrent requests, new-run resets, measurement validation and rounding, request privacy, response parsing, provider failures, rate limits, and protection of server files, Z.AI routing, provider-specific credentials, JSON validation, and authentication/quota errors.

## Deploy the AI version on Netlify

The AI version is prepared for Netlify Functions. The function in `netlify/functions/feedback.mjs` handles `/api/feedback`, while Netlify serves the student app from this folder. `netlify.toml` sets the publish folder, Functions folder, and Node.js 22.

Create a separate Netlify site from the `ai-feedback` Git branch so the GitHub `main` branch can remain the simple static version. Use a blank build command, publish directory `.`, and let the repository configuration detect `netlify/functions`.

In the Netlify site, add these runtime environment variables under Site configuration → Environment variables:

```text
AI_PROVIDER=zai
ZAI_API_KEY=your-key
ZAI_MODEL=glm-4.7
```

Do not commit `.env` or put the key in the browser code. After saving the variables, trigger a new deploy. The local `npm start` server continues to work for development; Netlify uses the Function instead of `server.mjs` in production.

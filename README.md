# La carrera en barras / The running bar chart

Open `index.html` in a browser, keeping the `assets` folder beside it. The activity works offline and keeps measurements only in the current browser tab. It does not send or save student data.

Students can enter 6–10 time and position points or import a `motion_data_*.csv` export from Video Tracker. For a CSV with more than 10 points, the activity selects 6–10 points spread across the full measurement range. Review the selected points before continuing. Video Tracker must be calibrated in meters with its X axis pointing toward the runner's finish line.

The activity asks students to calculate average velocity for each interval, then build a bar chart from their answers. Students can check one calculation or bar at a time, or check all at once. Checking shows a ✓ or retry mark only for the checked rows; editing an answer clears its old mark. The graph uses interval numbers on the X axis and average velocity (m/s) on the Y axis. Colored velocity cards sit below the graph. Students drag the top of each matching bar with a mouse or touch, use arrow keys (Home/End for limits), or enter a height in the card. Checking gives a check mark or a higher/lower hint. The CSV's separate central-difference velocity section is ignored; interval velocity here is `(x₂ − x₁) / (t₂ − t₁)`. The app can be used in Spanish or English.

Calculated differences, velocities, graph ticks, and displayed bar values use two significant figures. Recorded time and position measurements remain as entered or imported. Answer checks compare values at two significant figures.

Teacher suggestion: Have students draw the same graph on paper before checking their bars in the app. The example run demonstrates the flow without a CSV.

Graph placement allows an error of up to 2.5% of the vertical scale, capped at 10% of the target velocity (1% of the scale for a zero target). Calculation checks still use two significant figures. Bars start unplaced, including those whose correct value is zero.

The activity starts in English with a PhysTracker for Kids welcome screen; Spanish remains available. A first name or nickname is optional and used only for brief encouragement messages. Names stay in memory for the current page session and are cleared by a reload. The logo is bundled locally for offline use.

Student help uses one worked example and per-interval hints, without an answer reveal. Calculator answers are based on the rounded position/time differences displayed in the table, avoiding a mismatch with hidden precision. Y-axis ticks and grid lines are spaced every 1 m/s on a taller graph.

The separate `../runner-graph-teacher/index.html` creates printable answer sheets from matching manual measurements or CSV imports. Keep that folder local and outside the student website when publishing.

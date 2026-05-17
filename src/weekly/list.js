/*
  Requirement: Populate the "Weekly Course Breakdown" list page.

  Instructions:
  1. This file is already linked to `list.html` via:
         <script src="list.js" defer></script>

  2. In `list.html`, the <section id="week-list-section"> is the container
     that this script populates.

  3. Implement the TODOs below.
*/

// --- Element Selections ---
const weekListSection = document.getElementById('week-list-section');

// --- Functions ---

/**
 * Create an article element for a week.
 */
function createWeekArticle(week) {
  const article = document.createElement('article');
  const title = document.createElement('h2');
  title.textContent = week.title;

  const startDate = document.createElement('p');
  startDate.textContent = `Starts on: ${week.start_date}`;

  const description = document.createElement('p');
  description.textContent = week.description;

  const detailsLink = document.createElement('a');
  detailsLink.href = `details.html?id=${week.id}`;
  detailsLink.textContent = 'View Details & Discussion';

  article.append(title, startDate, description, detailsLink);
  return article;
}

/**
 * Load all weeks from the API and render them.
 */
async function loadWeeks() {
  try {
    const response = await fetch('./api/index.php');
    if (!response.ok) {
      return;
    }

    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      return;
    }

    weekListSection.innerHTML = '';
    result.data.forEach((week) => {
      weekListSection.appendChild(createWeekArticle(week));
    });
  } catch (error) {
    console.error('Failed to load weeks:', error);
  }
}

// --- Initial Page Load ---
loadWeeks();

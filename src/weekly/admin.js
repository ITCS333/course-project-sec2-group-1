/*
  Requirement: Make the "Manage Weekly Breakdown" page interactive.

  Instructions:
  1. This file is already linked to `admin.html` via:
         <script src="admin.js" defer></script>

  2. In `admin.html`:
     - The form has id="week-form".
     - The submit button has id="add-week".
     - The <tbody> has id="weeks-tbody".
     - Columns rendered per row: Week Title | Start Date | Description | Actions.

  3. Implement the TODOs below.

  API base URL: ./api/index.php
  All requests and responses use JSON.
  Successful list response shape: { success: true, data: [ ...week objects ] }
  Each week object shape:
    {
      id:          number,   // integer primary key from the weeks table
      title:       string,
      start_date:  string,   // "YYYY-MM-DD"
      description: string,
      links:       string[]  // decoded array of URL strings
    }
*/

// --- Global Data Store ---
// Holds the weeks currently displayed in the table.
let weeks = [];

// --- Element Selections ---
const weekForm = document.getElementById('week-form');
const weeksTbody = document.getElementById('weeks-tbody');
const titleInput = document.getElementById('week-title');
const startDateInput = document.getElementById('week-start-date');
const descriptionInput = document.getElementById('week-description');
const linksInput = document.getElementById('week-links');
const addWeekButton = document.getElementById('add-week');

// --- Functions ---

function createWeekRow(week) {
  const tr = document.createElement('tr');

  const titleTd = document.createElement('td');
  titleTd.textContent = week.title;

  const dateTd = document.createElement('td');
  dateTd.textContent = week.start_date;

  const descriptionTd = document.createElement('td');
  descriptionTd.textContent = week.description;

  const actionsTd = document.createElement('td');
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'edit-btn';
  editButton.dataset.id = String(week.id);
  editButton.textContent = 'Edit';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-btn';
  deleteButton.dataset.id = String(week.id);
  deleteButton.textContent = 'Delete';

  actionsTd.append(editButton, deleteButton);
  tr.append(titleTd, dateTd, descriptionTd, actionsTd);
  return tr;
}

function renderTable() {
  weeksTbody.innerHTML = '';
  weeks.forEach((week) => {
    weeksTbody.appendChild(createWeekRow(week));
  });
}

function getFormFields() {
  const title = titleInput.value.trim();
  const start_date = startDateInput.value;
  const description = descriptionInput.value.trim();
  const links = linksInput.value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return { title, start_date, description, links };
}

function resetForm() {
  weekForm.reset();
  addWeekButton.textContent = 'Add Week';
  delete addWeekButton.dataset.editId;
}

async function handleAddWeek(event) {
  event.preventDefault();
  const fields = getFormFields();
  const editId = addWeekButton.dataset.editId;

  if (editId) {
    await handleUpdateWeek(Number(editId), fields);
    return;
  }

  try {
    const response = await fetch('./api/index.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    });

    const result = await response.json();
    if (result.success) {
      weeks.push({ id: Number(result.id), ...fields });
      renderTable();
      resetForm();
    }
  } catch (error) {
    console.error('Failed to add week:', error);
  }
}

async function handleUpdateWeek(id, fields) {
  try {
    const response = await fetch('./api/index.php', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...fields }),
    });

    const result = await response.json();
    if (result.success) {
      weeks = weeks.map((week) => (week.id === id ? { ...week, ...fields } : week));
      renderTable();
      resetForm();
    }
  } catch (error) {
    console.error('Failed to update week:', error);
  }
}

async function handleTableClick(event) {
  const target = event.target;
  if (!target) {
    return;
  }

  if (target.classList.contains('delete-btn')) {
    const id = Number(target.dataset.id);
    try {
      const response = await fetch(`./api/index.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        weeks = weeks.filter((week) => week.id !== id);
        renderTable();
      }
    } catch (error) {
      console.error('Failed to delete week:', error);
    }
    return;
  }

  if (target.classList.contains('edit-btn')) {
    const id = Number(target.dataset.id);
    const week = weeks.find((item) => item.id === id);
    if (!week) {
      return;
    }

    titleInput.value = week.title;
    startDateInput.value = week.start_date;
    descriptionInput.value = week.description;
    linksInput.value = Array.isArray(week.links) ? week.links.join('\n') : '';
    addWeekButton.textContent = 'Update Week';
    addWeekButton.dataset.editId = String(id);
  }
}

async function loadAndInitialize() {
  try {
    const response = await fetch('./api/index.php');
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      weeks = result.data;
      renderTable();
    }
  } catch (error) {
    console.error('Failed to load weekly data:', error);
  }

  weekForm.addEventListener('submit', handleAddWeek);
  weeksTbody.addEventListener('click', handleTableClick);
}

// --- Initial Page Load ---
loadAndInitialize();

function storeGuests(guests) {
  sessionStorage.setItem('guests', JSON.stringify(
    guests.map(guest => {
      //airtable fails with extra attributes
      delete guest._rawJson.createdTime;
      delete guest._rawJson.fields.last_update;
      return guest._rawJson
    })
  ));
}

function retrieveGuests() {
  return JSON.parse(sessionStorage.getItem('guests'));
}

async function requestGuests(inviteCode) {
  if (!inviteCode) return [];
  const guests = await airtable().select({
    filterByFormula: `({invite_code}='${inviteCode}')`
  }).all();

  storeGuests(guests);
  return guests;
}

async function submitGuests() {
  iconLoading();

  const rsvpForm = document.getElementById('rsvp-form');
  await airtable().update(readForm(rsvpForm));
  iconSuccess();
}

async function rsvpGen() {
  iconLoading();
  const inviteCode = (document.getElementById('invite-code').value).toLowerCase();
  const guests = await requestGuests(inviteCode);

  const rsvpForm = document.getElementById('rsvp-form');
  while (rsvpForm.hasChildNodes()) {
    rsvpForm.removeChild(rsvpForm.lastChild);
  }

  if (!guests.length) {
    iconError();
    return;
  }

  guests.forEach(guest => writeForm(guest, rsvpForm));

  const commentsContainer = document.createElement('div');
  commentsContainer.className = 'comments-container';
  const commentsLabel = document.createElement('label');
  commentsLabel.for = `comments-${inviteCode}`;
  commentsLabel.innerHTML = 'Comments, Contact Information:';
  const commentsInput = document.createElement('textarea');
  commentsInput.id = `comments-${inviteCode}`;
  commentsInput.className = 'comments-input';
  commentsInput.value = guests[0].fields.comments || '';
  commentsContainer.appendChild(commentsLabel);
  commentsContainer.appendChild(document.createElement('br'));
  commentsContainer.appendChild(commentsInput);

  const submitButton = document.createElement('input');
  submitButton.id = 'submit-rsvp-form';
  submitButton.type = 'button';
  submitButton.value = 'Submit RSVP';
  submitButton.className = 'button';
  submitButton.addEventListener('click', function() {
      submitGuests();
  }, false);

  rsvpForm.appendChild(commentsContainer);
  rsvpForm.appendChild(submitButton);
  iconWaiting();
}

function readForm() {
  const guests = retrieveGuests();

  return guests.map(guest => {
    const attending = document.getElementById(`attendance-yes-${guest.id}`).checked;
    const mealChoice = document.getElementById(`mealChoice-${guest.id}`);
    const mealNotes = document.getElementById(`meal-notes-${guest.id}`).value;
    const comments = document.getElementById(`comments-${guest.fields.invite_code}`).value;

    guest.fields.attending = Boolean(attending);
    guest.fields.meal_choice = mealChoice.options[mealChoice.selectedIndex].value;
    guest.fields.rsvp_received = true;
    guest.fields.meal_notes = mealNotes;
    guest.fields.comments = comments;

    return guest;
  });
}

function writeForm(guest, form) {
  const guestContainer = document.createElement('div');
  guestContainer.className = 'guest-container';
  const nameSpan = document.createElement('div');
  nameSpan.innerHTML = guest.fields.name;
  nameSpan.className = 'guest-label';
  guestContainer.appendChild(nameSpan);

  const attendanceRadioContainer = document.createElement('div');
  attendanceRadioContainer.className = 'attendance-radio'
  const attendanceTitle = document.createElement('span');
  attendanceTitle.innerHTML = 'Attending:';
  attendanceTitle.className = `attendance-radio-label`;

  attendanceRadioContainer.appendChild(attendanceTitle);
  ['yes', 'no'].forEach(item => {
    const attendanceRadio = document.createElement('input');
    const attendanceRadioLabel = document.createElement('label')
    attendanceRadioLabel.for = `attendance-${item}-${guest.id}`;
    attendanceRadioLabel.innerHTML = capitalize(item);
    attendanceRadio.className = 'radio-label';
    attendanceRadio.type = 'radio';
    attendanceRadio.className = 'form-radio';
    attendanceRadio.name = `attendance-${guest.id}`;
    attendanceRadio.id = `attendance-${item}-${guest.id}`;
    if (!guest.fields.rsvp_received) {
      attendanceRadio.checked = item === 'yes'
      ? true
      : false;
    } else {
      attendanceRadio.checked = item === 'yes'
      ? Boolean(guest.fields.attending) === true
      : Boolean(guest.fields.attending) === false;
    }

    attendanceRadioContainer.appendChild(attendanceRadio);
    attendanceRadioContainer.appendChild(attendanceRadioLabel);
  });
  guestContainer.appendChild(attendanceRadioContainer);

  const mealChoiceContainer = document.createElement('div');
  mealChoiceContainer.className = 'select-wrap';
  const mealChoiceLabel = document.createElement('label');
  mealChoiceLabel.className = 'select-label';
  mealChoiceLabel.for = `mealChoice-${guest.id}`;
  mealChoiceLabel.innerHTML = 'Meal Choice:';
  const mealChoice = document.createElement('select');
  mealChoice.className = 'select-box'
  mealChoice.id = `mealChoice-${guest.id}`;
  [['salmon', 'King Salmon'], ['duck', 'Seared Duck']].forEach(item => {
    const option = document.createElement('option');
    option.value= item[0];
    option.innerHTML = capitalize(item[1]);
    option.selected = item[0] === guest.fields.meal_choice;
    mealChoice.appendChild(option);
  });

  const mealChoiceCarrot = document.createElement('div');
  mealChoiceCarrot.className = 'select-point';
  mealChoiceCarrot.innerHTML = 'V';

  mealChoiceContainer.appendChild(mealChoiceLabel);
  mealChoiceContainer.appendChild(mealChoice);
  mealChoiceContainer.appendChild(mealChoiceCarrot);
  guestContainer.appendChild(mealChoiceContainer);

  const mealNotesContainer = document.createElement('div');
  mealNotesContainer.className = 'meal-notes-container';
  const mealNotesLabel = document.createElement('label');
  mealNotesLabel.className = 'meal-notes-label';
  mealNotesLabel.for = `meal-notes-${guest.id}`
  mealNotesLabel.innerHTML = 'Sensitivities:'
  const mealNotesInput = document.createElement('input');
  mealNotesInput.className = 'meal-notes-input';
  mealNotesInput.id = `meal-notes-${guest.id}`;
  mealNotesInput.value = guest.fields.meal_notes || '';
  mealNotesContainer.appendChild(mealNotesLabel);
  mealNotesContainer.appendChild(mealNotesInput);

  guestContainer.appendChild(mealNotesContainer);
  form.appendChild(guestContainer);
}

function capitalize(text) {
  return text[0].toUpperCase() + text.slice(1);
}

function iconLoading() {
  const icon = document.getElementById('loading-icon')
  icon.className = "fas fa-spinner fa-pulse";
  icon.style.display = "block";
  icon.style.color = '#E5E9F0';
  icon.innerHTML = '';
}

function iconWaiting() {
  const icon = document.getElementById('loading-icon')
  icon.className = "fas fa-ellipsis-h";
  icon.style.color = '#E5E9F0';
  icon.innerHTML = '';
}

function iconSuccess() {
  const icon = document.getElementById('loading-icon')
  icon.className = "fas fa-check";
  icon.style.color = '#A3BE8C';
  icon.innerHTML = ' RSVP Received'
}

function iconError() {
  const icon = document.getElementById('loading-icon')
  icon.className = "fas fa-times";
  icon.style.color = '#BF616A';
  icon.innerHTML = '';
}

function airtable() {
  const Airtable = require('airtable');
  const table = new Airtable({apiKey: 'REDACTED'}).base('REDACTED');
  return table('Guest Responses');
}

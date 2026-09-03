var SPREADSHEET_ID = '1Qj8_HCRdZVz8cPRznF5LE8q2l1lXTxj8pZi-MjOpfl0';
var SHEET_NAME = 'Projecten';
var HOST_EMAIL_PROPERTY = 'HOST_EMAIL';
var HOST_PASSWORD_PROPERTY = 'HOST_PASSWORD';

var HEADERS = [
  'id',
  'createdAt',
  'status',
  'projectName',
  'clientName',
  'clientEmail',
  'clientContact',
  'projectIdea',
  'goals',
  'styles',
  'formats',
  'references',
  'location',
  'shootDate',
  'deadline',
  'music',
  'budget',
  'extraInfo',
  'concept',
  'shotlist',
  'equipment',
  'planning',
  'deliverables',
  'attention',
  'checklistJson',
  'updatedAt'
];

var DEFAULT_CHECKLIST = [
  'Intake gelezen',
  'Referenties bekeken',
  'Project bevestigd',
  'Offerte gestuurd',
  'Voorschot / bevestiging ontvangen',
  'Locatie en timing bevestigd',
  'Shotlist gemaakt',
  'Shoot uitgevoerd',
  'Footage geback-upt',
  'Eerste montage klaar',
  'Revisie verwerkt',
  'Final export geleverd'
];

function setup() {
  getSheet_();
}

function doGet(e) {
  try {
    var params = e.parameter || {};

    if (params.action === 'status') {
      return outputText_({
        ok: true,
        status: testWebAppStatus()
      });
    }

    if (params.action !== 'list') {
      return outputJsonp_(params.callback, {
        ok: false,
        error: 'Onbekende actie.'
      });
    }

    if (!isHostPassword_(params.password)) {
      return outputJsonp_(params.callback, {
        ok: false,
        error: 'Wachtwoord klopt niet.'
      });
    }

    return outputJsonp_(params.callback, {
      ok: true,
      projects: readProjects_()
    });
  } catch (error) {
    return outputJsonp_(e && e.parameter && e.parameter.callback, {
      ok: false,
      error: error.message || 'Dashboard kon niet laden.'
    });
  }
}

function doPost(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || 'create';
    console.log('doPost action: ' + action);
    console.log('doPost params: ' + JSON.stringify(params));

    if (action === 'create') {
      var project = createProject_(params);
      console.log('Project opgeslagen: ' + project.projectName);
      console.log('Sheet ID: ' + SPREADSHEET_ID);
      console.log('Owner email: ' + getHostEmail_());
      var ownerMailSent = sendOwnerMail_(project);
      var clientMailSent = sendClientMail_(project);

      return outputText_({
        ok: true,
        project: project,
        ownerMailSent: ownerMailSent,
        clientMailSent: clientMailSent
      });
    }

    if (!isHostPassword_(params.password)) {
      return outputText_({
        ok: false,
        error: 'Wachtwoord klopt niet.'
      });
    }

    if (action === 'updateChecklist') {
      return outputText_({
        ok: true,
        project: updateChecklist_(params.id, params.checklistJson)
      });
    }

    return outputText_({
      ok: false,
      error: 'Onbekende actie.'
    });
  } catch (error) {
    console.error(error);
    return outputText_({
      ok: false,
      error: error.message || 'Aanvraag kon niet verwerkt worden.'
    });
  }
}

function createProject_(params) {
  validateProject_(params);

  var sheet = getSheet_();
  var now = new Date().toISOString();
  var id = Utilities.getUuid();
  var checklist = DEFAULT_CHECKLIST.map(function(label) {
    return {
      label: label,
      done: false
    };
  });

  var project = {
    id: id,
    createdAt: now,
    status: 'Nieuw',
    projectName: clean_(params.projectName) || 'Nieuwe projectaanvraag',
    clientName: clean_(params.clientName),
    clientEmail: clean_(params.clientEmail),
    clientContact: clean_(params.clientContact),
    projectIdea: clean_(params.projectIdea),
    goals: clean_(params.goals),
    styles: clean_(params.styles),
    formats: clean_(params.formats),
    references: clean_(params.references),
    location: clean_(params.location),
    shootDate: clean_(params.shootDate),
    deadline: clean_(params.deadline),
    music: clean_(params.music),
    budget: clean_(params.budget),
    extraInfo: clean_(params.extraInfo),
    concept: clean_(params.concept),
    shotlist: clean_(params.shotlist),
    equipment: clean_(params.equipment),
    planning: clean_(params.planning),
    deliverables: clean_(params.deliverables),
    attention: clean_(params.attention),
    checklistJson: JSON.stringify(checklist),
    updatedAt: now
  };

  var row = HEADERS.map(function(header) {
    return project[header] || '';
  });

  sheet.appendRow(row);
  return project;
}

function updateChecklist_(id, checklistJson) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var idIndex = HEADERS.indexOf('id');
  var checklistIndex = HEADERS.indexOf('checklistJson');
  var statusIndex = HEADERS.indexOf('status');
  var updatedIndex = HEADERS.indexOf('updatedAt');

  for (var row = 1; row < values.length; row++) {
    if (String(values[row][idIndex]) === String(id)) {
      var checklist = JSON.parse(checklistJson || '[]');
      var doneCount = checklist.filter(function(item) {
        return item.done;
      }).length;

      var status = 'Nieuw';
      if (checklist.length && doneCount === checklist.length) {
        status = 'Afgewerkt';
      } else if (doneCount > 0) {
        status = 'Lopend';
      }

      sheet.getRange(row + 1, checklistIndex + 1).setValue(JSON.stringify(checklist));
      sheet.getRange(row + 1, statusIndex + 1).setValue(status);
      sheet.getRange(row + 1, updatedIndex + 1).setValue(new Date().toISOString());

      return readProjects_().filter(function(project) {
        return project.id === String(id);
      })[0];
    }
  }

  throw new Error('Project niet gevonden.');
}

function readProjects_() {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var projects = [];

  for (var row = 1; row < values.length; row++) {
    if (!values[row][0]) {
      continue;
    }

    var project = {};
    for (var col = 0; col < HEADERS.length; col++) {
      project[HEADERS[col]] = values[row][col] === undefined ? '' : String(values[row][col]);
    }

    try {
      project.checklist = JSON.parse(project.checklistJson || '[]');
    } catch (error) {
      project.checklist = [];
    }

    projects.unshift(project);
  }

  return projects;
}

function sendOwnerMail_(project) {
  var ownerEmail = getHostEmail_();

  MailApp.sendEmail({
    to: ownerEmail,
    replyTo: project.clientEmail,
    subject: 'Nieuwe projectaanvraag - ' + project.projectName,
    body: buildOwnerMail_(project)
  });

  return true;
}

function sendClientMail_(project) {
  if (!project.clientEmail) {
    return false;
  }

  MailApp.sendEmail({
    to: project.clientEmail,
    replyTo: getHostEmail_(),
    subject: 'Projectaanvraag ontvangen - Ochtendstond.WAV',
    body: [
      'Hey ' + (project.clientName || 'daar') + ',',
      '',
      'Bedankt voor je aanvraag.',
      '',
      'Ik heb je projectinfo goed ontvangen en bekijk alles. Als alles duidelijk is, kan ik sneller inschatten wat er nodig is qua concept, planning, materiaal en montage.',
      '',
      'Groeten,',
      'Ebben',
      'Ochtendstond.WAV'
    ].join('\n')
  });

  return true;
}

function buildOwnerMail_(project) {
  return [
    'Nieuwe projectaanvraag via Ochtendstond.WAV',
    '',
    'Project: ' + project.projectName,
    'Naam / bedrijf: ' + project.clientName,
    'E-mailadres: ' + project.clientEmail,
    'Telefoon of Instagram: ' + project.clientContact,
    'Projectomschrijving: ' + project.projectIdea,
    'Doel van video: ' + project.goals,
    'Stijl / sfeer: ' + project.styles,
    'Referenties: ' + project.references,
    'Locatie: ' + project.location,
    'Opnamedatum / periode: ' + project.shootDate,
    'Deadline: ' + project.deadline,
    'Budget: ' + project.budget,
    'Formaten: ' + project.formats,
    'Muziek/audio: ' + project.music,
    'Extra informatie: ' + project.extraInfo,
    '',
    'Production breakdown',
    'Concept: ' + project.concept,
    'Shotlist: ' + project.shotlist,
    'Equipment: ' + project.equipment,
    'Planning: ' + project.planning,
    'Deliverables: ' + project.deliverables,
    'Aandachtspunten: ' + project.attention
  ].join('\n');
}

function validateProject_(params) {
  if (!clean_(params.clientName)) {
    throw new Error('Naam ontbreekt.');
  }

  if (!clean_(params.clientEmail) || clean_(params.clientEmail).indexOf('@') === -1) {
    throw new Error('E-mailadres ontbreekt of is ongeldig.');
  }

  if (!clean_(params.projectIdea)) {
    throw new Error('Projectomschrijving ontbreekt.');
  }
}

function getSheet_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (!spreadsheet) {
    throw new Error('Spreadsheet niet gevonden. Controleer SPREADSHEET_ID.');
  }

  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  var currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var needsHeaders = currentHeaders.join('') === '' || currentHeaders[0] !== HEADERS[0];

  if (needsHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getHostEmail_() {
  var ownerEmail = clean_(PropertiesService.getScriptProperties().getProperty(HOST_EMAIL_PROPERTY));

  if (!ownerEmail || ownerEmail.indexOf('@') === -1) {
    throw new Error('HOST_EMAIL ontbreekt of is ongeldig in Script Properties.');
  }

  return ownerEmail;
}

function isHostPassword_(password) {
  var storedPassword = PropertiesService.getScriptProperties().getProperty(HOST_PASSWORD_PROPERTY);
  return Boolean(storedPassword) && password === storedPassword;
}

function testOwnerMail() {
  var ownerEmail = getHostEmail_();

  MailApp.sendEmail({
    to: ownerEmail,
    subject: 'Testmail Ochtendstond.WAV',
    body: 'Als je deze mail ontvangt, werkt MailApp en staat HOST_EMAIL correct.'
  });

  return 'Testmail verstuurd naar ' + ownerEmail;
}

function testWebAppStatus() {
  var sheet = getSheet_();
  var ownerEmail = getHostEmail_();

  return {
    spreadsheetId: SPREADSHEET_ID,
    sheetName: sheet.getName(),
    lastRow: sheet.getLastRow(),
    ownerEmail: ownerEmail
  };
}

function testFullFlow() {
  var testProject = {
    projectName: 'TEST - handmatige volledige flow',
    clientName: 'Test klant',
    clientEmail: getHostEmail_(),
    clientContact: 'test',
    projectIdea: 'Test aanvraag',
    goals: 'Short Form Content',
    styles: 'Moody',
    formats: 'Verticaal 9:16',
    references: 'Geen',
    location: 'Testlocatie',
    shootDate: 'Vandaag',
    deadline: 'Vandaag',
    music: 'Testmuziek',
    budget: 'Testbudget',
    extraInfo: 'Test extra info',
    concept: 'Test concept',
    shotlist: 'Test shotlist',
    equipment: 'Test equipment',
    planning: 'Test planning',
    deliverables: 'Test deliverables',
    attention: 'Test aandachtspunten'
  };

  var project = createProject_(testProject);
  sendOwnerMail_(project);
  sendClientMail_(project);

  return 'Test klaar: rij geschreven en mails verstuurd naar ' + getHostEmail_();
}

function outputJsonp_(callback, payload) {
  var safeCallback = callback || 'callback';
  if (!/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(safeCallback)) {
    safeCallback = 'callback';
  }

  return ContentService
    .createTextOutput(safeCallback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function outputText_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.TEXT);
}

function clean_(value) {
  return String(value || '').trim();
}

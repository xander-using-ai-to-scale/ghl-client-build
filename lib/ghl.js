// The GHL endpoints this repo uses, and nothing else. All of them were exercised on real builds.
// There is deliberately no delete here: the build never deletes anything.
// Workflow create/edit and smart lists have no API (404), so only the workflow LIST is here.
'use strict';

const BOOKING_URL_BASE = 'https://api.leadconnectorhq.com/widget/booking/';

// Keys GHL returns on a calendar that must not be sent back in a PUT.
const CALENDAR_READ_ONLY = ['id', 'locationId', 'dateAdded', 'dateUpdated', 'createdAt', 'updatedAt', 'deleted'];

function createGhl(http, locationId) {
  if (!locationId) throw new Error('ghl.location_id is empty in client.yaml.');
  const L = encodeURIComponent(locationId);
  return {
    locationId,
    getLocation: () => http.get(`/locations/${L}`),
    listUsers: () => http.get('/users/', { locationId }),

    listCustomFields: (model) => http.get(`/locations/${L}/customFields`, { model }),
    createCustomField: ({ name, dataType, model, options }) =>
      http.post(`/locations/${L}/customFields`, { name, dataType, model, ...(options && options.length ? { options } : {}) }),

    listTags: () => http.get(`/locations/${L}/tags`),
    createTag: (name) => http.post(`/locations/${L}/tags`, { name }),

    listPipelines: () => http.get('/opportunities/pipelines', { locationId }),
    createPipeline: ({ name, stages }) => http.post('/opportunities/pipelines', {
      locationId, name, showInFunnel: true, showInPieChart: true,
      stages: stages.map((s, position) => ({ name: s, position })),
    }),
    // Trap T2: locationId goes in the QUERY STRING for a pipeline PUT. In the body GHL answers
    // 422 "property locationId should not exist". The body is stripped of it here, always.
    updatePipeline: (id, pipeline) => {
      const { locationId: _drop, id: _id, ...body } = pipeline;
      return http.put(`/opportunities/pipelines/${encodeURIComponent(id)}`, body, { locationId });
    },

    listCalendars: () => http.get('/calendars/', { locationId }),
    getCalendar: (id) => http.get(`/calendars/${encodeURIComponent(id)}`),
    createCalendar: (settings, ownerUserId) => http.post('/calendars/', {
      ...settings, locationId, teamMembers: [{ userId: ownerUserId, priority: 0.5, isPrimary: true }],
    }),
    // Always the FULL settings (see calendarUpdateBody). Never call this with a partial object.
    updateCalendar: (id, fullSettings) => http.put(`/calendars/${encodeURIComponent(id)}`, fullSettings),

    listCustomValues: () => http.get(`/locations/${L}/customValues`),
    createCustomValue: (name, value) => http.post(`/locations/${L}/customValues`, { name, value }),
    updateCustomValue: (id, name, value) => http.put(`/locations/${L}/customValues/${encodeURIComponent(id)}`, { name, value }),

    listWorkflows: () => http.get('/workflows/', { locationId }),
    listForms: () => http.get('/forms/', { locationId, limit: 50 }),
  };
}

// Trap T6: a calendar PUT carrying only openHours reset slotDuration from 20 to 30.
// So an update starts from the full SAVED calendar, lays the desired managed keys on top,
// and refuses to go out if any of the slot settings or openHours would be missing.
function calendarUpdateBody(saved, desired, managedKeys, alwaysSendKeys) {
  if (!saved || typeof saved !== 'object') throw new Error('Calendar update needs the saved calendar first (GET /calendars/{id}).');
  const out = {};
  for (const [k, v] of Object.entries(saved)) if (!CALENDAR_READ_ONLY.includes(k)) out[k] = v;
  for (const k of managedKeys) if (desired[k] !== undefined) out[k] = desired[k];
  const missing = alwaysSendKeys.filter((k) => out[k] === undefined || out[k] === null);
  if (missing.length) throw new Error(`Refusing a partial calendar update: ${missing.join(', ')} missing. A PUT without them resets the calendar's slot settings.`);
  return out;
}

const bookingUrl = (calendarId) => (calendarId ? BOOKING_URL_BASE + calendarId : '');

module.exports = { createGhl, calendarUpdateBody, bookingUrl, CALENDAR_READ_ONLY };

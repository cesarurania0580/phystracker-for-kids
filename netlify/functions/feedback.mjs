import {getFeedback, prepareSubmission, providerConfig} from '../../feedback.mjs';

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

export function createFeedbackFunction({env = process.env, fetchImpl = fetch, maxRequests = 120} = {}) {
  let windowStart = Date.now();
  let requests = 0;
  let active = 0;
  return async request => {
    if (request.method !== 'POST') return json(405, {error: 'method'});
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return json(403, {error: 'origin'});
    let config;
    try { config = providerConfig(env); } catch { return json(503, {error: 'not_configured'}); }
    if (!config.apiKey) return json(503, {error: 'not_configured'});
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json(415, {error: 'invalid'});
    let submission;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > 16000) return json(413, {error: 'too_large'});
      submission = prepareSubmission(JSON.parse(text));
    } catch { return json(400, {error: 'invalid'}); }
    if (Date.now() - windowStart >= 3600000) { windowStart = Date.now(); requests = 0; }
    if (requests >= maxRequests || active >= 8) return json(429, {error: 'busy'});
    requests++; active++;
    try {
      const feedback = await getFeedback(submission, {...config, fetchImpl});
      return json(200, {feedback});
    } catch (error) {
      return json(error.message === 'provider_limit' ? 429 : 502, {
        error: error.message === 'provider_auth' ? 'provider_auth' : error.message === 'provider_limit' ? 'busy' : 'unavailable'
      });
    } finally { active--; }
  };
}

export const config = {path: '/api/feedback'};
export default createFeedbackFunction();

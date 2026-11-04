import { ALERT_MESSAGES } from '#/_lib/messages/alerts';

/** The alert texts for the service worker (`importScripts`), from the same source as the app. */
export function GET() {
    return new Response(`self.ELO_ALERT_MESSAGES = ${JSON.stringify(ALERT_MESSAGES)};`, {
        headers: { 'content-type': 'application/javascript; charset=utf-8' }
    });
}

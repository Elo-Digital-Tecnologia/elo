/**
 * The browsers' own push services. The server posts to the endpoint, so any other
 * host (an internal address, a cloud metadata IP) is refused.
 */
const PUSH_HOSTS = [
    /^fcm\.googleapis\.com$/,
    /^android\.googleapis\.com$/,
    /(^|\.)push\.services\.mozilla\.com$/,
    /(^|\.)push\.apple\.com$/,
    /(^|\.)notify\.windows\.com$/
];

export const isPushEndpoint = (url: string) => {
    try {
        const u = new URL(url);
        return (
            u.protocol === 'https:' &&
            !u.port &&
            PUSH_HOSTS.some((h) => h.test(u.hostname))
        );
    } catch {
        return false;
    }
};

// Android WebView Firebase Auth Referrer Fix
// Must load BEFORE Firebase SDK.
//
// Problem: Capacitor Android WebView runs at https://localhost. Firebase v9
// Auth SDK uses fetch() for REST API calls, which sends Referer: https://localhost
// — blocked by the API key's HTTP referrer restrictions. Android WebView
// ignores all JavaScript-level referrer controls (referrerPolicy, etc.).
//
// Solution: Intercept fetch() calls to Firebase Auth endpoints and route them
// through Capacitor's native HTTP bridge (CapacitorHttp plugin). Native HTTP
// requests bypass the WebView entirely, so no Referer header is sent.
//
// Only runs on Android. iOS and web are unaffected.
(function() {
    if (typeof window === 'undefined') return;
    if (window.Capacitor?.getPlatform?.() !== 'android') return;

    var FIREBASE_AUTH_DOMAINS = [
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com'
    ];

    function isFirebaseAuthURL(url) {
        if (typeof url !== 'string') return false;
        for (var i = 0; i < FIREBASE_AUTH_DOMAINS.length; i++) {
            if (url.indexOf(FIREBASE_AUTH_DOMAINS[i]) !== -1) return true;
        }
        return false;
    }

    var originalFetch = window.fetch;

    window.fetch = function(input, init) {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

        if (isFirebaseAuthURL(url)) {
            console.log('[Fetch Proxy] Routing Firebase Auth request through native HTTP');

            // Extract headers from init
            var headers = {};
            if (init && init.headers) {
                if (init.headers instanceof Headers) {
                    init.headers.forEach(function(v, k) { headers[k] = v; });
                } else if (typeof init.headers === 'object') {
                    headers = Object.assign({}, init.headers);
                }
            }

            // Get body as string
            var body = init && init.body ? init.body : undefined;
            if (body && typeof body !== 'string') {
                try { body = JSON.stringify(body); } catch(e) {}
            }

            // Use Capacitor's native HTTP plugin
            // Set Referer to the Firebase app domain (which is in the API key's
            // allowed referrer list). The WebView's https://localhost is blocked,
            // but the app's actual Firebase domain is allowed.
            headers['Referer'] = 'https://sleep-suivour.firebaseapp.com/';

            var httpPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
            if (httpPlugin) {
                return httpPlugin.request({
                    url: url,
                    method: (init && init.method) || 'POST',
                    headers: headers,
                    data: body,
                    dataType: 'json'
                }).then(function(nativeResponse) {
                    // Convert native response to a standard Response object
                    var responseBody = typeof nativeResponse.data === 'string'
                        ? nativeResponse.data
                        : JSON.stringify(nativeResponse.data);
                    return new Response(responseBody, {
                        status: nativeResponse.status,
                        headers: nativeResponse.headers || {}
                    });
                });
            } else {
                console.warn('[Fetch Proxy] CapacitorHttp not available, falling back to fetch');
                return originalFetch.call(window, input, init);
            }
        }

        return originalFetch.call(window, input, init);
    };

    console.log('[Fetch Proxy] Firebase Auth referrer fix installed for Android');
})();

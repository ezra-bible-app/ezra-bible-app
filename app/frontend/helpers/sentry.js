window.Sentry = require('@sentry/electron/renderer');

window.sendCrashReports = true;

Sentry.init({
  dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
  debug: false,
  enableNative: true,
  environment: process.env.NODE_ENV,
  beforeSend: (event) => window.sendCrashReports ? event : null
});

const { init } = require('@sentry/electron/dist/renderer');

init({
  dsn: 'https://977e321b83ec4e47b7d28ffcbdf0c6a1@sentry.io/1488321',
  debug: true,
  enableNative: true,
  environment: process.env.NODE_ENV
});
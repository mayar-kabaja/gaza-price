import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://d1397d817341389c453475bd20f35e62@o1247021.ingest.us.sentry.io/4511005444931584",
  tracesSampleRate: 0.3,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

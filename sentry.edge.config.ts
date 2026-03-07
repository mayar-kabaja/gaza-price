import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://39856ac9898e89cc04f2024cb219e61b@o1247021.ingest.us.sentry.io/4511005395320832",
  tracesSampleRate: 0.3,
  environment: process.env.NODE_ENV,
});

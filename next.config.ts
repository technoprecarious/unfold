import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.google.com https://apis.google.com https://www.recaptcha.net https://www.gstatic.com/recaptcha/", // Google Sign-In and reCAPTCHA domains added
              "style-src 'self' 'unsafe-inline' https://www.gstatic.com", // 'unsafe-inline' needed for styled-components
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://www.googleapis.com https://*.firebaseapp.com https://www.google.com https://www.recaptcha.net https://www.gstatic.com", // Google APIs and reCAPTCHA domains added
              "frame-src 'self' https://www.google.com https://www.recaptcha.net https://www.gstatic.com", // reCAPTCHA iframes (if needed)
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

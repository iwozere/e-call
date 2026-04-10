/** PM2 example: run from repo root after `npm run build`. Adjust cwd for your Pi layout. */
module.exports = {
  apps: [
    {
      name: 'ecall-api',
      cwd: __dirname + '/../backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

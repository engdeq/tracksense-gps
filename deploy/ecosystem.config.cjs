module.exports = {
  apps: [
    {
      name: 'tracksense-api',
      cwd: '/var/www/tracksense/backend',
      script: '/var/www/tracksense/backend/node_modules/.bin/tsx',
      args: 'src/index.ts',
      interpreter: 'none',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}

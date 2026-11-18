module.exports = {
  apps: [
    {
      name: 'tracksense-api',
      cwd: '/var/www/tracksense/backend',
      script: 'npx',
      args: 'tsx src/index.ts',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      time: true,
    },
  ],
}

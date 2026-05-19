module.exports = {
  apps: [{
    name: 'baver-dashboard',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 4101',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production',
      NEXT_PUBLIC_API_URL: '/baver/api'
    }
  }]
};

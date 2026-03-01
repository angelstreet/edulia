module.exports = {
  apps: [
    {
      name: 'edulia-api',
      cwd: '/opt/edulia/backend/apps/api',
      script: '/opt/edulia/backend/.venv/bin/gunicorn',
      args: 'app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120',
      interpreter: 'none',
      env_file: '/opt/edulia/backend/.env'
    },
    {
      name: 'edulia-socketio',
      cwd: '/opt/edulia/backend/apps/socketio',
      script: 'src/index.ts',
      interpreter: '/usr/bin/npx',
      interpreter_args: 'ts-node',
      env_file: '/opt/edulia/backend/.env',
      env: {
        REDIS_HOST: '192.168.0.122',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: 'CHANGE_ME_REDIS_PASSWORD'
      }
    },
    {
      name: 'edulia-worker',
      cwd: '/opt/edulia/backend/apps/api',
      script: '/opt/edulia/backend/.venv/bin/celery',
      args: '-A worker.worker worker -l warning -c 4 -Q default,notifications,pdf,email --max-tasks-per-child=100',
      interpreter: 'none',
      env_file: '/opt/edulia/backend/.env'
    },
    {
      name: 'edulia-beat',
      cwd: '/opt/edulia/backend/apps/api',
      script: '/opt/edulia/backend/.venv/bin/celery',
      args: '-A worker.worker beat -l warning --schedule /opt/edulia/backend/celerybeat-schedule',
      interpreter: 'none',
      env_file: '/opt/edulia/backend/.env'
    },
    {
      name: 'edulia-frontend',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: '/opt/edulia/backend/apps/web/dist',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true'
      }
    }
  ]
};

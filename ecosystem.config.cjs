// PM2 process file for the Hostinger VPS: `pm2 start ecosystem.config.cjs`.
// ONE instance only: content edits in admin clear the page cache of the process that handled them,
// so a second process would keep serving old content.
module.exports = {
  apps: [
    {
      name: "prajaride",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "900M",
      kill_timeout: 15000, // let in-flight requests finish on restart
      env: {
        NODE_ENV: "production",
        // Keeps image resizing (sharp) memory in check on Linux.
        MALLOC_ARENA_MAX: "2",
      },
    },
  ],
};

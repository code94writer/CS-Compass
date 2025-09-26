module.exports = {
  migrationFolder: 'database/migrations',
  direction: 'up',
  logFileName: 'node-pg-migrate.log',
  databaseUrl: process.env.DATABASE_URL || undefined,
  // You can add more config as needed
};

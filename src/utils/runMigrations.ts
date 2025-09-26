import { exec } from 'child_process';
import logger from '../config/logger';

export async function runMigrations() {
  return new Promise<void>((resolve, reject) => {
    exec('npm run migrate', (error, stdout, stderr) => {
      if (error) {
        logger.error('Migration failed', { error, stderr });
        reject(error);
      } else {
        logger.info('Migration output', { stdout });
        resolve();
      }
    });
  });
}

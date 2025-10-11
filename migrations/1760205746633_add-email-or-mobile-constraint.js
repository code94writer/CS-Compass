/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.alterColumn('users', 'email', { notNull: false });
    pgm.alterColumn('users', 'mobile', { notNull: false });

    pgm.addConstraint('users', 'email_or_mobile_required', {
        check: '(email IS NOT NULL OR mobile IS NOT NULL)',
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropConstraint('users', 'email_or_mobile_required');
    pgm.alterColumn('users', 'email', { notNull: true });
    pgm.alterColumn('users', 'mobile', { notNull: true });
};

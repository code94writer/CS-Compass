declare module 'bcryptjs' {
  export function hash(password: string, saltRounds: number): Promise<string>;
  export function compare(password: string, hash: string): Promise<boolean>;
  export function hashSync(password: string, saltRounds: number): string;
  export function compareSync(password: string, hash: string): boolean;
  export function genSalt(saltRounds: number): Promise<string>;
  export function genSaltSync(saltRounds: number): string;
}

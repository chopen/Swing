import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function findUserById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

export function findUserByPhone(phone) {
  return readUsers().find((u) => u.phone === phone) || null;
}

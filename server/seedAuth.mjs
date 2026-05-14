import bcrypt from 'bcryptjs'
import { getDb, persistDatabase } from './database.mjs'
import { queryRun } from './query.mjs'
import { countUsers } from './repositories/userRepository.mjs'

/** Демо-акаунти: admin / admin123, user / user123 */
export function ensureSeedUsers() {
  if (countUsers() > 0) return
  const db = getDb()
  const rounds = 10
  const hAdmin = bcrypt.hashSync('admin123', rounds)
  const hUser = bcrypt.hashSync('user123', rounds)
  queryRun(
    db,
    `INSERT INTO users (username, password_hash, role) VALUES (?,?,?)`,
    ['admin', hAdmin, 'admin'],
  )
  queryRun(
    db,
    `INSERT INTO users (username, password_hash, role) VALUES (?,?,?)`,
    ['user', hUser, 'user'],
  )
  persistDatabase()
}

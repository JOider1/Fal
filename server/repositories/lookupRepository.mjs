import { Brand, Color, Size, Season, ClothingType } from '../entities.mjs'
import { getDb } from '../database.mjs'
import { queryAll } from '../query.mjs'

const selectAll = (table, Entity) => {
  const db = getDb()
  const rows = queryAll(db, `SELECT id, name FROM ${table} ORDER BY name`)
  return rows.map((r) => Entity.fromRow(r))
}

export function getAllBrands() {
  return selectAll('brands', Brand)
}

export function getAllColors() {
  return selectAll('colors', Color)
}

export function getAllSizes() {
  const db = getDb()
  const rows = queryAll(db, `SELECT id, code FROM sizes ORDER BY id`)
  return rows.map((r) => Size.fromRow(r))
}

export function getAllSeasons() {
  return selectAll('seasons', Season)
}

export function getAllClothingTypes() {
  return selectAll('clothing_types', ClothingType)
}

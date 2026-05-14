/** Сутності БД — окремі класи для кожної таблиці */

export class Brand {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromRow(row) {
    return new Brand({ id: row.id, name: row.name })
  }
}

export class Color {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromRow(row) {
    return new Color({ id: row.id, name: row.name })
  }
}

export class Size {
  constructor({ id, code }) {
    this.id = id
    this.code = code
  }

  static fromRow(row) {
    return new Size({ id: row.id, code: row.code })
  }
}

export class Season {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromRow(row) {
    return new Season({ id: row.id, name: row.name })
  }
}

export class ClothingType {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromRow(row) {
    return new ClothingType({ id: row.id, name: row.name })
  }
}

export class Product {
  constructor({
    id,
    name,
    description,
    price,
    imageUrl,
    brandId,
    brandName,
    colorId,
    colorName,
    sizeId,
    sizeCode,
    seasonId,
    seasonName,
    clothingTypeId,
    clothingTypeName,
    sizeStocks,
  }) {
    this.id = id
    this.name = name
    this.description = description
    this.price = price
    this.imageUrl = imageUrl
    this.brandId = brandId
    this.brandName = brandName
    this.colorId = colorId
    this.colorName = colorName
    this.sizeId = sizeId
    this.sizeCode = sizeCode
    this.seasonId = seasonId
    this.seasonName = seasonName
    this.clothingTypeId = clothingTypeId
    this.clothingTypeName = clothingTypeName
    /** @type {Array<{ sizeId: number, sizeCode: string, quantity: number }>} */
    this.sizeStocks = sizeStocks ?? []
  }

  static fromRow(row) {
    return new Product({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      imageUrl: row.image_url ?? '/images/products/1.svg',
      brandId: row.brand_id,
      brandName: row.brand_name,
      colorId: row.color_id,
      colorName: row.color_name,
      sizeId: row.size_id,
      sizeCode: row.size_code,
      seasonId: row.season_id,
      seasonName: row.season_name,
      clothingTypeId: row.clothing_type_id,
      clothingTypeName: row.clothing_type_name,
      sizeStocks: [],
    })
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      imageUrl: this.imageUrl,
      brandId: this.brandId,
      brandName: this.brandName,
      colorId: this.colorId,
      colorName: this.colorName,
      sizeId: this.sizeId,
      sizeCode: this.sizeCode,
      seasonId: this.seasonId,
      seasonName: this.seasonName,
      clothingTypeId: this.clothingTypeId,
      clothingTypeName: this.clothingTypeName,
      sizeStocks: this.sizeStocks,
    }
  }
}

export class User {
  constructor({ id, username, role }) {
    this.id = id
    this.username = username
    this.role = role
  }

  static fromRow(row) {
    return new User({
      id: row.id,
      username: row.username,
      role: row.role,
    })
  }
}

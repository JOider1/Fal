/** Клієнтські класи-сутності, що відповідають таблицям БД */

export class User {
  constructor({ id, username, role }) {
    this.id = id
    this.username = username
    this.role = role
  }

  static fromApi(o) {
    return new User({ id: o.id, username: o.username, role: o.role })
  }
}

export class UserFavorite {
  constructor({ id, userId, productId }) {
    this.id = id
    this.userId = userId
    this.productId = productId
  }

  static fromApi(o) {
    return new UserFavorite({
      id: o.id,
      userId: o.userId,
      productId: o.productId,
    })
  }
}

export class Brand {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromApi(o) {
    return new Brand({ id: o.id, name: o.name })
  }
}

export class Color {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromApi(o) {
    return new Color({ id: o.id, name: o.name })
  }
}

export class Size {
  constructor({ id, code }) {
    this.id = id
    this.code = code
  }

  static fromApi(o) {
    return new Size({ id: o.id, code: o.code })
  }
}

export class Season {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromApi(o) {
    return new Season({ id: o.id, name: o.name })
  }
}

export class ClothingType {
  constructor({ id, name }) {
    this.id = id
    this.name = name
  }

  static fromApi(o) {
    return new ClothingType({ id: o.id, name: o.name })
  }
}

export class Product {
  constructor(p) {
    this.id = p.id
    this.name = p.name
    this.description = p.description
    this.price = p.price
    this.imageUrl = p.imageUrl || '/images/products/1.svg'
    this.brandId = p.brandId
    this.brandName = p.brandName
    this.colorId = p.colorId
    this.colorName = p.colorName
    this.sizeId = p.sizeId
    this.sizeCode = p.sizeCode
    this.seasonId = p.seasonId
    this.seasonName = p.seasonName
    this.clothingTypeId = p.clothingTypeId
    this.clothingTypeName = p.clothingTypeName
    this.sizeStocks = Array.isArray(p.sizeStocks) ? p.sizeStocks : []
  }

  static fromApi(o) {
    return new Product({
      ...o,
      imageUrl: o.imageUrl || '/images/products/1.svg',
      sizeStocks: o.sizeStocks ?? [],
    })
  }
}

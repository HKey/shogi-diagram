export const enum Piece {
  KING,
  ROOK,
  BISHOP,
  GOLD,
  SILVER,
  KNIGHT,
  LANCE,
  PAWN,
  PROMOTED_ROOK,
  PROMOTED_BISHOP,
  PROMOTED_SILVER,
  PROMOTED_KNIGHT,
  PROMOTED_LANCE,
  PROMOTED_PAWN
}

export const enum Player {
  FIRST,
  SECOND
}

export function flippedPlayer(player: Player) {
  switch (player) {
    case Player.FIRST: return Player.SECOND
    case Player.SECOND: return Player.FIRST
  }
}

export const NUM_RANKS = 9
export const NUM_FILES = 9

export function getRankNotation(rank: number) {
  const arr = ['一',
               '二',
               '三',
               '四',
               '五',
               '六',
               '七',
               '八',
               '九']
  if (rank >= arr.length || rank < 0) {
    throw new Error(`Rank ${rank} is out of range.`)
  }

  return arr[rank]
}

export function getFileNotation(file: number) {
  const arr = ['１',
               '２',
               '３',
               '４',
               '５',
               '６',
               '７',
               '８',
               '９']
  if (file >= arr.length || file < 0) {
    throw new Error(`File ${file} is out of range.`)
  }

  return arr[file]
}

export function getPieceNotation (piece: Piece) {
  switch (piece) {
    case Piece.KING:            return ['玉']
    case Piece.ROOK:            return ['飛']
    case Piece.BISHOP:          return ['角']
    case Piece.GOLD:            return ['金']
    case Piece.SILVER:          return ['銀']
    case Piece.KNIGHT:          return ['桂']
    case Piece.LANCE:           return ['香']
    case Piece.PAWN:            return ['歩']
    case Piece.PROMOTED_ROOK:   return ['龍']
    case Piece.PROMOTED_BISHOP: return ['馬']
    case Piece.PROMOTED_SILVER: return ['成', '銀']
    case Piece.PROMOTED_KNIGHT: return ['成', '桂']
    case Piece.PROMOTED_LANCE:  return ['成', '香']
    case Piece.PROMOTED_PAWN:   return ['と']
  }
}

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

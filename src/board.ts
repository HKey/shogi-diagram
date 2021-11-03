import { Equal } from './equal'
import { Piece, Player, flippedPlayer, NUM_RANKS, NUM_FILES } from './shogi'

export const PIECE_STAND_PIECE_ORDER = [
  Piece.KING,
  Piece.ROOK,
  Piece.BISHOP,
  Piece.GOLD,
  Piece.SILVER,
  Piece.KNIGHT,
  Piece.LANCE,
  Piece.PAWN
]

export class SquarePiece {
  readonly piece: Piece
  readonly player: Player

  constructor(piece: Piece, player: Player) {
    this.piece = piece
    this.player = player
  }
}

export class SquarePlace implements Equal {
  readonly file: number
  readonly rank: number

  constructor(file: number, rank: number) {
    if (file >= NUM_FILES || file < 0) {
      throw new Error(`File ${file} is out of range.`)
    }
    if (rank >= NUM_RANKS || rank < 0) {
      throw new Error(`Rank ${rank} is out of range.`)
    }

    this.file = file
    this.rank = rank
  }

  equal(other: any) {
    return other instanceof SquarePlace
      && this.file === other.file
      && this.rank === other.rank
  }
}

export class PieceStandPlace implements Equal {
  readonly player: Player

  constructor(player: Player) {
    this.player = player
  }

  equal(other: any) {
    return other instanceof PieceStandPlace
      && this.player === other.player
  }
}

export class PieceStandPiecePlace implements Equal {
  readonly player: Player
  readonly index: number

  constructor(player: Player, index: number) {
    if (index < 0 || index >= PIECE_STAND_PIECE_ORDER.length) {
      throw new Error(`Index ${index} is out of range.`)
    }

    this.player = player
    this.index = index
  }

  equal(other: any) {
    return other instanceof PieceStandPiecePlace
      && this.player === other.player
      && this.index === other.index
  }
}

export function promotedPiece(piece: Piece): Piece {
  switch (piece) {
    case Piece.ROOK: return Piece.PROMOTED_ROOK
    case Piece.BISHOP: return Piece.PROMOTED_BISHOP
    case Piece.SILVER: return Piece.PROMOTED_SILVER
    case Piece.KNIGHT: return Piece.PROMOTED_KNIGHT
    case Piece.LANCE: return Piece.PROMOTED_LANCE
    case Piece.PAWN: return Piece.PROMOTED_PAWN
    default: return piece
  }
}

function unpromotedPiece(piece: Piece): Piece {
  switch (piece) {
    case Piece.PROMOTED_ROOK: return Piece.ROOK
    case Piece.PROMOTED_BISHOP: return Piece.BISHOP
    case Piece.PROMOTED_SILVER: return Piece.SILVER
    case Piece.PROMOTED_KNIGHT: return Piece.KNIGHT
    case Piece.PROMOTED_LANCE: return Piece.LANCE
    case Piece.PROMOTED_PAWN: return Piece.PAWN
    default: return piece
  }
}

function flippedPiece(piece: Piece): Piece {
  switch (piece) {
    case Piece.ROOK: return Piece.PROMOTED_ROOK
    case Piece.BISHOP: return Piece.PROMOTED_BISHOP
    case Piece.SILVER: return Piece.PROMOTED_SILVER
    case Piece.KNIGHT: return Piece.PROMOTED_KNIGHT
    case Piece.LANCE: return Piece.PROMOTED_LANCE
    case Piece.PAWN: return Piece.PROMOTED_PAWN
    default: return unpromotedPiece(piece)
  }
}

export class PieceStand {
  private pieces: Map<Piece, number>

  constructor() {
    this.pieces = new Map()
  }

  has(piece: Piece) {
    return this.num(piece) > 0
  }

  pop(piece: Piece) {
    if (!this.has(piece)) {
      throw new Error(`Piece ${piece} not found in this PieceStand`)
    }
    this.pieces.set(piece, this.num(piece) - 1)
  }

  push(piece: Piece) {
    piece = unpromotedPiece(piece)
    this.pieces.set(piece, this.num(piece) + 1)
  }

  empty() {
    for (let v of this.pieces.values()) {
      if (v > 0) {
        return false
      }
    }
    return true
  }

  num(piece: Piece) {
    const num = this.pieces.get(piece)
    if (num !== undefined) {
      return num
    } else {
      return 0
    }
  }

  get length() {
    let count = 0
    for (let v of this.pieces.values()) {
      if (v > 0) {
        count++
      }
    }
    return count
  }

  pieceByIndex(index: number): Piece | undefined {
    if (index < 0 || index >= PIECE_STAND_PIECE_ORDER.length) {
      throw new Error(`Index ${index} is out of range.`)
    }
    let i = 0
    for (let piece of PIECE_STAND_PIECE_ORDER) {
      if (this.has(piece)) {
        if (i === index) {
          return piece
        }
        i++
      }
    }
    return undefined
  }
}

export class Board {
  private squares: Array<SquarePiece | undefined>
  private firstPieceStand: PieceStand
  private secondPieceStand: PieceStand

  private index(squarePlace: SquarePlace) {
    return squarePlace.rank * NUM_FILES + squarePlace.file
  }

  constructor() {
    this.squares = Array(NUM_RANKS * NUM_FILES)
    this.firstPieceStand = new PieceStand
    this.secondPieceStand = new PieceStand
  }

  getSquarePiece(squarePlace: SquarePlace) {
    const square = this.squares[this.index(squarePlace)]
    if (square === undefined)
      return undefined
    else
      return square
  }

  setSquarePiece(squarePlace: SquarePlace, squarePiece: SquarePiece | undefined) {
    this.squares[this.index(squarePlace)] = squarePiece
  }

  getPieceStand(player: Player) {
    switch (player) {
      case Player.FIRST: return this.firstPieceStand
      case Player.SECOND: return this.secondPieceStand
    }
  }

  private pieceAndPlayer(place: SquarePlace | PieceStandPiecePlace) {
    if (place instanceof SquarePlace) {
      const squarePiece = this.getSquarePiece(place)
      if (squarePiece !== undefined) {
        return {
          piece: squarePiece.piece,
          player: squarePiece.player
        }
      } else {
        return { piece: undefined, player: undefined }
      }
    } else if (place instanceof PieceStandPiecePlace) {
      return {
        piece: this.getPieceStand(place.player).pieceByIndex(place.index),
        player: place.player
      }
    } else {
      throw new Error('Unreachable')
    }
  }

  canMove(moveFrom: SquarePlace | PieceStandPiecePlace) {
    const { piece, player } = this.pieceAndPlayer(moveFrom)
    return piece !== undefined && player !== undefined
  }

  move(moveFrom: SquarePlace | PieceStandPiecePlace,
       moveTo: SquarePlace | PieceStandPlace) {
    if (moveFrom.equal(moveTo)) {
      // Do nothing.
      return
    }

    const { piece, player } = this.pieceAndPlayer(moveFrom)

    if (piece === undefined || player === undefined) {
      throw new Error('Piece to be moved is not found')
    }

    // Destination already has a piece.
    if (moveTo instanceof SquarePlace) {
      const existingPiece = this.getSquarePiece(moveTo)
      if (existingPiece !== undefined) {
        this.getPieceStand(player).push(existingPiece.piece)
      }
    }

    // Remove the piece from the source place.
    if (moveFrom instanceof SquarePlace) {
      this.setSquarePiece(moveFrom, undefined)
    } else if (moveFrom instanceof PieceStandPiecePlace) {
      this.getPieceStand(moveFrom.player).pop(piece)
    }

    // Set the piece to the destination.
    if (moveTo instanceof SquarePlace) {
      this.setSquarePiece(moveTo, new SquarePiece(piece, player))
    } else if (moveTo instanceof PieceStandPlace) {
      this.getPieceStand(moveTo.player).push(piece)
    }
  }

  flipPlayer(squarePlace: SquarePlace) {
    const squarePiece = this.getSquarePiece(squarePlace)
    if (squarePiece === undefined) {
      throw new Error('Square has no piece')
    }

    this.setSquarePiece(squarePlace,
                        new SquarePiece(squarePiece.piece,
                                        flippedPlayer(squarePiece.player)))
  }

  flipPiece(squarePlace: SquarePlace) {
    const squarePiece = this.getSquarePiece(squarePlace)
    if (squarePiece === undefined) {
      throw new Error('Square has no piece')
    }

    this.setSquarePiece(squarePlace,
                        new SquarePiece(flippedPiece(squarePiece.piece),
                                        squarePiece.player))
  }
}

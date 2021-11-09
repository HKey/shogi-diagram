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
  readonly piece: Piece

  constructor(player: Player, piece: Piece) {
    this.player = player
    this.piece = piece
  }

  equal(other: any) {
    return other instanceof PieceStandPiecePlace
      && this.player === other.player
      && this.piece === other.piece
  }
}

function isPromotablePiece(piece: Piece) {
  switch (piece) {
    case Piece.ROOK:
    case Piece.BISHOP:
    case Piece.SILVER:
    case Piece.KNIGHT:
    case Piece.LANCE:
    case Piece.PAWN:
      return true
    default: return false
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
      if (this.getPieceStand(place.player).has(place.piece)) {
        return {
          piece: place.piece,
          player: place.player
        }
      } else {
        return { piece: undefined, player: undefined }
      }
    } else {
      throw new Error('Unreachable')
    }
  }

  canMove(moveFrom: SquarePlace | PieceStandPiecePlace) {
    const { piece, player } = this.pieceAndPlayer(moveFrom)
    return piece !== undefined && player !== undefined
  }

  private makeLegalMovePlaces(moveFrom: SquarePlace): Array<SquarePlace> {
    const squarePiece = this.getSquarePiece(moveFrom)
    if (squarePiece === undefined) {
      return []
    }

    const piece = squarePiece.piece
    const player = squarePiece.player

    // Movable places of a piece of the first player.
    // file, rank, continuable
    const mbs: Array<[number, number, boolean]> =
      ((): Array<[number, number, boolean]> => {
        switch (piece) {
          case Piece.KING:
            return [[-1, -1, false],
                    [-1, 0, false],
                    [-1, 1, false],
                    [0, -1, false],
                    [0, 1, false],
                    [1, -1, false],
                    [1, 0, false],
                    [1, 1, false]]
          case Piece.ROOK:
            return [[-1, 0, true],
                    [0, -1, true],
                    [0, 1, true],
                    [1, 0, true]]
          case Piece.BISHOP:
            return [[-1, -1, true],
                    [-1, 1, true],
                    [1, -1, true],
                    [1, 1, true]]
          case Piece.GOLD:
          case Piece.PROMOTED_SILVER:
          case Piece.PROMOTED_KNIGHT:
          case Piece.PROMOTED_LANCE:
          case Piece.PROMOTED_PAWN:
            return [[-1, -1, false],
                    [-1, 0, false],
                    [0, -1, false],
                    [0, 1, false],
                    [1, -1, false],
                    [1, 0, false]]
          case Piece.SILVER:
            return [[-1, -1, false],
                    [-1, 1, false],
                    [0, -1, false],
                    [1, -1, false],
                    [1, 1, false]]
          case Piece.KNIGHT:
            return [[-1, -2, false],
                    [1, -2, false]]
          case Piece.LANCE:
            return [[0, -1, true]]
          case Piece.PAWN:
            return [[0, -1, false]]
          case Piece.PROMOTED_ROOK:
            return [[-1, 0, true],
                    [-1, -1, false],
                    [-1, 1, false],
                    [0, -1, true],
                    [0, 1, true],
                    [1, 0, true],
                    [1, -1, false],
                    [1, 1, false]]
          case Piece.PROMOTED_BISHOP:
            return [[-1, -1, true],
                    [-1, 0, false],
                    [-1, 1, true],
                    [0, -1, false],
                    [0, 1, false],
                    [1, -1, true],
                    [1, 0, false],
                    [1, 1, true]]
        }
      })()
    const movables: Array<[number, number, boolean]> =
      ((): Array<[number, number, boolean]> => {
        switch (player) {
          case Player.FIRST: return mbs
          case Player.SECOND: return mbs.map((m) => {
            const [file, rank, continuable] = m
            return [file, -1 * rank, continuable]
          })
        }
      })()

    let places: Array<SquarePlace> = []
    const canMoveTo = (moveTo: SquarePlace) => {
      const squarePiece = this.getSquarePiece(moveTo)
      return squarePiece === undefined || squarePiece.player !== player
    }
    const makeSquarePlace = (file: number, rank: number) => {
      if (0 <= file && file < NUM_FILES &&
        0 <= rank && rank < NUM_RANKS) {
        return new SquarePlace(file, rank)
      } else {
        return undefined
      }
    }

    for (const [file, rank, continuable] of movables) {
      if (continuable) {
        let p = makeSquarePlace(moveFrom.file + file, moveFrom.rank + rank)
        while (p !== undefined && canMoveTo(p)) {
          places.push(p)
          const sqp = this.getSquarePiece(p)
          if (sqp !== undefined && sqp.player !== player) {
            break
          }
          p = makeSquarePlace(p.file + file, p.rank + rank)
        }
      } else {
        const p = makeSquarePlace(moveFrom.file + file, moveFrom.rank + rank)
        if (p !== undefined && canMoveTo(p)) {
          places.push(p)
        }
      }
    }

    return places
  }

  isPromotableMove(moveFrom: SquarePlace | PieceStandPiecePlace,
                   moveTo: SquarePlace): boolean {
    if (moveFrom instanceof PieceStandPiecePlace) {
      return false
    }

    const sp = this.getSquarePiece(moveFrom)
    if (sp === undefined) {
      throw new Error('There is no piece at moveFrom')
    }
    const piece = sp.piece
    const player = sp.player

    const isPromotableArea = (rank: number) => {
      switch (player) {
        case Player.FIRST: return rank <= 2
        case Player.SECOND: return rank >= 6
      }
    }

    return isPromotablePiece(piece)
      && (isPromotableArea(moveFrom.rank) || isPromotableArea(moveTo.rank))
  }

  isLegalMove(moveFrom: SquarePlace | PieceStandPiecePlace,
              moveTo: SquarePlace): boolean {
    if (moveFrom instanceof SquarePlace) {
      const legalPlaces = this.makeLegalMovePlaces(moveFrom)
      return legalPlaces.some((p) => moveTo.equal(p))
    } else if (moveFrom instanceof PieceStandPiecePlace) {
      // TODO: Consider two pawns, dropping or moving piece where
      // cannot move and other illegal moves.
      return this.getPieceStand(moveFrom.player).has(moveFrom.piece) &&
        this.getSquarePiece(moveTo) === undefined
    } else {
      throw new Error('Unreachable')
    }
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

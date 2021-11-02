import { NUM_RANKS, NUM_FILES, Piece, Player } from './shogi'
import { Board, promotedPiece, SquarePiece, SquarePlace } from './board'

const PIECE_CHARACTERS = 'KkRrBbGgSsNnLlPp'

function parseInt(str: string) {
  const n = Number(str)
  if (!Number.isInteger(n)) {
    throw new Error(`Cannot pasre ${str} as an integer`)
  }
  return n
}

function parsePiece(str: string): { piece: Piece, player: Player } {
  const match = str.match(
    new RegExp(String.raw`^(\+)?([${PIECE_CHARACTERS}])$`))

  if (match === null) {
    throw new Error(`Cannot pasre ${str} as a piece`)
  }

  const promoted = match[1] === '+'
  const piece = {
    'k': Piece.KING,
    'r': Piece.ROOK,
    'b': Piece.BISHOP,
    'g': Piece.GOLD,
    's': Piece.SILVER,
    'n': Piece.KNIGHT,
    'l': Piece.LANCE,
    'p': Piece.PAWN
  }[match[2].toLowerCase()]
  const firstPiece = match[2] === match[2].toUpperCase()

  if (piece === undefined) {
    throw new Error(`${match[2]} is not a piece character`)
  }

  return {
    piece: promoted ? promotedPiece(piece) : piece,
    player: firstPiece ? Player.FIRST : Player.SECOND
  }
}

/**
 * Parses a string as pieces in a rank.
 *
 * This returns an array of pieces.
 * Its order is file 9 to 1.
 */
function parseRankPieces(str: string): Array<SquarePiece | undefined> {
  let rest = str
  let pieces: Array<SquarePiece | undefined> = []
  const re = new RegExp(String.raw`^([0-9]|\+?[${PIECE_CHARACTERS}])(.*)$`)

  while (rest.length > 0) {
    const match = rest.match(re)
    if (match === null) {
      throw new Error(`Cannot parse ${str} as a rank pieces`)
    }

    if (/[0-9]/.test(match[1])) {
      // FIXME: To avoid being type checked as 'Array<SquarePiece |
      // undefined> + Array<any>', currently push undefined one by
      // one.  What I want to do is like
      // `pieces = pieces + new Array(parseInt(match[1]))`.
      const n = parseInt(match[1])
      for (let i = 0; i < n; i++) {
        pieces.push(undefined)
      }
    } else {
      pieces.push(parsePiece(match[1]))
    }

    rest = match[2]
  }

  return pieces
}

function parsePieceStandPieces(str: string): Array<{ piece: Piece,
                                                     player: Player,
                                                     num: number }> {
  if (str === '-') {
    return []
  }

  let rest = str
  let pieces: Array<{ piece: Piece, player: Player, num: number }> = []
  const re = new RegExp(String.raw`^([0-9]+)?([${PIECE_CHARACTERS}])(.*)$`)

  while (rest.length > 0) {
    const match = rest.match(re)
    if (match === null) {
      throw new Error(`Cannot parse ${str} as piece stand pieces`)
    }

    const num = match[1] === undefined ? 1 : parseInt(match[1])
    const piece = parsePiece(match[2])

    pieces.push({
      piece: piece.piece,
      player: piece.player,
      num: num
    })

    rest = match[3]
  }

  return pieces
}


/**
 * Parses SFEN string and returns the result as a `Board` instance.
 *
 * If parsing is failed, this function throw an error.
 */
export function parseSfen(sfen: string): Board {
  const re = new RegExp('(?:sfen )?' +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+)/` +
    `([+0-9${PIECE_CHARACTERS}]+) ` +
    `([bw]) `+
    `([-0-9${PIECE_CHARACTERS}]+) ` +
    `([0-9]+)`)

  const match = sfen.match(re)

  if (match === null) {
    throw new Error(`Cannot parse ${sfen} as an SFEN string`)
  }

  const boardPieces = [match[1],
                       match[2],
                       match[3],
                       match[4],
                       match[5],
                       match[6],
                       match[7],
                       match[8],
                       match[9]].map(parseRankPieces)
  const pieceStandPieces = parsePieceStandPieces(match[11])
  const board = new Board()

  for (let rank = 0; rank < NUM_RANKS; rank++) {
    for (let file = 0; file < NUM_FILES; file++) {
      const piece = boardPieces[rank][NUM_FILES - file - 1]
      board.setSquarePiece(new SquarePlace(file, rank), piece)
    }
  }

  for (const piece of pieceStandPieces) {
    for (let n = 0; n < piece.num; n++) {
      board.getPieceStand(piece.player).push(piece.piece)
    }
  }

  return board
}

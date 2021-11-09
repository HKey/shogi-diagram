import { PieceStandPiecePlace, SquarePlace } from './board'
import { Move, DummyMove, DummyMoveKind } from './record'
import { Player, flippedPlayer, Piece } from './shogi'

const PLAYERS = ['▲', '△']
const FILES = ['１' ,'２' ,'３' ,'４' ,'５' ,'６' ,'７' ,'８' ,'９']
const RANKS = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
const PIECES = ['玉',
                '飛', '龍', '竜',
                '角', '馬',
                '金',
                '銀', '成銀', '全',
                '桂', '成桂', '圭',
                '香', '成香', '杏',
                '歩', 'と']
const DROPPING = '打'
const PROMOTION = '成'
const DECORATIONS = [DROPPING, PROMOTION]
const GAME_ENDS = ['中断', '投了', '持将棋', '千日手', '詰み', '切れ負け',
                   '反則勝ち', '反則負け', '入玉勝ち', '不戦勝', '不戦敗']
const SAME_INDICATOR = '同　'

function parsePlayer(s: string): Player {
  switch (s) {
    case '▲': return Player.FIRST
    case '△': return Player.SECOND
    default: throw new Error(`Invalid player notation: ${s}`)
  }
}

function parseFile(s: string): number {
  const index = FILES.indexOf(s)
  if (index >= 0) {
    return index
  } else {
    throw new Error(`Invalid file notation: ${s}`)
  }
}

function parseRank(s: string): number {
  const index = RANKS.indexOf(s)
  if (index >= 0) {
    return index
  } else {
    throw new Error(`Invalid rank notation: ${s}`)
  }
}

function parsePiece(s: string): Piece {
  switch (s) {
    case '玉': return Piece.KING
    case '飛': return Piece.ROOK
    case '角': return Piece.BISHOP
    case '金': return Piece.GOLD
    case '銀': return Piece.SILVER
    case '桂': return Piece.KNIGHT
    case '香': return Piece.LANCE
    case '歩': return Piece.PAWN

    case '龍':
    case '竜': return Piece.PROMOTED_ROOK
    case '馬': return Piece.PROMOTED_BISHOP
    case '成銀':
    case '全': return Piece.PROMOTED_SILVER
    case '成桂':
    case '圭': return Piece.PROMOTED_KNIGHT
    case '成香':
    case '杏': return Piece.PROMOTED_LANCE
    case 'と': return Piece.PROMOTED_PAWN

    default: throw new Error('Unreachable')
  }
}

function parseOrigin(s: string): SquarePlace {
  const n = parseInt(s)
  const file = Math.trunc(n / 10)
  const rank = n - file * 10
  return new SquarePlace(file - 1, rank - 1)
}

function makeUnionRegexString(strings: Array<string>): string {
  return `(?:${strings.join('|')})`
}

function tryParsingMoveLine(s: string) {
  const sPlayers = makeUnionRegexString(PLAYERS)
  const sFiles = makeUnionRegexString(FILES)
  const sRanks = makeUnionRegexString(RANKS)
  const sPieces = makeUnionRegexString(PIECES)
  const sDecorations = makeUnionRegexString(DECORATIONS)
  const sGameEnds = makeUnionRegexString(GAME_ENDS)
  const sDestinations = `(?:(${SAME_INDICATOR})|(${sFiles})(${sRanks}))`
  const sOrigin = String.raw`(?:\((\d\d)\))`
  const sMove = `(${sPlayers})?(?:(${sGameEnds})|(?:${sDestinations}(${sPieces}))(${sDecorations})?${sOrigin}?)`
  const sTurn = String.raw`\d+`
  const sTime = String.raw`\( *\d+:\d+/\d+:\d+:\d+\)`
  const moveLineRegex = new RegExp(`^ *(${sTurn}) +${sMove} +${sTime}$`)

  const match = s.match(moveLineRegex)

  if (match === null) {
    return undefined
  }

  const [_, turn, player, gameEnd, same, file, rank, piece, decoration, origin] = match

  return {
    turn: parseInt(turn),
    player: player !== undefined ? parsePlayer(player) : undefined,
    gameEnd: gameEnd !== undefined,
    same: same !== undefined,
    file: file !== undefined ? parseFile(file) : undefined,
    rank: rank !== undefined ? parseRank(rank) : undefined,
    piece: piece !== undefined ? parsePiece(piece) : undefined,
    dropping: decoration === DROPPING,
    promotion: decoration === PROMOTION,
    origin: origin !== undefined ? parseOrigin(origin) : undefined
  }
}

export function parseKif(kif: string): Array<Move | DummyMove> {
  let lines = kif.split('\n')
  let moves: Array<Move | DummyMove> = [new DummyMove(DummyMoveKind.START)]
  let lastDestination: SquarePlace | undefined = undefined
  // NOTE: When supporting various handicap games, consider a game
  // starts with the second player's move.
  let lastPlayer = Player.SECOND

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // TODO: Support various handicap games.

    // Comment
    if (line.startsWith('#')) {
      // Ignore.
      i++
      continue
    }

    // Move comment
    if (line.startsWith('*')) {
      // Ignore.
      i++
      continue
    }

    // Move
    {
      const moveInfo = tryParsingMoveLine(line)
      if (moveInfo !== undefined) {
        // NOTE: Current implementation assumes that the moves are
        // sorted.
        const player: Player = moveInfo.player !== undefined
          ? moveInfo.player : flippedPlayer(lastPlayer)

        if (moveInfo.gameEnd) {
          moves.push(new DummyMove(DummyMoveKind.END))
        } else {
          if (moveInfo.piece === undefined) {
            throw new Error('Invalid move because piece is not specified')
          }
          const moveFrom = (() => {
            if (moveInfo.dropping) {
              return new PieceStandPiecePlace(player, moveInfo.piece)
            } else {
              if (moveInfo.origin === undefined) {
                throw new Error('Invalid move because origin is not specified')
              }
              return moveInfo.origin
            }
          })()
          const moveTo: SquarePlace = (() => {
            if (moveInfo.same) {
              if (lastDestination === undefined) {
                throw new Error('Cannot determine the same destination')
              }
              return lastDestination
            } else {
              if (moveInfo.file === undefined || moveInfo.rank === undefined) {
                throw new Error('Cannot determine the destination because file or rank is not specified')
              }
              return new SquarePlace(moveInfo.file, moveInfo.rank)
            }
          })()
          moves.push(new Move(player, moveFrom, moveTo, moveInfo.promotion))
          lastDestination = moveTo
        }
        lastPlayer = player
        i++
        continue
      }
    }

    // Branches
    // TODO: Support branches.
    if (line.startsWith('変化：')) {
      // Ignore branches.
      // Skip lines until an empty line appears.
      i++
      while (i < lines.length) {
        const l = lines[i]
        i++
        if (l.trim() === '') {
          break
        }
      }
      continue
    }

    i++
  }

  return moves
}

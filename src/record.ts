import { getFileNotation, getRankNotation, Player, getPieceNotation } from './shogi'
import { SquarePlace, PieceStandPiecePlace, Board, SquarePiece, promotedPiece } from './board'
import { parseSfen } from './sfen'

export const enum DummyMove {
  START,
  // TODO: Support various game ends.
  END
}

export class Move {
  readonly player: Player
  readonly moveFrom: SquarePlace | PieceStandPiecePlace
  readonly moveTo: SquarePlace
  readonly promote: boolean

  constructor(player: Player,
              moveFrom: SquarePlace | PieceStandPiecePlace,
              moveTo: SquarePlace,
              promote: boolean) {
    this.player = player
    this.moveFrom = moveFrom
    this.moveTo = moveTo
    this.promote = promote
  }

  get drop(): boolean {
    return this.moveFrom instanceof PieceStandPiecePlace
  }
}

export class Record {
  readonly moves: Array<Move | DummyMove>

  constructor(moves: Array<Move | DummyMove> = [DummyMove.START]) {
    this.moves = moves
  }

  getBoard(index: number): Board {
    if (index < 0 || this.moves.length <= index) {
      throw new Error(`Index ${index} is out of range of the record`)
    }

    // TODO: Support other handicap games.
    const board = parseSfen('sfen lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1')

    for (let i = 0; i <= index; i++) {
      const move = this.moves[i]
      if (move === DummyMove.START) {
        // Do nothing.
        if (i !== 0) {
          throw new Error('DummyMove.START must be at the beggining of a record')
        }
      } else if (move === DummyMove.END) {
        // Do nothing.
        if (i !== this.moves.length - 1) {
          throw new Error('DummyMove.END must be at the end of a record')
        }
      } else if (move instanceof Move) {
        board.move(move.moveFrom, move.moveTo)
        if (move.promote) {
          const piece = board.getSquarePiece(move.moveTo)?.piece
          if (piece === undefined) {
            throw new Error('Piece to be moved not found')
          }
          board.setSquarePiece(move.moveTo,
                               new SquarePiece(promotedPiece(piece), move.player))
        }
      }
    }

    return board
  }

  getMoveNotation(index: number): string {
    if (index < 0 || this.moves.length <= index) {
      throw new Error(`Index ${index} is out of range of the record`)
    }

    const move = this.moves[index]

    if (move === DummyMove.START) {
      return '開始'
    } else if (move === DummyMove.END) {
      return '終了'
    } else if (move instanceof Move) {
      if (index <= 0) {
        throw new Error('Moves must be at index 1 or later')
      }

      const lastMove = 0 < index ? this.moves[index - 1] : undefined
      const same = lastMove !== undefined &&
        move instanceof Move &&
        lastMove instanceof Move &&
        move.moveTo.equal(lastMove.moveTo)
      const lastBoard = this.getBoard(index - 1)
      const piece = (() => {
        if (move.moveFrom instanceof SquarePlace) {
          return lastBoard.getSquarePiece(move.moveFrom)?.piece
        } else if (move.moveFrom instanceof PieceStandPiecePlace) {
          return move.moveFrom.piece
        } else {
          throw new Error('Unreachable')
        }
      })()

      if (piece === undefined) {
        throw new Error('Piece to be moved not found')
      }

      let notation = ''

      // Turn
      switch (move.player) {
        case Player.FIRST: notation += '▲'; break
        case Player.SECOND: notation += '△'; break
      }

      // Destination
      if (same) {
        notation += '同　'
      } else {
        notation += getFileNotation(move.moveTo.file)
        notation += getRankNotation(move.moveTo.rank)
      }

      // Piece
      notation += getPieceNotation(piece)

      // Decoration
      if (move.drop) {
        notation += '打'
      }
      if (move.promote) {
        notation += '成'
      }

      // Origin
      if (!move.drop) {
        if (!(move.moveFrom instanceof SquarePlace)) {
          throw new Error('Cannot move a piece from a piece stand')
        }
        notation += `(${move.moveFrom.file+1}${move.moveFrom.rank+1})`
      }

      return notation
    } else {
      throw new Error('Unreachable')
    }
  }
}

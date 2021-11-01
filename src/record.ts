import { SquarePlace, PieceStandPiecePlace, PieceStandPlace,
         Board } from './board'
import { parseSfen } from './sfen'

export const enum DummyMove {
  START,
  END
}

export class Move {
  readonly moveFrom: SquarePlace | PieceStandPiecePlace
  readonly moveTo: SquarePlace | PieceStandPlace

  constructor(moveFrom: SquarePlace | PieceStandPiecePlace,
              moveTo: SquarePlace | PieceStandPlace) {
    this.moveFrom = moveFrom
    this.moveTo = moveTo
  }
}

export class Record {
  readonly moves: Array<Move | DummyMove>

  constructor(moves: Array<Move | DummyMove> | undefined) {
    if (moves === undefined) {
      this.moves = [DummyMove.START]
    } else {
      this.moves = moves
    }
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
      }
    }

    return board
  }
}

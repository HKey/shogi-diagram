import { Rect, DiagramRect, BoardRect, PieceStandRect } from './rect'
import { Piece, Player, NUM_RANKS, NUM_FILES, getRankNotation, getFileNotation } from './shogi'
import { PIECE_STAND_PIECE_ORDER, SquarePlace, PieceStand, Board, SquarePiece, PieceStandPlace, PieceStandPiecePlace } from './board'
import { parseSfen } from './sfen'

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 810
const DEFAULT_FONT = ''

function getPieceNotation (piece: Piece) {
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

function pieceStandIcon(player: Player) {
  switch (player) {
    case Player.FIRST: return '☗'
    case Player.SECOND: return '☖'
  }
}

const pieceStandEmptyNotation = ['な', 'し']

function lineWidth(board: BoardRect) {
  return board.height / 0.8 / DEFAULT_HEIGHT
}

function rankHeight(board: BoardRect) {
  return board.squareHeight * 0.4
}

function fileHeight(board: BoardRect) {
  return rankHeight(board)
}

function saveDrawingState(context: CanvasRenderingContext2D,
                          fn: () => void) {
  context.save()
  fn()
  context.restore()
}

function fillBackground(context: CanvasRenderingContext2D) {
  saveDrawingState(context, () => {
    context.fillStyle = 'white'
    // TODO: get width and height as parameters
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  })
}

function drawBoardLine(context: CanvasRenderingContext2D, board: BoardRect) {
  const nlines = NUM_RANKS

  const innerlineWidth = lineWidth(board)
  const outerlineWidth = innerlineWidth * 3
  const circleRadius = outerlineWidth * 1.5

  // innerlines
  saveDrawingState(context, () => {
    context.lineWidth = innerlineWidth
    for (let i = 1; i < nlines; i++) {
      // top to bottom
      context.moveTo(board.left + i * (board.width / nlines), board.top)
      context.lineTo(board.left + i * (board.width / nlines), board.bottom)

      // left to right
      context.moveTo(board.left, board.top + i * (board.height / nlines))
      context.lineTo(board.right, board.top + i * (board.height / nlines))
    }
    context.stroke()
  })

  // outerlines
  saveDrawingState(context, () => {
    context.lineWidth = outerlineWidth
    context.strokeRect(board.left, board.top, board.width, board.height)
  })

  // circle
  saveDrawingState(context, () => {
    for (let x of [board.left + board.width / 3,
                   board.left + board.width / 3 * 2]) {
      for (let y of [board.top + board.height / 3,
                     board.top + board.height / 3 * 2]) {
        context.beginPath()
        context.arc(x, y, circleRadius, 0, 2 * Math.PI)
        context.fill()
      }
    }
  })
}

function drawRankName(context: CanvasRenderingContext2D, board: BoardRect) {
  const height = rankHeight(board)

  saveDrawingState(context, () => {
    context.font = height + `px '${DEFAULT_FONT}'`
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    for (let i = 0; i < NUM_RANKS; i++) {
      const x = board.right + board.squareHeight / 2
      const y = board.top + i * board.squareHeight + board.squareHeight / 2
      context.fillText(getRankNotation(i), x, y)
    }
    context.stroke()
  })
}

// TODO: Remove duplicates with drawRankName.
function drawFileName(context: CanvasRenderingContext2D, board: BoardRect) {
  const height = fileHeight(board)

  saveDrawingState(context, () => {
    context.font = height + `px '${DEFAULT_FONT}'`
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    for (let i = 0; i < NUM_FILES; i++) {
      const x = board.left + (NUM_FILES - i - 1) * board.squareHeight + board.squareHeight / 2
      const y = board.top - board.squareHeight / 2
      context.fillText(getFileNotation(i), x, y)
    }
    context.stroke()
  })
}

function drawPiece(context: CanvasRenderingContext2D,
                   file: number, rank: number,
                   piece: Piece, player: Player,
                   board: BoardRect) {

  let pieceNotation = getPieceNotation(piece)
  const square = board.squareRect(file, rank)

  saveDrawingState(context, () => {
    // TODO: Add font parameter
    const fontScale = 0.9
    context.font = square.height * fontScale + `px '${DEFAULT_FONT}'`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    let scalex = 1, scaley = 1

    // For second player, turn notation.
    scaley = scaley / pieceNotation.length
    if (player === Player.SECOND) {
      scalex = scalex * -1
      scaley = scaley * -1
      pieceNotation = pieceNotation.reverse()
    }
    context.scale(scalex, scaley)

    // drawing
    const squarex = square.center.x / scalex
    const charHeight = square.height / pieceNotation.length
    for (let i = 0; i < pieceNotation.length; i++) {
      const squarey =
        (square.top             // square top
          + charHeight * i      // character top
          + charHeight / 2)     // offset (textBaseline = 'middle')
        / scaley
      context.fillText(pieceNotation[i], squarex, squarey)
    }
    context.stroke()
  })
}

function drawPieceStand(context: CanvasRenderingContext2D,
                        player: Player, pieceStand: PieceStand,
                        pieceStandRect: PieceStandRect) {
  const squareHeight = pieceStandRect.height / NUM_RANKS

  saveDrawingState(context, () => {
    // TODO: Add font parameter
    // TODO: Use Rect's size instead of fontScale.
    const fontScale = 0.7
    const fontHeight = fontScale * squareHeight
    context.font = fontHeight + `px '${DEFAULT_FONT}'`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    let scalex = 1, scaley = 1

    // scaling
    if (player === Player.SECOND) {
      scalex = scalex * -1
      scaley = scaley * -1
    }
    context.scale(scalex, scaley)

    // drawing
    const x = pieceStandRect.center.x

    // player icon
    {
      const y = pieceStandRect.playerIcon.top + fontHeight / 2
      context.fillText(pieceStandIcon(player), x * scalex, y * scaley)
    }

    // pieces
    if (pieceStand.empty()) {
      for (let i = 0; i < pieceStandEmptyNotation.length; i++) {
        const pieceRect = pieceStandRect.pieces[i]
        const y = pieceRect.top + fontHeight / 2
        context.fillText(pieceStandEmptyNotation[i], x * scalex, y * scaley)
      }
    } else {
      let i = 0
      for (const p of PIECE_STAND_PIECE_ORDER) {
        if (pieceStand.has(p)) {
          // NOTE: This assumes that the character is only one character.
          const pieceRect = pieceStandRect.pieces[i]
          const y = pieceRect.top + fontHeight / 2
          const name = getPieceNotation(p)
          if (name.length > 1) {
            throw new Error('Multiple character name is not supported')
          }
          context.fillText(name[0], x * scalex, y * scaley)
          saveDrawingState(context, () => {
            context.font = fontHeight * 0.5 + `px '${DEFAULT_FONT}'`
            const nx = x + (player === Player.FIRST ? fontHeight : (-fontHeight))
            const ny = y
            context.fillText(pieceStand.num(p).toString(),
                             nx * scalex, ny * scaley)
          })
          i++
        }
      }
    }
    context.stroke()
  })
}

function fillRect(context: CanvasRenderingContext2D, rect: Rect) {
  context.fillRect(rect.left, rect.top, rect.width, rect.height)
}

type MouseOverPlace = SquarePlace | PieceStandPlace | PieceStandPiecePlace
type SelectedPlace = SquarePlace | PieceStandPiecePlace
type LastMovePlace = SquarePlace

function drawMouseOver(context: CanvasRenderingContext2D,
                       diagram: DiagramRect,
                       mouseOver: MouseOverPlace) {
  saveDrawingState(context, () => {
    context.fillStyle = '#AFDFE4'
    context.globalAlpha = 0.3
    fillRect(context, diagram.getRect(mouseOver))
  })
}

function drawSelected(context: CanvasRenderingContext2D,
                      diagram: DiagramRect,
                      selected: SelectedPlace) {
  saveDrawingState(context, () => {
    context.fillStyle = '#F15B5B'
    context.globalAlpha = 0.3
    fillRect(context, diagram.getRect(selected))
  })
}

function drawLastMove(context: CanvasRenderingContext2D,
                      board: BoardRect,
                      lastMove: LastMovePlace) {
  saveDrawingState(context, () => {
    context.fillStyle = '#FFFF00'
    fillRect(context, board.squareRect(lastMove.file, lastMove.rank))
  })
}

function drawBoard(context: CanvasRenderingContext2D,
                   board: Board,
                   mouseOver: MouseOverPlace | undefined,
                   selected: SelectedPlace | undefined,
                   lastMove: LastMovePlace | undefined) {
  const diagramRect = new DiagramRect(context.canvas.getBoundingClientRect().width)

  fillBackground(context)
  if (lastMove) {
    drawLastMove(context, diagramRect.board, lastMove)
  }
  if (mouseOver) {
    drawMouseOver(context, diagramRect, mouseOver)
  }
  if (selected) {
    drawSelected(context, diagramRect, selected)
  }
  drawBoardLine(context, diagramRect.board)
  drawRankName(context, diagramRect.board)
  drawFileName(context, diagramRect.board)

  for (let rank = 0; rank < NUM_RANKS; rank++) {
    for (let file = 0; file < NUM_FILES; file++) {
      const squarePiece = board.getSquarePiece(new SquarePlace(file, rank))
      if (squarePiece !== undefined) {
        drawPiece(context, file, rank,
                  squarePiece.piece, squarePiece.player,
                  diagramRect.board)
      }
    }
  }

  for (let player of [Player.FIRST, Player.SECOND]) {
    drawPieceStand(context,
                   player, board.getPieceStand(player),
                   diagramRect.pieceStand(player))
  }
}

function testBoard() {
  let board = new Board()

  // TEST:
  board.setSquarePiece(new SquarePlace(4, 0), new SquarePiece(Piece.KING, Player.SECOND))
  board.setSquarePiece(new SquarePlace(7, 1), new SquarePiece(Piece.ROOK, Player.SECOND))
  board.setSquarePiece(new SquarePlace(1, 1), new SquarePiece(Piece.BISHOP, Player.SECOND))
  board.setSquarePiece(new SquarePlace(3, 0), new SquarePiece(Piece.GOLD, Player.SECOND))
  board.setSquarePiece(new SquarePlace(5, 0), new SquarePiece(Piece.GOLD, Player.SECOND))
  board.setSquarePiece(new SquarePlace(2, 0), new SquarePiece(Piece.SILVER, Player.SECOND))
  board.setSquarePiece(new SquarePlace(6, 0), new SquarePiece(Piece.SILVER, Player.SECOND))
  board.setSquarePiece(new SquarePlace(1, 0), new SquarePiece(Piece.KNIGHT, Player.SECOND))
  board.setSquarePiece(new SquarePlace(7, 0), new SquarePiece(Piece.KNIGHT, Player.SECOND))
  board.setSquarePiece(new SquarePlace(0, 0), new SquarePiece(Piece.LANCE, Player.SECOND))
  board.setSquarePiece(new SquarePlace(8, 0), new SquarePiece(Piece.LANCE, Player.SECOND))
  board.setSquarePiece(new SquarePlace(0, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(1, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(2, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(3, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(4, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(5, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(6, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(7, 2), new SquarePiece(Piece.PAWN, Player.SECOND))
  board.setSquarePiece(new SquarePlace(8, 2), new SquarePiece(Piece.PAWN, Player.SECOND))

  board.setSquarePiece(new SquarePlace(4, 8), new SquarePiece(Piece.KING, Player.FIRST))
  board.setSquarePiece(new SquarePlace(1, 7), new SquarePiece(Piece.ROOK, Player.FIRST))
  board.setSquarePiece(new SquarePlace(7, 7), new SquarePiece(Piece.BISHOP, Player.FIRST))
  board.setSquarePiece(new SquarePlace(3, 8), new SquarePiece(Piece.GOLD, Player.FIRST))
  board.setSquarePiece(new SquarePlace(5, 8), new SquarePiece(Piece.GOLD, Player.FIRST))
  board.setSquarePiece(new SquarePlace(2, 8), new SquarePiece(Piece.SILVER, Player.FIRST))
  board.setSquarePiece(new SquarePlace(6, 8), new SquarePiece(Piece.SILVER, Player.FIRST))
  board.setSquarePiece(new SquarePlace(1, 8), new SquarePiece(Piece.KNIGHT, Player.FIRST))
  board.setSquarePiece(new SquarePlace(7, 8), new SquarePiece(Piece.KNIGHT, Player.FIRST))
  board.setSquarePiece(new SquarePlace(0, 8), new SquarePiece(Piece.LANCE, Player.FIRST))
  board.setSquarePiece(new SquarePlace(8, 8), new SquarePiece(Piece.LANCE, Player.FIRST))
  board.setSquarePiece(new SquarePlace(0, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(1, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(2, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(3, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(4, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(5, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(6, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(7, 6), new SquarePiece(Piece.PAWN, Player.FIRST))
  board.setSquarePiece(new SquarePlace(8, 6), new SquarePiece(Piece.PAWN, Player.FIRST))

  return board
}

// TEST:
export function drawTest() {
  const canvas = document.getElementById('target')
  const sfenTextArea = document.getElementById('sfen')
  const readSfenButton = document.getElementById('read-sfen')
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#target element is not a canvas')
  }
  if (!(sfenTextArea instanceof HTMLTextAreaElement)) {
    throw new Error('#sfen element is not a textarea')
  }
  if (!(readSfenButton instanceof HTMLElement)) {
    throw new Error('#read-sfen element is not an html element')
  }
  const board = testBoard()

  let controller = new TestController(canvas, sfenTextArea,
                                      readSfenButton, board)
  controller.drawBoard()
}

// TEST:
export class TestController {
  private readonly canvas: HTMLCanvasElement
  private readonly sfenTextArea: HTMLTextAreaElement
  private readonly readSfenButton: HTMLElement
  private board: Board
  private mouseOver: MouseOverPlace | undefined
  private selected: SelectedPlace | undefined
  private lastMove: LastMovePlace | undefined

  constructor(canvas: HTMLCanvasElement,
              sfenTextArea: HTMLTextAreaElement,
              readSfenButton: HTMLElement,
              board: Board) {
    this.canvas = canvas
    this.sfenTextArea = sfenTextArea
    this.readSfenButton = readSfenButton
    this.board = board
    this.mouseOver = undefined
    this.selected = undefined
    this.lastMove = undefined

    let self = this

    function onMouseMoveTest(event: MouseEvent) {
      const diagram = new DiagramRect(self.canvas.width)
      const x = event.offsetX
      const y = event.offsetY
      const hitSquare = diagram.board.hitSquare(x, y)
      const hitPieceStand = diagram.hitPieceStand(x, y)

      if (hitSquare !== undefined) {
        self.mouseOver = hitSquare
      } else if (hitPieceStand !== undefined) {
        const index = hitPieceStand.hitPieceIndex(x, y)
        if (index !== undefined
          && self.selected === undefined
          && self.board.getPieceStand(hitPieceStand.player).length > index
          && index < PIECE_STAND_PIECE_ORDER.length) {
          self.mouseOver = new PieceStandPiecePlace(hitPieceStand.player, index)
        } else {
          self.mouseOver = new PieceStandPlace(hitPieceStand.player)
        }
      } else {
        self.mouseOver = undefined
      }

      // TODO: Update only highlights are changed.
      self.drawBoard()
    }

    function onMouseClickTest(event: MouseEvent) {
      const diagram = new DiagramRect(self.canvas.width)
      const x = event.offsetX
      const y = event.offsetY
      const hitSquare = diagram.board.hitSquare(x, y)
      const hitPieceStand = diagram.hitPieceStand(x, y)
      const control = event.getModifierState('Control')
      const shift = event.getModifierState('Shift')

      if (control
        && hitSquare !== undefined
        && self.board.getSquarePiece(hitSquare)) {
        self.board.flipPlayer(hitSquare)
        self.selected = undefined
      } else if (shift
        && hitSquare !== undefined
        && self.board.getSquarePiece(hitSquare)) {
        self.board.flipPiece(hitSquare)
        self.selected = undefined
      } else if (self.selected !== undefined) {
        if (hitSquare !== undefined || hitPieceStand !== undefined) {
          let moveTo
          if (hitSquare !== undefined) {
            moveTo = hitSquare
          } else if (hitPieceStand !== undefined) {
            moveTo = new PieceStandPlace(hitPieceStand.player)
          }
          if (moveTo !== undefined && self.board.canMove(self.selected)) {
            self.board.move(self.selected, moveTo)
            if (moveTo instanceof SquarePlace) {
              self.lastMove = moveTo
            } else {
              self.lastMove = undefined
            }
          }
        }
        self.selected = undefined
      } else {
        if (hitSquare !== undefined && self.board.canMove(hitSquare)) {
          self.selected = hitSquare
        } else {
          for (let player of [Player.FIRST, Player.SECOND]) {
            const pieceStand = diagram.pieceStand(player)
            if (pieceStand.hit(x, y)) {
              const index = pieceStand.hitPieceIndex(x, y)
              if (index !== undefined
                && index < self.board.getPieceStand(player).length
                && index < PIECE_STAND_PIECE_ORDER.length) {
                self.selected = new PieceStandPiecePlace(player, index)
              }
              break
            }
          }
        }
      }

      // TODO: Update only highlights are changed.
      self.drawBoard()
    }

    function onClickToReadSfen(_: MouseEvent) {
      const text = self.sfenTextArea.value
      self.board = parseSfen(text)
      self.lastMove = undefined
      self.drawBoard()
    }

    canvas.addEventListener('mousemove', onMouseMoveTest)
    canvas.addEventListener('click', onMouseClickTest)
    readSfenButton.addEventListener('click', onClickToReadSfen)
  }

  drawBoard() {
    const context = this.canvas.getContext('2d')
    if (context === null) {
      throw new Error('Cannot get a CanvasRenderingContext2D')
    }
    drawBoard(context, this.board,
              this.mouseOver, this.selected, this.lastMove)
  }
}

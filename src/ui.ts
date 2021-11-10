import { Rect, DiagramRect, BoardRect, PieceStandRect, PieceStandIndexedPlace } from './rect'
import { Piece, Player, NUM_RANKS, NUM_FILES, getRankNotation, getFileNotation, getPieceNotation, flippedPlayer } from './shogi'
import { PIECE_STAND_PIECE_ORDER, SquarePlace, PieceStand, Board, PieceStandPlace, PieceStandPiecePlace } from './board'
import { parseSfen } from './sfen'
import { Move, DummyMove, DummyMoveKind, getBoardFromMoves, getMoveNotationFromMoves } from './record'
import { parseKif } from './kif'
import { DedupViewNode } from './node'

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 810
const DEFAULT_FONT = ''

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

type MouseOverPlace = SquarePlace | PieceStandPlace | PieceStandIndexedPlace
type SelectedPlace = SquarePlace | PieceStandIndexedPlace
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

// TEST:
export function drawTest() {
  const canvas = document.getElementById('target')
  const freeEditingCheckbox = document.getElementById('free-editing')
  const sfenTextArea = document.getElementById('sfen')
  const readSfenButton = document.getElementById('read-sfen')
  const recordList = document.getElementById('record')
  const kifTextArea = document.getElementById('kif')
  const readKifButton = document.getElementById('read-kif')
  const recordStartButton = document.getElementById('record-start')
  const recordEndButton = document.getElementById('record-end')
  const recordPrevButton = document.getElementById('record-prev')
  const recordNextButton = document.getElementById('record-next')

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#target element is not a canvas')
  }
  if (!(freeEditingCheckbox instanceof HTMLInputElement)) {
    throw new Error('#free-editing element is not an input')
  }
  if (!(sfenTextArea instanceof HTMLTextAreaElement)) {
    throw new Error('#sfen element is not a textarea')
  }
  if (!(readSfenButton instanceof HTMLButtonElement)) {
    throw new Error('#read-sfen element is not an html button element')
  }
  if (!(recordList instanceof HTMLSelectElement)) {
    throw new Error('#record element is not an html select element')
  }
  if (!(kifTextArea instanceof HTMLTextAreaElement)) {
    throw new Error('#kif element is not a textarea')
  }
  if (!(readKifButton instanceof HTMLButtonElement)) {
    throw new Error('#read-kif element is not an html button element')
  }
  if (!(recordStartButton instanceof HTMLButtonElement)) {
    throw new Error('#record-start element is not an html button element')
  }
  if (!(recordEndButton instanceof HTMLButtonElement)) {
    throw new Error('#record-end element is not an html button element')
  }
  if (!(recordPrevButton instanceof HTMLButtonElement)) {
    throw new Error('#record-prev element is not an html button element')
  }
  if (!(recordNextButton instanceof HTMLButtonElement)) {
    throw new Error('#record-next element is not an html button element')
  }

  let controller = new TestController(canvas,
                                      freeEditingCheckbox,
                                      sfenTextArea,
                                      readSfenButton,
                                      recordList,
                                      kifTextArea,
                                      readKifButton,
                                      recordStartButton,
                                      recordEndButton,
                                      recordPrevButton,
                                      recordNextButton)
}

class Record {
  private node: DedupViewNode<Move | DummyMove> | undefined

  constructor(moves: Array<Move | DummyMove> = [new DummyMove(DummyMoveKind.START)]) {
    if (moves.length === 0) {
      this.node = undefined
    } else {
      this.node = new DedupViewNode(moves[0])
      let parent = this.node
      for (const move of moves.slice(1)) {
        parent = parent.addChild(move)
      }
    }
  }

  private get viewNodes(): Array<DedupViewNode<Move | DummyMove>> {
    if (this.node === undefined) {
      return []
    } else {
      return this.node.view
    }
  }

  get viewMoves(): Array<Move | DummyMove> {
    return this.viewNodes.map((i) => { return i.value })
  }

  getBoard(index: number) {
    return getBoardFromMoves(this.viewMoves, index)
  }

  private addMove(index: number, move: Move, select: boolean = false) {
    if (index < 0 || this.viewNodes.length <= index) {
      throw new Error(`Index ${index} is out of range of the record`)
    }

    this.viewNodes[index].addChild(move)

    if (select) {
      this.viewNodes[index].selectChild(move)
    }
  }

  tryAddingLegalMove(index: number,
                     moveFrom: SquarePlace | PieceStandPiecePlace,
                     moveTo: SquarePlace): boolean {
    if (index < 0 || this.viewNodes.length <= index) {
      throw new Error(`Index ${index} is out of range of the record`)
    }

    const board = this.getBoard(index)
    const player = (() => {
      if (moveFrom instanceof SquarePlace) {
        return board.getSquarePiece(moveFrom)?.player
      } else if (moveFrom instanceof PieceStandPiecePlace) {
        return moveFrom.player
      } else {
        throw new Error('Unreachable')
      }
    })()
    const piece = (() => {
      if (moveFrom instanceof SquarePlace) {
        return board.getSquarePiece(moveFrom)?.piece
      } else if (moveFrom instanceof PieceStandPiecePlace) {
        return moveFrom.piece
      } else {
        throw new Error('Unreachable')
      }
    })()
    const lastMove = this.viewMoves[index]
    const lastPlayer = (() => {
      if (lastMove instanceof DummyMove) {
        switch (lastMove.kind) {
          case DummyMoveKind.START:
            // TODO: Support various handicap games.
            return Player.SECOND
          case DummyMoveKind.END:
            throw new Error(`Cannot add a move after the game end`)
        }
      } else if (lastMove instanceof Move) {
        return lastMove.player
      } else {
        throw new Error('Unreachable')
      }
    })()

    if (player === undefined || player === lastPlayer || piece === undefined) {
      return false
    }
    if (player !== flippedPlayer(lastPlayer)) {
      return false
    }
    if (!board.isLegalMove(moveFrom, moveTo)) {
      return false
    }


    // TODO: Do not ask if the move must promote.
    const promotion =
      board.isPromotableMove(moveFrom, moveTo) &&
      window.confirm(`${getPieceNotation(piece).join('')}を成りますか？`)

    this.addMove(index, new Move(player, moveFrom, moveTo, promotion), true)
    return true
  }
}

// TEST:
export class TestController {
  private readonly canvas: HTMLCanvasElement
  private readonly freeEditingCheckbox: HTMLInputElement
  private readonly sfenTextArea: HTMLTextAreaElement
  private readonly readSfenButton: HTMLButtonElement
  private readonly recordList: HTMLSelectElement
  private readonly kifTextArea: HTMLTextAreaElement
  private readonly readKifButton: HTMLButtonElement
  private readonly recordStartButton: HTMLButtonElement
  private readonly recordEndButton: HTMLButtonElement
  private readonly recordPrevButton: HTMLButtonElement
  private readonly recordNextButton: HTMLButtonElement
  private board: Board
  private record: Record
  private recordIndex: number
  private mouseOver: MouseOverPlace | undefined
  private selected: SelectedPlace | undefined
  private lastMove: LastMovePlace | undefined

  constructor(canvas: HTMLCanvasElement,
              freeEditingCheckbox: HTMLInputElement,
              sfenTextArea: HTMLTextAreaElement,
              readSfenButton: HTMLButtonElement,
              recordList: HTMLSelectElement,
              kifTextArea: HTMLTextAreaElement,
              readKifButton: HTMLButtonElement,
              recordStartButton: HTMLButtonElement,
              recordEndButton: HTMLButtonElement,
              recordPrevButton: HTMLButtonElement,
              recordNextButton: HTMLButtonElement) {
    this.canvas = canvas
    this.freeEditingCheckbox = freeEditingCheckbox
    this.sfenTextArea = sfenTextArea
    this.readSfenButton = readSfenButton
    this.recordList = recordList
    this.kifTextArea = kifTextArea
    this.readKifButton = readKifButton
    this.recordStartButton = recordStartButton
    this.recordEndButton = recordEndButton
    this.recordPrevButton = recordPrevButton
    this.recordNextButton = recordNextButton

    this.record = new Record()
    this.recordIndex = 0
    this.board = getBoardFromMoves(this.record.viewMoves, this.recordIndex)

    this.mouseOver = undefined
    this.selected = undefined
    this.lastMove = undefined

    const onMouseMoveCanvas = (event: MouseEvent) => {
      const diagram = new DiagramRect(this.canvas.width)
      const x = event.offsetX
      const y = event.offsetY
      const hitSquare = diagram.board.hitSquare(x, y)
      const hitPieceStand = diagram.hitPieceStand(x, y)

      if (hitSquare !== undefined) {
        this.mouseOver = hitSquare
      } else if (hitPieceStand !== undefined) {
        const index = hitPieceStand.hitPieceIndex(x, y)
        if (index !== undefined
          && this.selected === undefined
          && this.board.getPieceStand(hitPieceStand.player).length > index) {
          this.mouseOver = new PieceStandIndexedPlace(hitPieceStand.player, index)
        } else {
          this.mouseOver = new PieceStandPlace(hitPieceStand.player)
        }
      } else {
        this.mouseOver = undefined
      }

      // TODO: Update only highlights are changed.
      this.drawBoard()
    }

    // TODO: Rename.
    const onMouseClickTest = (event: MouseEvent) => {
      const diagram = new DiagramRect(this.canvas.width)
      const x = event.offsetX
      const y = event.offsetY
      const hitSquare = diagram.board.hitSquare(x, y)
      const hitPieceStandRect = diagram.hitPieceStand(x, y)
      const control = event.getModifierState('Control')
      const shift = event.getModifierState('Shift')
      const hitPieceStand = (() => {
        if (hitPieceStandRect !== undefined) {
          return new PieceStandPlace(hitPieceStandRect.player)
        } else {
          return undefined
        }
      })()
      const hitPieceStandIndex = (() => {
        for (const player of [Player.FIRST, Player.SECOND]) {
          const pieceStand = diagram.pieceStand(player)
          if (pieceStand.hit(x, y)) {
            const index = pieceStand.hitPieceIndex(x, y)
            if (index !== undefined
              && index < this.board.getPieceStand(player).length) {
              return new PieceStandIndexedPlace(player, index)
            }
          }
        }
        return undefined
      })()

      if (this.freeEditing) {
        this.editBoardFreely(hitSquare, hitPieceStand, hitPieceStandIndex,
                             control, shift)
      } else {
        this.editBoardLegally(hitSquare, hitPieceStandIndex)
      }

      // TODO: Update only highlights are changed.
      this.drawBoard()
    }

    const onClickToReadSfen = (_: MouseEvent) => {
      const text = this.sfenTextArea.value
      this.board = parseSfen(text)
      this.lastMove = undefined
      this.drawBoard()
    }

    const onChangeRecord = (_: Event) => {
      const value = this.recordList.value
      if (value !== '') {
        this.setRecordIndex(parseInt(value))
        this.drawBoard()
      }
    }

    const onClickToReadKif = (_: MouseEvent) => {
      const text = this.kifTextArea.value
      this.record = new Record(parseKif(text))
      this.updateRecordList()
      this.drawBoard()
    }

    const onClickRecordStart = (_: MouseEvent) => {
      this.setRecordIndex(0)
      this.drawBoard()
    }

    const onClickRecordEnd = (_: MouseEvent) => {
      this.setRecordIndex(this.record.viewMoves.length - 1)
      this.drawBoard()
    }

    const onClickRecordPrev = (_: MouseEvent) => {
      this.setRecordIndex(Math.max(this.recordIndex - 1, 0))
      this.drawBoard()
    }

    const onClickRecordNext = (_: MouseEvent) => {
      this.setRecordIndex(Math.min(this.recordIndex + 1,
                                   this.record.viewMoves.length - 1))
      this.drawBoard()
    }


    this.canvas.addEventListener('mousemove', onMouseMoveCanvas)
    this.canvas.addEventListener('click', onMouseClickTest)
    this.readSfenButton.addEventListener('click', onClickToReadSfen)
    this.recordList.addEventListener('change', onChangeRecord)
    this.readKifButton.addEventListener('click', onClickToReadKif)
    this.recordStartButton.addEventListener('click', onClickRecordStart)
    this.recordEndButton.addEventListener('click', onClickRecordEnd)
    this.recordPrevButton.addEventListener('click', onClickRecordPrev)
    this.recordNextButton.addEventListener('click', onClickRecordNext)

    this.updateRecordList()
    this.drawBoard()
  }

  private getPieceStandPieceByIndex(pieceStandIndex: PieceStandIndexedPlace): PieceStandPiecePlace {
    const piece = this.board.getPieceStand(pieceStandIndex.player)
      .pieceByIndex(pieceStandIndex.index)
    if (piece === undefined) {
      throw new Error('Invalid index of a PieceStand')
    }
    return new PieceStandPiecePlace(pieceStandIndex.player, piece)
  }

  // Select a place if it can be selected.
  private trySelectingPlace(place: SelectedPlace | undefined) {
    if (place instanceof SquarePlace && this.board.canMove(place)) {
      this.selected = place
    } else if (place instanceof PieceStandIndexedPlace
               // TODO: Make a method to check the index is valid.
      && 0 <= place.index
      && place.index < this.board.getPieceStand(place.player).length) {
      this.selected = place
    }
  }

  private editBoardFreely(hitSquare: SquarePlace | undefined,
                          hitPieceStand: PieceStandPlace | undefined,
                          hitPieceStandIndex: PieceStandIndexedPlace | undefined,
                          control: boolean,
                          shift: boolean) {
    if (control
      && hitSquare !== undefined
      && this.board.getSquarePiece(hitSquare) !== undefined) {
      this.board.flipPlayer(hitSquare)
      this.selected = undefined
    } else if (shift
      && hitSquare !== undefined
      && this.board.getSquarePiece(hitSquare) !== undefined) {
      this.board.flipPiece(hitSquare)
      this.selected = undefined
    } else if (this.selected !== undefined) {
      if (hitSquare !== undefined || hitPieceStand !== undefined) {
        const moveFrom = (() => {
          if (this.selected instanceof PieceStandIndexedPlace) {
            return this.getPieceStandPieceByIndex(this.selected)
          } else {
            return this.selected
          }
        })()
        const moveTo = hitSquare ?? hitPieceStand
        if (moveTo !== undefined && this.board.canMove(moveFrom)) {
          this.board.move(moveFrom, moveTo)
          // TODO: Set current board to the initial move of the record.
          if (moveTo instanceof SquarePlace) {
            this.lastMove = moveTo
          } else {
            this.lastMove = undefined
          }
        }
      }
      this.selected = undefined
    } else if (hitSquare !== undefined || hitPieceStandIndex !== undefined){
      this.trySelectingPlace(hitSquare ?? hitPieceStandIndex)
    }
  }

  private editBoardLegally(hitSquare: SquarePlace | undefined,
                           hitPieceStandIndex: PieceStandIndexedPlace | undefined) {
    if (this.selected) {
      // TODO: Remove duplicates with editBoardFreely.
      const moveFrom =  (() => {
        if (this.selected instanceof PieceStandIndexedPlace) {
          return this.getPieceStandPieceByIndex(this.selected)
        } else {
          return this.selected
        }
      })()
      const moveTo = hitSquare

      if (moveFrom !== undefined && moveTo !== undefined) {
        this.tryAddingLegalMove(moveFrom, moveTo)
        this.selected = undefined
      }
    } else if (hitSquare !== undefined || hitPieceStandIndex !== undefined){
      this.trySelectingPlace(hitSquare ?? hitPieceStandIndex)
    }
  }

  private get freeEditing() {
    return this.freeEditingCheckbox.checked
  }

  drawBoard() {
    const context = this.canvas.getContext('2d')
    if (context === null) {
      throw new Error('Cannot get a CanvasRenderingContext2D')
    }
    drawBoard(context, this.board,
              this.mouseOver, this.selected, this.lastMove)
  }

  // TODO: Receive index.
  updateRecordList() {
    while (this.recordList.firstChild) {
      this.recordList.removeChild(this.recordList.firstChild)
    }
    for (let i = 0; i < this.record.viewMoves.length; i++) {
      const option = new Option(`${i.toString()} ${getMoveNotationFromMoves(this.record.viewMoves, i)}`,
                                i.toString())
      this.recordList.appendChild(option)
    }
    this.setRecordIndex(0)
  }

  setRecordIndex(index: number) {
    if (index < 0 || this.record.viewMoves.length <= index) {
      throw new Error(`Index ${index} is out of range of the record`)
    }

    this.recordIndex = index
    this.board = getBoardFromMoves(this.record.viewMoves, index)
    const move = this.record.viewMoves[this.recordIndex]
    if (move instanceof Move) {
      this.lastMove = move.moveTo
    } else {
      this.lastMove = undefined
    }
    this.selected = undefined

    this.recordList.selectedIndex = index
  }

  // Try moving a piece as the next move of the current selected move.
  tryAddingLegalMove(moveFrom: SquarePlace | PieceStandPiecePlace,
                     moveTo: SquarePlace): boolean {
    if (this.record.tryAddingLegalMove(this.recordIndex, moveFrom, moveTo)) {
      const index = this.recordIndex
      this.updateRecordList()
      this.setRecordIndex(index + 1)
      return true
    }

    return false
  }
}

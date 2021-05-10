import { PIECE_STAND_PIECE_ORDER, SquarePlace, NUM_FILES, NUM_RANKS, Player, PieceStandPlace, PieceStandPiecePlace } from './board'

// TODO: move to constants.ts and remove duplicates
const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 810

export class Rect {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number

  constructor(left: number, top: number,
              right: number, bottom: number) {

    if (left > right) {
      throw new Error('Invalid left and right argument')
    }
    if (top > bottom) {
      throw new Error('Invalid top and bottom argument')
    }

    this.left = left
    this.top = top
    this.right = right
    this.bottom = bottom
  }

  get height() {
    return this.bottom - this.top
  }

  get width() {
    return this.right - this.left
  }

  get center() {
    return {
      x: (this.left + this.right) / 2,
      y: (this.top + this.bottom) / 2
    }
  }

  hit(x: number, y: number): boolean {
    return this.left < x
      && x < this.right
      && this.top < y
      && y < this.bottom
  }
}

export class BoardRect extends Rect {
  get squareHeight() {
    return this.height / NUM_RANKS
  }

  get squareWidth() {
    return this.width / NUM_FILES
  }

  hitSquare(x: number, y: number) {
    if (!this.hit(x, y)) {
      return undefined
    }

    const file = NUM_FILES - 1 - Math.floor((x - this.left) / this.width * NUM_FILES)
    const rank = Math.floor((y - this.top) / this.height * NUM_RANKS)

    return new SquarePlace(file, rank)
  }

  // TODO: Use squarePlace.
  squareRect(file: number, rank: number): Rect {
    if (file < 0 || file >= NUM_RANKS) {
      throw new Error(`Invalid file: ${file}`)
    }
    if (rank < 0 || rank >= NUM_RANKS) {
      throw new Error(`Invalid rank: ${rank}`)
    }

    const x = NUM_FILES - 1 - file
    const y = rank

    return new Rect(this.left + this.squareWidth * x,
                    this.top + this.squareHeight * y,
                    this.left + this.squareWidth * (x + 1),
                    this.top + this.squareHeight * (y + 1))
  }
}

export class PieceStandRect extends Rect {
  readonly player: Player
  readonly playerIcon: Rect
  readonly pieces: Array<Rect>

  constructor(left: number, top: number,
              right: number, bottom: number,
              player: Player) {
    super(left, top, right, bottom)
    this.player = player

    const fontScale = 0.7
    const fontHeight = this.height / NUM_RANKS * fontScale
    const cx = (right + left) / 2
    const cy = (bottom + top) / 2

    // TODO: Check player in turn function.
    function turn(rect: Rect) {
      return new Rect(rect.left,
                      cy - (rect.bottom - cy),
                      rect.right,
                      cy - (rect.top - cy))
    }

    // playerIcon
    {
      let playerIcon = new Rect(cx - fontHeight / 2,
                                top,
                                cx + fontHeight / 2,
                                top + fontHeight)
      if (player === Player.SECOND) {
        playerIcon = turn(playerIcon)
      }

      this.playerIcon = playerIcon
    }

    // pieces
    {
      const len = PIECE_STAND_PIECE_ORDER.length
      const yOffset = top + fontHeight * 1.5 // player icon and space

      let rects: Array<Rect> = new Array(len)

      for (let i = 0; i < len; i++) {
        rects[i] = new Rect(cx - fontHeight / 2,
                            yOffset + fontHeight * i,
                            cx + fontHeight / 2,
                            yOffset + fontHeight * (i + 1))
      }

      if (player === Player.SECOND) {
        // Turn rects.
        rects = rects.map(turn)
      }

      this.pieces = rects
    }
  }

  hitPieceIndex(x: number, y: number): number | undefined {
    for (let i = 0; i < this.pieces.length; i++) {
      if (this.pieces[i].hit(x, y)) {
        return i
      }
    }

    return undefined
  }
}

export class DiagramRect {
  readonly board: BoardRect
  private readonly firstPieceStand: PieceStandRect
  private readonly secondPieceStand: PieceStandRect

  constructor(imageWidth: number) {
    // TODO: Consider image height.
    const virtualImageHeight = DEFAULT_HEIGHT * (imageWidth / DEFAULT_WIDTH)
    const width = virtualImageHeight * 0.8
    const height = virtualImageHeight * 0.8

    this.board = new BoardRect((imageWidth / 2) - (width / 2),
                               (virtualImageHeight / 2) - (height / 2),
                               (imageWidth / 2) + (width / 2),
                               (virtualImageHeight / 2) + (height / 2))

    const pieceStandWidth = (imageWidth - this.board.right) * 0.8
    const fpscx = (imageWidth + this.board.right) / 2
    const spscx = (0 + this.board.left) / 2

    this.firstPieceStand = new PieceStandRect(fpscx - pieceStandWidth / 2,
                                              this.board.top,
                                              fpscx + pieceStandWidth / 2,
                                              this.board.bottom,
                                              Player.FIRST)
    this.secondPieceStand = new PieceStandRect(spscx - pieceStandWidth / 2,
                                               this.board.top,
                                               spscx + pieceStandWidth / 2,
                                               this.board.bottom,
                                               Player.SECOND)
  }

  pieceStand(player: Player) {
    switch (player) {
      case Player.FIRST: return this.firstPieceStand
      case Player.SECOND: return this.secondPieceStand
    }
  }

  hitPieceStand(x: number, y: number) {
    for (const pieceStand of [this.firstPieceStand, this.secondPieceStand]) {
      if (pieceStand.hit(x, y)) {
        return pieceStand
      }
    }
    return undefined
  }

  getRect(place: SquarePlace | PieceStandPlace | PieceStandPiecePlace) {
    if (place instanceof SquarePlace) {
      return this.board.squareRect(place.file, place.rank)
    } else if (place instanceof PieceStandPlace) {
      return this.pieceStand(place.player)
    } else if (place instanceof PieceStandPiecePlace) {
      return this.pieceStand(place.player).pieces[place.index]
    } else {
      throw new Error('Unreachable')
    }
  }
}

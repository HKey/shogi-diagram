import { Equal } from './equal'

export class DedupViewNode<T extends Equal> {
  private selected: number
  readonly children: Array<DedupViewNode<T>>
  readonly value: T

  constructor(value: T) {
    this.value = value
    this.selected = 0
    this.children = []
  }

  hasChildren(): boolean {
    return this.children.length > 0
  }

  get selectedChild(): DedupViewNode<T> | undefined {
    if (this.hasChildren()) {
      return this.children[this.selected]
    } else {
      return undefined
    }
  }

  // Add a child as a value.
  //
  // If the value is already added as a child, this returns the
  // existing child.
  addChild(value: T): DedupViewNode<T> {
    for (const c of this.children) {
      if (c.value.equal(value)) {
        return c
      }
    }
    const child = new DedupViewNode<T>(value)
    this.children.push(child)
    if (this.children.length === 1) {
      this.selected = 0
    }
    return child
  }

  selectChild(target: T) {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]
      if (target.equal(child.value)) {
        this.selected = i
        return
      }
    }
    throw new Error(`The target not found in the node`)
  }

  get view(): Array<DedupViewNode<T>> {
    let v: Array<DedupViewNode<T>> = [this]
    let c = this.selectedChild
    while (c !== undefined) {
      v.push(c)
      c = c.selectedChild
    }
    return v
  }
}

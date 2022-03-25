// interface Path<T = any, R = any> {
//   readonly root: R
//   readonly data: T
//   child<K extends keyof T>(key: K): Path<T[K], R>
// }

type TipOf<P extends Path> = 
  P extends Path<infer T, any>
    ? T
    :
    never

type RootOf<P extends Path> =
  P extends Path<any, infer R>
    ? R
    :
    never

abstract class Path<T = any, R = any> {
  static from<T>(data: T) { return new Point(data) }

  abstract readonly root: R
  abstract readonly data: T
  child<K extends keyof T>(key: K): Path<T[K], R> {
    return Child.of(this, key)
  }

  
}

class Point<T> extends Path<T, T> {
  constructor(public readonly data: T) { super() }
  get root() { return this.data }
}

class Child<P extends Path, K extends keyof TipOf<P>>
  extends Path<RootOf<P>, TipOf<P>[K]>
{
  static of<T, K extends keyof T>(parent: Path<T, any>, key: K): Path<T[K], RootOf<typeof parent>> {
    return new this(parent, key)
  }

  constructor(public readonly parent: P, public readonly key: K) {
    super()
  }

  get root() { return this.parent.root }
  get data() { return this.parent.data[this.key] }
}

const obj = { x: { y: 32 }}
console.log(
Path.from(obj).child('x').child('y').data
)
console.log(Path.from(obj).child('x').child('y').root)
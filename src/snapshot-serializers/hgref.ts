import {HgRef} from '../hgref'
import {LinkUrl} from '../link-url'

export const test = (val: any) =>
    val instanceof HgRef
    || val instanceof LinkUrl
export const print = (val: HgRef | LinkUrl) =>
    `${val.constructor.name} <${val.toString()}>`

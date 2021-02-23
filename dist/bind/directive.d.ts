export default directive;
import type { Specified, SpecifiedData, Specified_NameOf, Specified_SpecOf } from '.';
import type { DirectiveLocationEnum, EnumTypeDefinitionNode, EnumValueNode, FieldDefinitionNode, InputObjectTypeDefinitionNode, InputValueDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode, ScalarTypeDefinitionNode, SchemaDefinitionNode, UnionTypeDefinitionNode } from 'graphql';
import { Shape, Shape_DeTypeOf } from '../serde';
import { Must } from '../is';
export declare function directive<S extends string, N extends string, A extends Shape, On extends DirectiveLocationEnum>(spec: S, name: N, args: A, repeat: 'on' | 'repeatable on', ...locations: On[]): Directive<S, N, A, On>;
export interface Directive<S extends string, N extends string, A extends Shape, On extends DirectiveLocationEnum> extends Specified<S, N> {
    args: A;
    repeatable: boolean;
    locations: On[];
}
export declare type AnyDirective = Directive<any, any, any, any>;
export declare type Directive_DataOf<D extends AnyDirective> = D extends AnyDirective ? SpecifiedData<Specified_SpecOf<D>, Specified_NameOf<D>, Directive_NodeOf<D>, Must<Shape_DeTypeOf<Directive_ArgsOf<D>>>> : never;
export declare type Directive_ArgsOf<D extends AnyDirective> = D extends Directive<any, any, infer A, any> ? A : never;
export declare type Directive_NodeOf<D extends AnyDirective> = D extends Directive<any, any, any, infer On> ? NodeFor<On> : never;
export declare type NodeFor<L extends DirectiveLocationEnum> = L extends 'SCHEMA' ? SchemaDefinitionNode : L extends 'SCALAR' ? ScalarTypeDefinitionNode : L extends 'OBJECT' ? ObjectTypeDefinitionNode : L extends 'FIELD_DEFINITION' ? FieldDefinitionNode : L extends 'ARGUMENT_DEFINITION' ? InputValueDefinitionNode : L extends 'INTERFACE' ? InterfaceTypeDefinitionNode : L extends 'UNION' ? UnionTypeDefinitionNode : L extends 'ENUM' ? EnumTypeDefinitionNode : L extends 'ENUM_VALUE' ? EnumValueNode : L extends 'INPUT_OBJECT' ? InputObjectTypeDefinitionNode : L extends 'INPUT_FIELD_DEFINITION' ? InputValueDefinitionNode : never;
//# sourceMappingURL=directive.d.ts.map
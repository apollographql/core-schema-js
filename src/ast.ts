import GRef from './gref'

declare module "graphql" {
  interface SchemaDefinitionNode {
    gref?: GRef
  }
  
  interface ScalarTypeDefinitionNode {
    gref?: GRef
  }
  
  interface ObjectTypeDefinitionNode {
    gref?: GRef
  }
  
  interface InputValueDefinitionNode {
    gref?: GRef
  }
  
  interface InterfaceTypeDefinitionNode {
    gref?: GRef
  }
  
  interface UnionTypeDefinitionNode {
    gref?: GRef
  }
  
  interface EnumTypeDefinitionNode {
    gref?: GRef
  }
  
  interface EnumValueDefinitionNode {
    gref?: GRef
  }
  
  interface InputObjectTypeDefinitionNode {
    gref?: GRef
  }
  
  interface DirectiveDefinitionNode {
    gref?: GRef
  }
  
  interface SchemaExtensionNode {
    gref?: GRef
  }
  
  interface ScalarTypeExtensionNode {
    gref?: GRef
  }
  
  interface ObjectTypeExtensionNode {
    gref?: GRef
  }
  
  interface InterfaceTypeExtensionNode {
    gref?: GRef
  }
  
  interface UnionTypeExtensionNode {
    gref?: GRef
  }
  
  interface EnumTypeExtensionNode {
    gref?: GRef
  }
  
  interface InputObjectTypeExtensionNode {
    gref?: GRef
  }
  
  interface DirectiveNode {
    gref?: GRef
  }

  interface ConstDirectiveNode {
    gref?: GRef
  }

  interface NamedTypeNode {
    gref?: GRef
  }
}
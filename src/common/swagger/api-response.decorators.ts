import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaModel } from './common.models';

/** Documenta una respuesta que devuelve un arreglo del modelo indicado. */
export function ApiArrayResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(model) },
      },
    }),
  );
}

/** Documenta una respuesta paginada (`data` + `meta`). */
export function ApiPaginatedResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(PaginationMetaModel, model),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          meta: { $ref: getSchemaPath(PaginationMetaModel) },
        },
      },
    }),
  );
}

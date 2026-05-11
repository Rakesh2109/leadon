const { z } = require("zod");
const AppError = require("../utils/appError");

// Accepts either:
//   a full Zod schema (z.object with body/params/query keys) — legacy form
//   a plain object { body?, params?, query? } with individual Zod schemas — shorthand form
function validate(schemaOrParts) {
  let schema;
  if (schemaOrParts && typeof schemaOrParts.safeParse === "function") {
    schema = schemaOrParts;
  } else {
    const shape = {};
    if (schemaOrParts.body) shape.body = schemaOrParts.body;
    if (schemaOrParts.params) shape.params = schemaOrParts.params;
    if (schemaOrParts.query) shape.query = schemaOrParts.query;
    schema = z.object(shape).passthrough();
  }

  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      return next(new AppError("Validation failed", 400, result.error.flatten()));
    }

    req.validated = result.data;
    return next();
  };
}

module.exports = validate;

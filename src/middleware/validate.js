const { ApiError } = require("../utils/ApiError");

/**
 * Middleware factory that validates req.body, req.query, or req.params
 * against a Zod schema.
 *
 * Usage:
 *   router.post('/users', validate(createUserSchema), handler)
 *   router.get('/records', validate(listRecordsSchema, 'query'), handler)
 */
const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field:   issue.path.join(".") || "root",
      message: issue.message,
    }));
    return next(ApiError.badRequest("Validation failed", details));
  }

  // Replace source with the parsed (and coerced/transformed) data
  req[source] = result.data;
  next();
};

module.exports = { validate };

const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          issues: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };

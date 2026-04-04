/**
 * Standardized API response wrapper.
 * Ensures every response follows the same envelope format.
 *
 * Success:  { success: true,  data: {...},    message: "...", meta: {...} }
 * Error:    { success: false, error: "...",   details: [...] }
 */

const sendSuccess = (res, { statusCode = 200, message = "Success", data = null, meta = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

const sendCreated = (res, { message = "Created successfully", data = null } = {}) =>
  sendSuccess(res, { statusCode: 201, message, data });

const sendPaginated = (res, { data, total, page, limit, message = "Success" }) =>
  sendSuccess(res, {
    data,
    message,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });

module.exports = { sendSuccess, sendCreated, sendPaginated };

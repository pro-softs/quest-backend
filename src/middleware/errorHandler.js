export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'External service is currently unavailable'
    });
  }

  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};
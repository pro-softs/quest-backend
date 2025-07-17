import Joi from 'joi';

const episodeSchema = Joi.object({
  topic: Joi.string().min(5).max(200).required().messages({
    'string.empty': 'Topic is required',
    'string.min': 'Topic must be at least 5 characters long',
    'string.max': 'Topic must not exceed 200 characters'
  }),
  age_group: Joi.string().valid('8-12', '13-15', '16-18', '18+').required().messages({
    'any.only': 'Age group must be one of: 8-12, 13-15, 16-18, 18+',
    'any.required': 'Age group is required'
  }),
  genre: Joi.string().valid('anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'documentary').required().messages({
    'any.only': 'Genre must be one of: anime, realistic, cartoon, fantasy, sci-fi, documentary',
    'any.required': 'Genre is required'
  }),
  subject: Joi.string().valid('physics', 'chemistry', 'cartoon', 'mathematics', 'biology', 'history', 'geography', 'computer', 'astronomy').required().messages({
    'any.required': 'Subject is required'
  })
});

export const validateEpisodeRequest = (req, res, next) => {
  const { error } = episodeSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  
  next();
};
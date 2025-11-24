const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../utils/db');

// Criar uma nova review
router.post(
  '/',
  body('userId').isInt(),
  body('movieId').isInt(),
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('A avaliação deve ser entre 1 e 5'),
  body('reviewText')
    .isLength({ min: 1, max: 250 })
    .withMessage('O texto da review deve ter até 250 caracteres'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, movieId, rating, reviewText } = req.body;

    try {
      const reviewId = await db.createReview(userId, movieId, rating, reviewText);
      res.status(201).json({ id: reviewId, userId, movieId, rating, reviewText });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

// Buscar reviews de um filme específico pelo ID do filme (query param movieId)
router.get('/', async (req, res) => {
  const { movieId } = req.query;

  if (!movieId) {
    return res.status(400).json({ message: 'Parâmetro "movieId" obrigatório' });
  }

  try {
    const reviews = await db.getReviewsByMovie(movieId);
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

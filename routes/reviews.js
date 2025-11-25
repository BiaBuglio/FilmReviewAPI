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

// Buscar reviews pelo nome do filme
router.get('/', async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: 'Parâmetro "name" obrigatório' });
  }

  try {
    const movies = await db.searchMoviesByName(name);

    if (!movies || movies.length === 0) {
      return res.status(404).json({ message: 'Filme não encontrado' });
    }

    const movie = movies[0];

    const reviews = await db.getReviewsByMovie(movie.id);

    res.json({
      movie: {
        id: movie.id,
        name: movie.name,
        photo: movie.photo,
        totalReviews: reviews.length
      },
      reviews
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Excluir avaliação
router.delete('/:id', async (req, res) => {
  const reviewId = req.params.id;

  try {
    const changes = await db.deleteReview(reviewId);

    if (changes === 0) {
      return res.status(404).json({ message: 'Avaliação não encontrada' });
    }

    res.json({ message: 'Avaliação excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir avaliação:', err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
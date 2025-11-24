const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../utils/db');
const { body, validationResult } = require('express-validator');

// Configuração do multer para uploads de imagem
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: storage });

// Criar um novo filme com upload de imagem
router.post(
  '/',
  upload.single('photo'),
  body('name').notEmpty().withMessage('Nome do filme é obrigatório'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Deletar arquivo se houver erro para não deixar lixo
      if (req.file) {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const photo = req.file ? req.file.filename : null;

    try {
      const movieId = await db.createMovie(name, photo);
      res.status(201).json({ id: movieId, name, photo });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

// Buscar filmes e suas reviews por nome do filme (query param name)
router.get('/', async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: 'Parâmetro "name" obrigatório' });
  }

  try {
    const movies = await db.searchMoviesByName(name);
    res.json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;

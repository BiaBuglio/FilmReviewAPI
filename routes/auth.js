const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../utils/db');

// Secret para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = 'your_jwt_secret_key';

// Registro de usuário
router.post(
  '/register',
  body('username').isLength({ min: 3 }),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const userExists = await db.getUserByUsername(username);
      if (userExists) {
        return res.status(400).json({ message: 'Usuário já existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await db.createUser(username, hashedPassword);

      return res.status(201).json({ id: userId, username });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

// Login de usuário
router.post(
  '/login',
  body('username').exists(),
  body('password').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    try {
      const user = await db.getUserByUsername(username);
      if (!user) {
        return res.status(400).json({ message: 'Usuário ou senha inválidos' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Usuário ou senha inválidos' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: '24h',
      });

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

module.exports = router;
